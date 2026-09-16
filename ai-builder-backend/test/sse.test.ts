import { describe, it, expect } from 'vitest';
import { encodeSSE, createSSEStream } from '../lib/sse';
import type { SSEEvent } from '../lib/types';

describe('SSE Utilities', () => {
  describe('encodeSSE', () => {
    it('should encode event with correct format', () => {
      const event: SSEEvent = {
        type: 'text_delta',
        id: 1234567890,
        timestamp: '2024-01-01T00:00:00.000Z',
        payload: { delta: 'Hello' },
      };

      const encoded = encodeSSE(event);
      
      expect(encoded).toContain('event: text_delta\n');
      expect(encoded).toContain('data: ');
      expect(encoded).toContain('"type":"text_delta"');
      expect(encoded).toContain('"id":1234567890');
      expect(encoded).toContain('"delta":"Hello"');
      expect(encoded.endsWith('\n\n')).toBe(true);
    });

    it('should handle events with complex payloads', () => {
      const event: SSEEvent = {
        type: 'file_complete',
        id: 123,
        timestamp: '2024-01-01T00:00:00.000Z',
        payload: {
          path: 'src/index.ts',
          size: 1024,
          nested: { key: 'value' },
        },
      };

      const encoded = encodeSSE(event);
      
      expect(encoded).toContain('event: file_complete\n');
      expect(encoded).toContain('"path":"src/index.ts"');
      expect(encoded).toContain('"size":1024');
      expect(encoded).toContain('"nested":{"key":"value"}');
    });

    it('should handle empty payload', () => {
      const event: SSEEvent = {
        type: 'start',
        id: 1,
        timestamp: '2024-01-01T00:00:00.000Z',
        payload: {},
      };

      const encoded = encodeSSE(event);
      
      expect(encoded).toContain('event: start\n');
      expect(encoded).toContain('data: ');
      expect(encoded).toContain('"payload":{}');
    });
  });

  describe('createSSEStream', () => {
    it('should stream events in order', async () => {
      async function* generator(): AsyncGenerator<SSEEvent, void, void> {
        yield {
          type: 'start',
          id: 1,
          timestamp: '2024-01-01T00:00:00.000Z',
          payload: {},
        };
        yield {
          type: 'text_delta',
          id: 2,
          timestamp: '2024-01-01T00:00:01.000Z',
          payload: { delta: 'test' },
        };
        yield {
          type: 'done',
          id: 3,
          timestamp: '2024-01-01T00:00:02.000Z',
          payload: {},
        };
      }

      const stream = createSSEStream(generator());
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      
      let fullOutput = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullOutput += decoder.decode(value, { stream: true });
      }

      expect(fullOutput).toContain('event: start\n');
      expect(fullOutput).toContain('event: text_delta\n');
      expect(fullOutput).toContain('event: done\n');
      expect(fullOutput).toContain('"delta":"test"');
    });

    it('should emit error event on generator error', async () => {
      async function* generator(): AsyncGenerator<SSEEvent, void, void> {
        yield {
          type: 'start',
          id: 1,
          timestamp: '2024-01-01T00:00:00.000Z',
          payload: {},
        };
        throw new Error('Test error');
      }

      const stream = createSSEStream(generator());
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      
      let fullOutput = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullOutput += decoder.decode(value, { stream: true });
      }

      expect(fullOutput).toContain('event: start\n');
      expect(fullOutput).toContain('event: error\n');
      expect(fullOutput).toContain('Test error');
    });

    it('should close stream after all events', async () => {
      async function* generator(): AsyncGenerator<SSEEvent, void, void> {
        yield {
          type: 'start',
          id: 1,
          timestamp: '2024-01-01T00:00:00.000Z',
          payload: {},
        };
      }

      const stream = createSSEStream(generator());
      const reader = stream.getReader();
      
      let eventCount = 0;
      while (true) {
        const { done } = await reader.read();
        if (done) break;
        eventCount++;
      }

      expect(eventCount).toBeGreaterThan(0);
    });
  });
});
