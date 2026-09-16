import type { SSEEvent } from './types';

export function encodeSSE(event: SSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function createSSEStream(
  generator: AsyncGenerator<SSEEvent, void, void>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator) {
          const encoded = encodeSSE(event);
          controller.enqueue(encoder.encode(encoded));
        }
        controller.close();
      } catch (error) {
        const errorEvent: SSEEvent = {
          type: 'error',
          id: Date.now(),
          timestamp: new Date().toISOString(),
          payload: {
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
        controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
        controller.close();
      }
    },
  });
}
