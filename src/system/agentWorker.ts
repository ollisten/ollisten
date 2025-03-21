import {listen} from "@tauri-apps/api/event";
import {Agent, AgentConfig, FileChangeEvent} from "./agentManager.ts";
import {getCurrentWindow} from "@tauri-apps/api/window";

type Listener = (agent: Agent) => void;
export type Unsubscribe = () => void;

export class AgentWorker {

    private static instance: AgentWorker | null = null
    private readonly listeners: Set<Listener> = new Set();
    private agentConfig: AgentConfig;
    private monitorUnlisten: (() => void) | null = null;

    static get = () => {
        if (!AgentWorker.instance) {
            AgentWorker.instance = new AgentWorker();
        }
        return AgentWorker.instance;
    }

    constructor() {
        const agentParam = new URLSearchParams(window.location.search)
            .get('agentConfig');
        if (!agentParam) {
            throw new Error('Expecting agent config to be passed in, but found none')
        }
        this.agentConfig = JSON.parse(decodeURIComponent(agentParam));
    }

    public getName(): string {
        return this.agentConfig.name;
    }

    public getAgent(): Agent {
        return this.agentConfig.agent;
    }

    public subscribe(listener: Listener): Unsubscribe {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        }
    }

    private onAgentChanged(agent: Agent) {
        this.agentConfig.agent = agent;
        this.listeners.forEach(listener => {
            try {
                listener(agent);
            } catch (err) {
                console.error('Error in agent changed handler', err);
            }
        });
    }

    public startMonitor() {
        if (this.monitorUnlisten) {
            return;
        }

        // Listen from Rust for config changes
        const unlistenPromise = listen<FileChangeEvent>('agent-config-changed', (event) => {

            if(event.payload.name !== this.agentConfig.name) {
                return; // Not for us
            }

            console.log('Received agent config change event:', event);
            switch (event.payload.eventType) {
                case 'Created':
                case 'Modified':
                    this.onAgentChanged(event.payload.agent);
                    break;
                case 'Deleted':
                    getCurrentWindow().destroy();
                    break;
            }
        }).catch((e) => {
            console.error('Failed to listen to agent config changes:', e);
        });

        this.monitorUnlisten = () => {
            unlistenPromise.then((unlisten) => unlisten?.());
        };
    }

    public stopMonitor() {
        this.monitorUnlisten?.();
        this.monitorUnlisten = null;
    }

}
