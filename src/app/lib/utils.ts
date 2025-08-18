export function generateId(prefix: string): string {
    return prefix + '-' + Math.random().toString(36).slice(2, 10);
}

export function now(): number {
    return Date.now();
}
