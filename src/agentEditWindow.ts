import {Agent, AgentConfig} from "./system/agentManager.ts";
import {WebviewWindow} from "@tauri-apps/api/webviewWindow";
import {randomUuid} from "./util/idUtil.ts";
import {Events} from "./system/events.ts";

export const openAgentEdit = (name: string, agent: Agent) => {
    const windowLabel = `agentEdit-${randomUuid()}`;
    const agentConfig: AgentConfig = {name, agent};
    const webview = new WebviewWindow(windowLabel, {
        url: `agent-edit.html?agentConfig=${encodeURIComponent(JSON.stringify(agentConfig))}`,
        title: 'Agent',
        center: true,
        width: 1440,
        height: 910,
        resizable: true,
        visible: false,
        contentProtected: true,
    });
    webview.once('tauri://created', () => {
        console.log(`Window successfully created for agent edit ${agentConfig.name}`);
    });
    webview.once('tauri://error', (e) => {
        Events.get().showError(`Failed to create new window: ${e}`);
    });
    webview.once('tauri://closed', () => {
        console.log('Window closed');
    });
}

export const cloneAgent = (name: string, agent: Agent) => {
    openAgentEdit(`${name}_Copy`, JSON.parse(JSON.stringify(agent)))
};

export const createAgent = () => {
    openAgentEdit('', {
        prompt: '',
        intervalInSec: 3,
        transcriptionHistoryMaxChars: null,
        structuredOutput: null,
    })
};
