import {invoke} from "@tauri-apps/api/core";
import {WebviewWindow} from "@tauri-apps/api/webviewWindow";
import {Llm} from "./llm.ts";
import {SubscriptionManager} from "./subscriptionManager.ts";

export interface Agent {
    intervalInSec: number;
    prompt: string;
}

export interface AgentConfig {
    name: string;
    agent: Agent;
}

export type FileChangeEvent = {
    name: string;
} & ({
    type: 'FileAgentCreated' | 'FileAgentModified';
    agent: Agent;
} | {
    type: 'FileAgentDeleted';
})

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

        this.monitorUnlisten = SubscriptionManager.get().subscribe([
            'FileAgentCreated', 'FileAgentDeleted',
        ], (event: FileChangeEvent) => {
            switch (event.type) {
                case 'FileAgentCreated':
                    this.startAgent(event);
                    break;
                case 'FileAgentDeleted':
                    const webview = this.agentWindows[event.name];
                    if (webview) {
                        webview.destroy();
                        delete this.agentWindows[event.name];
                    }
                    break;
            }
        });
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
            decorations: false,
            resizable: true,
            alwaysOnTop: true,
            transparent: true,
            visible: false,
        });
        webview.once('tauri://created', () => {
            console.log(`Window successfully created for agent ${agentConfig.name}`);
            invoke<void>('setup_agent_window', {
                windowLabel: webview.label,
            })
                .catch((err: Error) => console.log("Failed to setup agent window", err));
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

    public clientGetAgentConfig(): AgentConfig {
        const agentParam = new URLSearchParams(window.location.search)
            .get('agentConfig');
        if (!agentParam) {
            throw new Error('Expecting agent config to be passed in, but found none')
        }
        return JSON.parse(decodeURIComponent(agentParam));
    }
}
