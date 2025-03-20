import {invoke} from "@tauri-apps/api/core";
import {WebviewWindow} from "@tauri-apps/api/webviewWindow";

export interface Agent {
    name: string;
    prompt: string;
}

interface AgentConfig {
    agent: Agent;
    filePath: string;
}

export class AgentManager {

    private static instance: AgentManager | null = null
    private agentWindows: {
        [filePath: string]: WebviewWindow;
    } = {}

    static get = () => {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager();
        }
        return AgentManager.instance;
    }

    public async managerStart() {
        const agentConfigs = await invoke<AgentConfig[]>('get_all_agent_configs');

        agentConfigs.forEach(agentConfig => {
            if (this.agentWindows[agentConfig.filePath]) {
                return;
            }

            const webview = new WebviewWindow('uniqueWindowLabel', {
                url: 'agent.html',
                title: 'Agent',
                width: 800,
                height: 250,
                x: 100,
                y: 100,
                decorations: true,
                resizable: true,
            });
            webview.once('tauri://created', () => {
                console.log('Window successfully created');
                webview.emit('tauri://agent-config', agentConfig);
            });
            webview.once('tauri://error', (e) => {
                delete this.agentWindows[agentConfig.filePath];
                console.error('Error creating window:', e);
            });
            webview.once('tauri://closed', () => {
                delete this.agentWindows[agentConfig.filePath];
                console.log('Window closed');
            });
            this.agentWindows[agentConfig.filePath] = webview;
        })
    }

    public managerStop() {
        Object.values(this.agentWindows).forEach(webview => {
            webview.close();
        });
    }
}
