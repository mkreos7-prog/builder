import type { Intent, IntentAction } from './types';

// Simple greeting patterns (multilingual)
const GREETING_PATTERNS = [
  /^(hi|hello|hey|হ্যালো|नमस्ते|hola|bonjour|привет|你好|こんにちは|안녕하세요)[\s!.]*$/i,
  /^(good\s+(morning|afternoon|evening))[\s!.]*$/i,
];

// Question patterns
const QUESTION_PATTERNS = [
  /^(what|how|why|when|where|who|which)\s+/i,
  /^(can|could|would|should|do|does|is|are)\s+/i,
  /\?$/,
];

// Explanation patterns
const EXPLAIN_PATTERNS = [
  /^explain/i,
  /^describe/i,
  /^tell\s+me\s+about/i,
  /^show\s+me\s+how/i,
];

// Build/Create patterns
const CREATE_PATTERNS = [
  /^(build|create|make|generate|scaffold)\s+(me\s+)?(a|an)\s+/i,
  /^(build|create|make|generate)\s+/i,
  /^i\s+want\s+(to\s+)?(build|create|make)/i,
  /^let'?s\s+(build|create|make)/i,
];

// Modification patterns
const MODIFY_PATTERNS = [
  /^(change|update|modify|edit|alter)\s+/i,
  /^(add|remove|delete|insert)\s+/i,
  /^(fix|repair|correct)\s+/i,
  /^(refactor|reorganize|restructure)\s+/i,
];

function detectLanguage(message: string): string {
  // Simple language detection based on character ranges
  if (/[\u0980-\u09FF]/.test(message)) return 'bn'; // Bengali
  if (/[\u0900-\u097F]/.test(message)) return 'hi'; // Hindi
  if (/[\u4E00-\u9FFF]/.test(message)) return 'zh'; // Chinese
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(message)) return 'ja'; // Japanese
  if (/[\uAC00-\uD7AF]/.test(message)) return 'ko'; // Korean
  if (/[\u0400-\u04FF]/.test(message)) return 'ru'; // Russian
  return 'en';
}

function classifyByPatterns(message: string): {
  action: IntentAction;
  confidence: number;
  requiresProjectAction: boolean;
  requiresSandbox: boolean;
} | null {
  const trimmed = message.trim();

  // Check for greetings
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        action: 'GREETING',
        confidence: 1.0,
        requiresProjectAction: false,
        requiresSandbox: false,
      };
    }
  }

  // Check for explanations
  for (const pattern of EXPLAIN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        action: 'EXPLAIN',
        confidence: 0.9,
        requiresProjectAction: false,
        requiresSandbox: false,
      };
    }
  }

  // Check for questions
  for (const pattern of QUESTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        action: 'QUESTION',
        confidence: 0.9,
        requiresProjectAction: false,
        requiresSandbox: false,
      };
    }
  }

  // Check for create/build
  for (const pattern of CREATE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        action: 'CREATE_PROJECT',
        confidence: 0.85,
        requiresProjectAction: true,
        requiresSandbox: true,
      };
    }
  }

  // Check for modifications
  for (const pattern of MODIFY_PATTERNS) {
    if (pattern.test(trimmed)) {
      // Distinguish between different modification types
      if (/fix|repair|correct|bug|error/i.test(trimmed)) {
        return {
          action: 'FIX_BUG',
          confidence: 0.8,
          requiresProjectAction: true,
          requiresSandbox: false,
        };
      }
      if (/refactor|reorganize|restructure|clean/i.test(trimmed)) {
        return {
          action: 'REFACTOR',
          confidence: 0.8,
          requiresProjectAction: true,
          requiresSandbox: false,
        };
      }
      if (/add|insert|include|new/i.test(trimmed)) {
        return {
          action: 'ADD_FEATURE',
          confidence: 0.8,
          requiresProjectAction: true,
          requiresSandbox: false,
        };
      }
      return {
        action: 'MODIFY_PROJECT',
        confidence: 0.75,
        requiresProjectAction: true,
        requiresSandbox: false,
      };
    }
  }

  return null;
}

async function classifyWithLLM(message: string): Promise<{
  action: IntentAction;
  confidence: number;
  requiresProjectAction: boolean;
  requiresSandbox: boolean;
}> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  
  if (!geminiApiKey) {
    // Fallback to UNKNOWN if no API key
    return {
      action: 'UNKNOWN',
      confidence: 0.5,
      requiresProjectAction: false,
      requiresSandbox: false,
    };
  }

  try {
    const prompt = `Classify this user message into ONE of these categories:
GREETING, QUESTION, EXPLAIN, CREATE_PROJECT, MODIFY_PROJECT, ADD_FEATURE, FIX_BUG, REFACTOR, INSPECT, UNKNOWN

Rules:
- GREETING: Simple greetings
- QUESTION: Asking about concepts, how things work
- EXPLAIN: Requesting explanation of code/errors
- CREATE_PROJECT: Building something new from scratch
- MODIFY_PROJECT: Changing existing code
- ADD_FEATURE: Adding new functionality
- FIX_BUG: Fixing errors or bugs
- REFACTOR: Improving code structure
- INSPECT: Viewing/analyzing current state
- UNKNOWN: Unclear intent

Message: "${message}"

Respond ONLY with JSON: {"action": "...", "confidence": 0.0-1.0, "requiresProjectAction": boolean, "requiresSandbox": boolean}`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${geminiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gemini-2.0-flash-exp',
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 100,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('Empty response from Gemini');
    }

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      action: result.action || 'UNKNOWN',
      confidence: result.confidence || 0.5,
      requiresProjectAction: result.requiresProjectAction || false,
      requiresSandbox: result.requiresSandbox || false,
    };
  } catch (error) {
    console.error('LLM classification failed:', error);
    return {
      action: 'UNKNOWN',
      confidence: 0.3,
      requiresProjectAction: false,
      requiresSandbox: false,
    };
  }
}

export async function classifyIntent(message: string): Promise<Intent> {
  const language = detectLanguage(message);
  
  // Try pattern-based classification first
  const patternResult = classifyByPatterns(message);
  
  if (patternResult && patternResult.confidence > 0.8) {
    return {
      ...patternResult,
      language,
      targetDescription: message.substring(0, 100),
    };
  }

  // Fall back to LLM classification
  const llmResult = await classifyWithLLM(message);
  
  return {
    ...llmResult,
    language,
    targetDescription: message.substring(0, 100),
  };
}
