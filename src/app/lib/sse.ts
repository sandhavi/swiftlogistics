import { bus } from './bus';
import { UpdateEvent } from './types';

export function createSSEStream() {
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array>;

    const stream = new ReadableStream<Uint8Array>({
        start(c) {
            controller = c;
            // initial comment
            controller.enqueue(encoder.encode(`: connected\n\n`));
        },
        cancel() {
            if (unsubscribe) unsubscribe();
        }
    });

    const write = (event: UpdateEvent) => {
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(payload));
    };

    const unsubscribe = bus.subscribe(write);

    return { stream, close: () => unsubscribe() };
}
