import {Agent, AgentConfig} from "./system/agentManager.ts";
import {WebviewWindow} from "@tauri-apps/api/webviewWindow";
import {randomUuid} from "./util/idUtil.ts";

export const openAgentEdit = (name: string, agent: Agent) => {
    const windowLabel = `agentEdit-${randomUuid()}`;
    const agentConfig: AgentConfig = {name, agent};
    const webview = new WebviewWindow(windowLabel, {
        url: `agent-edit.html?agentConfig=${encodeURIComponent(JSON.stringify(agentConfig))}`,
        title: 'Agent',
        center: true,
        width: 1440,
        height: 900,
        resizable: true,
        visible: true,
        contentProtected: true,
    });
    webview.once('tauri://created', () => {
        console.log(`Window successfully created for agent edit ${agentConfig.name}`);
    });
    webview.once('tauri://error', (e) => {
        console.error('Error creating window:', e);
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
