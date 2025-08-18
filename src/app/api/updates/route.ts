import { createSSEStream } from '@/app/lib/sse';

export const runtime = 'edge'; // improves SSE performance on Vercel/Edge

export async function GET() {
    const { stream } = createSSEStream();
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive'
        }
    });
}
