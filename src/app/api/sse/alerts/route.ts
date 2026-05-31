import { alertEmitter, ALERT_EVENTS } from "@/lib/events";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`)
      );

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "heartbeat", timestamp: Date.now() })}\n\n`)
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      const handlers: Record<string, (data: unknown) => void> = {};

      Object.values(ALERT_EVENTS).forEach((eventName) => {
        const handler = (data: unknown) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: eventName, data, timestamp: Date.now() })}\n\n`)
            );
          } catch {

            cleanup();
          }
        };
        handlers[eventName] = handler;
        alertEmitter.on(eventName, handler);
      });

      const cleanup = () => {
        clearInterval(heartbeat);
        Object.entries(handlers).forEach(([event, handler]) => {
          alertEmitter.off(event, handler);
        });
      };

      const abortHandler = () => cleanup();
      if (typeof controller.close === "function") {

        const checkAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(":\n\n"));
          } catch {
            clearInterval(checkAlive);
            cleanup();
          }
        }, 30000);
      }

      return abortHandler;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export const dynamic = "force-dynamic";
