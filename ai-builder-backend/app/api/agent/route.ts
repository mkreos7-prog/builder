import { requireAuth, authErrorResponse } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { classifyIntent } from '@/lib/intent';
import { streamLLM } from '@/lib/llm';
import { createSSEStream } from '@/lib/sse';
import { createOrGetSandbox, writeFilesToSandbox } from '@/lib/sandbox';
import type { SSEEvent, GeneratedFile } from '@/lib/types';

interface RequestBody {
  message: string;
  projectId?: string;
  image?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function parseFilesFromResponse(text: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  
  // Match code blocks with filename attribute
  // Pattern: ```language filename=path/to/file.ext
  const codeBlockRegex = /```[\w]*\s+filename=([^\s\n]+)\n([\s\S]*?)```/g;
  
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const path = match[1].trim();
    const content = match[2].trim();
    
    if (path && content) {
      files.push({ path, content });
    }
  }
  
  return files;
}

export async function POST(req: Request) {
  try {
    // 1. Require authentication
    const user = await requireAuth(req);
    
    // 2. Rate limit check
    const rateLimit = checkRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return Response.json(
        { error: 'Rate limit exceeded', resetAt: rateLimit.resetAt },
        { status: 429 }
      );
    }
    
    // 3. Parse and validate body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
    if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
      return Response.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      );
    }
    
    // 4. Classify intent
    const intent = await classifyIntent(body.message);
    
    // 5. Create SSE stream generator
    const generator = async function* (): AsyncGenerator<SSEEvent, void, void> {
      let eventId = Date.now();
      
      // Emit start event
      yield {
        type: 'start',
        id: eventId++,
        timestamp: new Date().toISOString(),
        payload: {},
      };
      
      // Emit intent event
      yield {
        type: 'intent',
        id: eventId++,
        timestamp: new Date().toISOString(),
        payload: {
          action: intent.action,
          confidence: intent.confidence,
          requiresProjectAction: intent.requiresProjectAction,
          requiresSandbox: intent.requiresSandbox,
        },
      };
      
      // 6. Choose system prompt based on intent
      let systemPrompt: string;
      
      if (intent.action === 'GREETING' || intent.action === 'QUESTION' || intent.action === 'EXPLAIN') {
        // Conversational mode - NO file generation
        systemPrompt = `You are a helpful AI assistant for developers. Answer concisely in the user's language. Do NOT generate code unless explicitly asked. Be friendly and helpful.`;
        
        // Stream chat response only
        for await (const chunk of streamLLM({
          systemPrompt,
          userMessage: body.message,
          history: body.history,
          image: body.image,
        })) {
          yield {
            type: 'text_delta',
            id: eventId++,
            timestamp: new Date().toISOString(),
            payload: { delta: chunk },
          };
        }
      } else if (intent.requiresProjectAction) {
        // Project action mode - generate files
        systemPrompt = `You are an expert full-stack engineer. Generate complete, working files for the user's request.

Output each file using this EXACT format:
\`\`\`tsx filename=path/to/file.tsx
<file content here>
\`\`\`

Rules:
- Use the correct file extension (.tsx, .ts, .js, .jsx, .html, .css, etc.)
- Include package.json if creating a new project
- Generate complete, working code - no placeholders
- Follow modern best practices
- Make the code production-ready

Generate a complete, working project.`;
        
        let fullResponse = '';
        
        // Stream LLM response
        for await (const chunk of streamLLM({
          systemPrompt,
          userMessage: body.message,
          history: body.history,
          image: body.image,
        })) {
          fullResponse += chunk;
          
          yield {
            type: 'text_delta',
            id: eventId++,
            timestamp: new Date().toISOString(),
            payload: { delta: chunk },
          };
        }
        
        // Parse files from response
        const files = parseFilesFromResponse(fullResponse);
        
        if (files.length > 0) {
          // Emit file events
          for (const file of files) {
            yield {
              type: 'file_start',
              id: eventId++,
              timestamp: new Date().toISOString(),
              payload: { path: file.path },
            };
            
            // Split content into chunks for streaming effect
            const chunkSize = 100;
            for (let i = 0; i < file.content.length; i += chunkSize) {
              const chunk = file.content.substring(i, i + chunkSize);
              yield {
                type: 'file_delta',
                id: eventId++,
                timestamp: new Date().toISOString(),
                payload: { path: file.path, delta: chunk },
              };
            }
            
            yield {
              type: 'file_complete',
              id: eventId++,
              timestamp: new Date().toISOString(),
              payload: { path: file.path, size: file.content.length },
            };
          }
          
          // If projectId exists, create/update sandbox
          if (body.projectId) {
            try {
              const sandbox = await createOrGetSandbox(body.projectId);
              await writeFilesToSandbox(body.projectId, files);
              
              yield {
                type: 'sandbox_ready',
                id: eventId++,
                timestamp: new Date().toISOString(),
                payload: {
                  sandboxId: sandbox.sandboxId,
                  previewUrl: sandbox.previewUrl,
                },
              };
            } catch (error) {
              yield {
                type: 'error',
                id: eventId++,
                timestamp: new Date().toISOString(),
                payload: {
                  message: `Sandbox error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
              };
            }
          }
        }
      } else {
        // Unknown intent - treat as conversational
        systemPrompt = `You are a helpful AI assistant. Answer the user's question clearly and concisely.`;
        
        for await (const chunk of streamLLM({
          systemPrompt,
          userMessage: body.message,
          history: body.history,
          image: body.image,
        })) {
          yield {
            type: 'text_delta',
            id: eventId++,
            timestamp: new Date().toISOString(),
            payload: { delta: chunk },
          };
        }
      }
      
      // Emit done event
      yield {
        type: 'done',
        id: eventId++,
        timestamp: new Date().toISOString(),
        payload: {},
      };
    };
    
    // 7. Return SSE response
    const stream = createSSEStream(generator());
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Intent-Action': intent.action,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthError') {
      return authErrorResponse(error);
    }
    
    console.error('Agent route error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
