import {emitTo, listen} from "@tauri-apps/api/event";
import {Channel} from "@tauri-apps/api/core";
import {SharedProps} from "notistack";


export type Event = {
    type: string;
};
export type Listener<E extends Event> = (event: E) => void;
export type Unsubscribe = () => void;

export type UserFacingMessageEvent = {
    type: 'user-facing-message';
    severity: SharedProps['variant'];
    message: string;
};

export class Events {

    private static instance: Events | null = null
    private readonly eventTypeToListeners: Map<string, Set<Listener<Event>>> = new Map();
    private readonly eventTypeToExternalListenerUnsubscribe: Map<string, Unsubscribe> = new Map();
    private readonly currentlyProcessingType: Set<string> = new Set();

    static get = () => {
        if (!Events.instance) {
            Events.instance = new Events();
        }
        return Events.instance;
    }


    public subscribe<E extends Event, T extends E['type']>(types: T | Array<T> | Set<T>, listener: Listener<E>): Unsubscribe {
        if (typeof types === 'string') {
            types = new Set([types]);
        } else if (types instanceof Array) {
            types = new Set(types);
        }

        const subscribePromises: Promise<void>[] = [];
        for (const type of types) {
            if (!this.eventTypeToListeners.has(type)) {
                this.eventTypeToListeners.set(type, new Set());
                subscribePromises.push(this.subscribeExternal(type));
            }
            this.eventTypeToListeners.get(type)!.add(listener);
        }
        return () => {
            Promise.all(subscribePromises).then(async () => {
                for (const type of types) {
                    let listeners = this.eventTypeToListeners.get(type);
                    if (listeners) {
                        listeners.delete(listener);
                        if (listeners.size === 0) {
                            this.eventTypeToListeners.delete(type);
                            await this.unsubscribeExternal(type);
                        }
                    }
                }
            })
        }
    }

    private async subscribeExternal(type: string) {
        if (this.eventTypeToExternalListenerUnsubscribe.has(type)) {
            return;
        }
        const unsubscribe = await listen<Event>(type, (event) => {
            this.sendInternal(event.payload);
        });
        this.eventTypeToExternalListenerUnsubscribe.set(type, unsubscribe);
    }

    private async unsubscribeExternal(type: string) {
        const unsubscribe = this.eventTypeToExternalListenerUnsubscribe.get(type);
        if (unsubscribe) {
            unsubscribe();
            this.eventTypeToExternalListenerUnsubscribe.delete(type);
        }
    }

    public sendInternal<E extends Event>(event: E) {
        if (this.currentlyProcessingType.has(event.type)) {
            console.error(`Event loop detected for event type: ${event.type}. Skipping to prevent infinite recursion.`);
            return;
        }
        this.currentlyProcessingType.add(event.type);
        const listeners = this.eventTypeToListeners.get(event.type);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(event);
                } catch (e) {
                    Events.get().showError(`Failed processing event ${event.type}: ${e}`);
                }
            });
        }
        this.currentlyProcessingType.delete(event.type);
    }

    public async sendExternal<E extends Event>(event: E) {
        await emitTo({kind: 'Any'}, event.type, event);
    }

    public async send<E extends Event>(event: E) {
        this.sendInternal(event);
        await this.sendExternal(event);
    }

    public createChannel<E extends Event>() {
        const channel = new Channel<E>();
        channel.onmessage = async event => {
            this.sendInternal(event);
        };
        return channel;
    }

    public showSuccess(message: string) {
        this.sendInternal<UserFacingMessageEvent>({
            type: 'user-facing-message',
            severity: 'success',
            message,
        })
    }

    public showMessage(message: string) {
        this.sendInternal<UserFacingMessageEvent>({
            type: 'user-facing-message',
            severity: 'info',
            message,
        })
    }

    public showError(message: string | Error | unknown) {
        this.sendInternal<UserFacingMessageEvent>({
            type: 'user-facing-message',
            severity: 'error',
            message: `${message}`,
        })
    }
}
