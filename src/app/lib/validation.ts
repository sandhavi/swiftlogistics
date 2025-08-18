import { z, ZodTypeAny, SafeParseReturnType } from 'zod';

export const PackageSchema = z.object({
    description: z.string().min(1).max(200),
    address: z.string().min(3).max(200)
});

export const OrderCreateSchema = z.object({
    clientId: z.string().min(3).max(100),
    driverId: z.string().min(1).max(50),
    packages: z.array(PackageSchema).min(1).max(50)
});

export type OrderCreateInput = z.infer<typeof OrderCreateSchema>;


export function validate<T>(schema: ZodTypeAny, data: unknown): T {
    const res: SafeParseReturnType<unknown, unknown> = schema.safeParse(data);
    if (!res.success) {
        const message = res.error.issues.map((i: { path: (string | number)[]; message: string }) => `${i.path.join('.')}: ${i.message}`).join('; ');
        throw new ValidationError(message);
    }
    return res.data as T;
}

export class ValidationError extends Error { }

// Idempotency (prototype): keep tokens in-memory to avoid duplicate order creation on retries.
const idempotencyCache = new Set<string>();
export function checkAndStoreIdempotency(token?: string) {
    if (!token) return; // optional
    if (idempotencyCache.has(token)) throw new ValidationError('Duplicate request (idempotency token)');
    idempotencyCache.add(token);
}
