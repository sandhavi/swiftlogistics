import { UpdateEvent } from './types';

type Listener = (e: UpdateEvent) => void;

class EventBus {
    listeners: Set<Listener> = new Set();

    publish(event: UpdateEvent) {
        for (const l of this.listeners) {
            try { l(event); } catch { }
        }
    }

    subscribe(listener: Listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}

export const bus = new EventBus();
