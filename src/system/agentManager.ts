import {invoke} from "@tauri-apps/api/core";
import {WebviewWindow} from "@tauri-apps/api/webviewWindow";
import {Events} from "./events.ts";
import {getAppConfig} from "../util/useAppConfig.ts";
import {currentMonitor, Window} from "@tauri-apps/api/window";
import {windowCloseSafely} from "../util/windowUtil.ts";

export interface Agent {
    intervalInSec?: number;
    transcriptionHistoryMaxChars: number | null;
    prompt: string;
    structuredOutput: null | {
        // JSON schema required for LLM output
        schema: string;
        // Mustache template to map LLM output JSON to user-facing output
        mapper: string;
    };
}

export interface AgentConfig {
    name: string;
    agent: Agent;
}

export type AgentWindowEvent = {
    type: 'agent-window-open' | 'agent-window-closed';
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
        [name: string]: Window;
    } = {}
    private monitorUnlisten: (() => void) | null = null;

    private constructor() {
        this.loadRunningAgents()
            .catch(e => Events.get().showError(`Failed to load running agents: ${e}`));
    }

    static get = () => {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager();
        }
        return AgentManager.instance;
    }

    private async loadRunningAgents() {
        let changed = false;
        (await Window.getAll())
            .forEach(window => {
                const agentName = this.windowNameToAgentName(window.label);
                if (!agentName) {
                    return;
                }
                this.agentWindows[agentName] = window;
                changed = true;
            });
        if (changed) {
            await Events.get().send({type: 'agent-window-open'} as AgentWindowEvent)
        }
    }

    public async getAllAgentConfigs(): Promise<AgentConfig[]> {
        return await invoke<AgentConfig[]>('get_all_agent_configs');
    }

    public getRunningAgentNames(): string[] {
        return Object.keys(this.agentWindows);
    }

    public async managerStart(agentNamesToStart?: string[]) {
        const agentConfigs = (await this.getAllAgentConfigs())
            .filter(agentConfig => !agentNamesToStart || agentNamesToStart.includes(agentConfig.name));
        console.log(`Got agent configs: ${JSON.stringify(agentConfigs)}`);

        agentConfigs.forEach(agentConfig => {
            this.startAgent(agentConfig);
        })

        if (!this.monitorUnlisten) {
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
                            webview.close();
                            delete this.agentWindows[event.name];
                        }
                        break;
                }
            });
        }
    }

    public agentNameToWindowName(name: string) {
        return `agent-${name}`;
    }

    public windowNameToAgentName(name: string) {
        return name.startsWith('agent-') ? name.substring(6) : null;
    }

    private async startAgent(agentConfig: AgentConfig) {
        if (this.agentWindows[agentConfig.name]) {
            return;
        }

        const windowLabel = this.agentNameToWindowName(agentConfig.name);
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
            visible: false,
            contentProtected: true,
        });
        this.agentWindows[agentConfig.name] = webview;
        webview.once('tauri://created', async () => {
            await webview.show();
            await Events.get().send({type: 'agent-window-open'} as AgentWindowEvent)
            console.log(`Window successfully created for agent ${agentConfig.name}`);
        });
        webview.onCloseRequested(async () => {
            delete this.agentWindows[agentConfig.name];
            await Events.get().send({type: 'agent-window-closed'} as AgentWindowEvent)
            console.log('Window closed');
        });
    }

    public async stopAgent(agentName: string) {
        const agentWindow = this.agentWindows[agentName]

        if (!agentWindow) {
            return;
        }

        try {
            await windowCloseSafely(agentWindow);
        } catch (e) {
            // Probably already closed
        }
        delete this.agentWindows[agentName];

        if (Object.keys(this.agentWindows).length > 0) {
            return;
        }

        this.monitorUnlisten?.();
        this.monitorUnlisten = null;
    }

    public async managerStop() {
        this.monitorUnlisten?.();
        this.monitorUnlisten = null;

        await Promise.all(Object.values(this.agentWindows).map(async agentWindow => {
            try {
                await windowCloseSafely(agentWindow);
            } catch (e) {
                // Probably already closed
            }
        }));
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
