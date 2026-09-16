import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { classifyIntent } from '../lib/intent';

const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = vi.fn();
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('Intent Classifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pattern-based classification', () => {
    it('should classify simple greetings', async () => {
      const result = await classifyIntent('Hi');
      expect(result.action).toBe('GREETING');
      expect(result.requiresProjectAction).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should classify multilingual greetings', async () => {
      const results = await Promise.all([
        classifyIntent('Hello'),
        classifyIntent('হ্যালো'),
        classifyIntent('नमस्ते'),
      ]);
      
      results.forEach(result => {
        expect(result.action).toBe('GREETING');
        expect(result.requiresProjectAction).toBe(false);
      });
    });

    it('should classify questions', async () => {
      const result = await classifyIntent('What is React?');
      expect(result.action).toBe('QUESTION');
      expect(result.requiresProjectAction).toBe(false);
    });

    it('should classify build requests', async () => {
      const result = await classifyIntent('Build me a coffee shop website');
      expect(result.action).toBe('CREATE_PROJECT');
      expect(result.requiresProjectAction).toBe(true);
      expect(result.requiresSandbox).toBe(true);
    });

    it('should classify modification requests', async () => {
      const result = await classifyIntent('Change the header to blue');
      expect(result.action).toBe('MODIFY_PROJECT');
      expect(result.requiresProjectAction).toBe(true);
      expect(result.requiresSandbox).toBe(false);
    });

    it('should classify add feature requests', async () => {
      const result = await classifyIntent('Add a contact form');
      expect(result.action).toBe('ADD_FEATURE');
      expect(result.requiresProjectAction).toBe(true);
    });

    it('should classify bug fix requests', async () => {
      const result = await classifyIntent('Fix the login error');
      expect(result.action).toBe('FIX_BUG');
      expect(result.requiresProjectAction).toBe(true);
    });

    it('should classify refactor requests', async () => {
      const result = await classifyIntent('Refactor the authentication code');
      expect(result.action).toBe('REFACTOR');
      expect(result.requiresProjectAction).toBe(true);
      expect(result.requiresSandbox).toBe(false);
    });
  });

  describe('LLM fallback', () => {
    it('should fall back to LLM for ambiguous messages', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '{"action": "UNKNOWN", "confidence": 0.5, "requiresProjectAction": false, "requiresSandbox": false}'
            }
          }]
        })
      };
      
      (global.fetch as any).mockResolvedValueOnce(mockResponse);
      
      const result = await classifyIntent('The sky is blue');
      expect(result.action).toBe('UNKNOWN');
    });

    it('should handle LLM errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      const result = await classifyIntent('Some ambiguous message');
      expect(result.action).toBe('UNKNOWN');
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it('should handle missing API key', async () => {
      const oldKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      
      const result = await classifyIntent('Ambiguous request');
      expect(result.action).toBe('UNKNOWN');
      
      if (oldKey) process.env.GEMINI_API_KEY = oldKey;
    });
  });

  describe('Language detection', () => {
    it('should detect English', async () => {
      const result = await classifyIntent('Hello');
      expect(result.language).toBe('en');
    });

    it('should detect Bengali', async () => {
      const result = await classifyIntent('হ্যালো');
      expect(result.language).toBe('bn');
    });

    it('should detect Hindi', async () => {
      const result = await classifyIntent('नमस्ते');
      expect(result.language).toBe('hi');
    });
  });
});
