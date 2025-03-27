import {invoke} from "@tauri-apps/api/core";
import {WebviewWindow} from "@tauri-apps/api/webviewWindow";
import {Events} from "./events.ts";
import {getAppConfig} from "../util/useAppConfig.ts";
import {currentMonitor} from "@tauri-apps/api/window";

export interface Agent {
    intervalInSec?: number;
    prompt: string;
}

export interface AgentConfig {
    name: string;
    agent: Agent;
}

export type FileChangeEvent = {
    name: string;
} & ({
    type: 'file-agent-created' | 'file-agent-modified';
    agent: Agent;
} | {
    type: 'file-agent-deleted';
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

    public async getAllAgentConfigs(): Promise<AgentConfig[]> {
        return await invoke<AgentConfig[]>('get_all_agent_configs');
    }

    public async managerStart() {
        const agentConfigs = await this.getAllAgentConfigs();
        console.log(`Got agent configs: ${JSON.stringify(agentConfigs)}`);

        agentConfigs.forEach(agentConfig => {
            this.startAgent(agentConfig);
        })

        this.monitorUnlisten = Events.get().subscribe([
            'file-agent-created', 'file-agent-deleted',
        ], (event: FileChangeEvent) => {
            switch (event.type) {
                case 'file-agent-created':
                    this.startAgent(event);
                    break;
                case 'file-agent-deleted':
                    const webview = this.agentWindows[event.name];
                    if (webview) {
                        webview.destroy();
                        delete this.agentWindows[event.name];
                    }
                    break;
            }
        });
    }

    private async startAgent(agentConfig: AgentConfig) {
        if (this.agentWindows[agentConfig.name]) {
            return;
        }

        const windowLabel = `agent-${agentConfig.name}`;
        const windowProps = getAppConfig().windowProps?.[windowLabel];
        const width = windowProps?.width || 800;
        const height = windowProps?.height || 250;
        let x = windowProps?.x || 100;
        let y = windowProps?.y || 100;

        // Constrain the window to the monitor
        x = Math.max(x, 0);
        y = Math.max(y, 0);
        const monitor = await currentMonitor();
        if (monitor) {
            const monitorSize = monitor.size.toLogical(monitor.scaleFactor);
            x = Math.min(x, monitorSize.width - width);
            y = Math.min(y, monitorSize.height - height);
        }

        const webview = new WebviewWindow(windowLabel, {
            url: `agent.html?agentConfig=${encodeURIComponent(JSON.stringify(agentConfig))}`,
            title: 'Agent',
            width,
            height,
            x,
            y,
            decorations: false,
            resizable: true,
            alwaysOnTop: true,
            transparent: true,
            visible: true,
            contentProtected: true,
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
        this.agentWindows = {};
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
