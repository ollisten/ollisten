import {invoke} from "@tauri-apps/api/core";
import {WebviewWindow} from "@tauri-apps/api/webviewWindow";
import {listen} from "@tauri-apps/api/event";
import {Llm} from "./llm.ts";

export interface Agent {
    prompt: string;
}

export interface AgentConfig {
    name: string;
    agent: Agent;
}

export type FileChangeEvent = {
    eventType: 'Created' | 'Modified';
    name: string;
    agent: Agent;
} | {
    eventType: 'Deleted';
    name: string;
}

export class AgentManager {

    private static instance: AgentManager | null = null
    private agentWindows: {
        [name: string]: WebviewWindow;
    } = {}
    private monitorUnlisten: (() => void) | null = null;

    static get = () => {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager();
        }
        return AgentManager.instance;
    }

    public async managerStart() {
        const agentConfigs = await invoke<AgentConfig[]>('get_all_agent_configs');
        console.log(`Got agent configs: ${JSON.stringify(agentConfigs)}`);

        agentConfigs.forEach(agentConfig => {
            this.startAgent(agentConfig);
        })

        const unlistenPromise = listen<FileChangeEvent>('agent-config-changed', (event) => {

            console.log('Received agent config change event:', event);
            switch (event.payload.eventType) {
                case 'Created':
                    this.startAgent(event.payload);
                    break;
                case 'Deleted':
                    const webview = this.agentWindows[event.payload.name];
                    if (webview) {
                        webview.destroy();
                        delete this.agentWindows[event.payload.name];
                    }
                    break;
            }
        }).catch((e) => {
            console.error('Failed to listen to agent config changes:', e);
        });

        this.monitorUnlisten = () => {
            unlistenPromise.then((unlisten) => unlisten?.());
        };
    }

    private startAgent(agentConfig: AgentConfig) {
        if (this.agentWindows[agentConfig.name]) {
            return;
        }

        const windowName = `agent-${agentConfig.name}`;
        const webview = new WebviewWindow(windowName, {
            url: `agent.html?llmModelName=${encodeURIComponent(Llm.get().getLlmModelName() || '')}&agentConfig=${encodeURIComponent(JSON.stringify(agentConfig))}`,
            title: 'Agent',
            width: 800,
            height: 250,
            x: 100,
            y: 100,
            decorations: true,
            resizable: true,
        });
        webview.once('tauri://created', () => {
            console.log(`Window successfully created for agent ${agentConfig.name}`);
        });
        webview.once('tauri://error', (e) => {
            delete this.agentWindows[agentConfig.name];
            console.error('Error creating window:', e);
        });
        webview.once('tauri://closed', () => {
            delete this.agentWindows[agentConfig.name];
            console.log('Window closed');
        });
        this.agentWindows[agentConfig.name] = webview;
    }

    public managerStop() {
        this.monitorUnlisten?.();
        this.monitorUnlisten = null;

        Object.values(this.agentWindows).forEach(webview => {
            webview.destroy();
        });
    }
}
