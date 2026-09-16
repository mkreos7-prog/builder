interface LLMParams {
  systemPrompt: string;
  userMessage: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  image?: string; // base64 data URL
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

const GEMINI_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
];

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
];

async function* streamGemini(
  messages: Message[],
  modelIndex: number = 0
): AsyncGenerator<string, void, void> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  if (modelIndex >= GEMINI_MODELS.length) {
    throw new Error('All Gemini models exhausted');
  }

  const model = GEMINI_MODELS[modelIndex];

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${geminiApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 8000,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429 || response.status === 503) {
        // Rate limited or service unavailable - try next model
        yield* streamGemini(messages, modelIndex + 1);
        return;
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6).trim();
          
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            const finishReason = parsed.choices?.[0]?.finish_reason;

            if (delta) {
              fullContent += delta;
              yield delta;
            }

            // Handle continuation if response was cut off
            if (finishReason === 'length') {
              console.log('Response truncated, continuing...');
              const continuationMessages: Message[] = [
                ...messages,
                { role: 'assistant', content: fullContent },
                { role: 'user', content: 'Continue exactly where you left off. Do not repeat content.' },
              ];
              yield* streamGemini(continuationMessages, 0);
              return;
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    }
  } catch (error) {
    if (modelIndex < GEMINI_MODELS.length - 1) {
      // Try next Gemini model
      yield* streamGemini(messages, modelIndex + 1);
    } else {
      // All Gemini models failed, try Groq
      yield* streamGroq(messages);
    }
  }
}

async function* streamGroq(messages: Message[]): AsyncGenerator<string, void, void> {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const model = GROQ_MODELS[0];

  // Groq doesn't support images in the same way, convert image messages to text
  const groqMessages = messages.map(msg => ({
    role: msg.role,
    content: typeof msg.content === 'string' 
      ? msg.content 
      : msg.content
          .map(part => part.type === 'text' ? part.text : '[Image]')
          .join(' '),
  }));

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: groqMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 8000,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6).trim();
        
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;

          if (delta) {
            yield delta;
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }
  }
}

export async function* streamLLM(params: LLMParams): AsyncGenerator<string, void, void> {
  const messages: Message[] = [
    { role: 'system', content: params.systemPrompt },
  ];

  // Add history if provided
  if (params.history) {
    for (const msg of params.history) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Add current user message
  if (params.image) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: params.userMessage },
        { type: 'image_url', image_url: { url: params.image } },
      ],
    });
  } else {
    messages.push({
      role: 'user',
      content: params.userMessage,
    });
  }

  yield* streamGemini(messages, 0);
}
