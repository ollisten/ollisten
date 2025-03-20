import {listen, UnlistenFn} from "@tauri-apps/api/event";
import {Agent} from "./agentManager.ts";

type FileChangeEvent = {
    eventType: 'created' | 'modified';
    filePath: string;
    agent: Agent;
} | {
    eventType: 'deleted';
    filePath: string;
}

export class AgentWorker {

    private static instance: AgentWorker | null = null

    static get = () => {
        if (!AgentWorker.instance) {
            AgentWorker.instance = new AgentWorker();
        }
        return AgentWorker.instance;
    }

    public monitorConfig(listener: (agent: Agent | null) => void): UnlistenFn {
        // Listen from parent window on agent-config
        const parentWindowListener = (event: MessageEvent) => {
            if (event.origin === window.location.origin && event.data.type === 'agent-config') {
                listener(event.data.agent);
            }
        };
        window.addEventListener('message', parentWindowListener);

        // Listen from Rust for config changes
        const unlistenPromise = listen<FileChangeEvent>('agent-config-changed', (event) => {
            switch (event.payload.eventType) {
                case 'created':
                case 'modified':
                    listener(event.payload.agent);
                    break;
                case 'deleted':
                    listener(null);
                    break;
            }
        }).catch((e) => {
            console.error('Failed to listen to agent config changes:', e);
        });

        return () => {
            window.removeEventListener('message', parentWindowListener);
            unlistenPromise.then((unlisten) => unlisten?.());
        };
    }
}
