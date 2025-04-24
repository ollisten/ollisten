import {useCallback, useEffect, useState} from "react";
import useAgents, {AgentsMap} from "./useAgents.ts";
import {AppConfig, useAppConfig} from "./util/useAppConfig.ts";
import {randomTimeUuid} from "./util/idUtil.ts";
import {Transcription} from "./system/transcription.ts";
import {AgentManager, AgentWindowEvent} from "./system/agentManager.ts";
import {Events} from "./system/events.ts";
import {useForceRender} from "./util/useForceRender.ts";

export type CreateMode = () => void;
export type RenameMode = (modeId: string, newModeLabel: string) => void;
export type DeleteMode = (modeId: string) => void;
export type SetModeAgents = (modeId: string, agentNames: string[]) => void;

export default function useModes(): {
    runningAgents: Set<string>;
    runningModeId: string | null;
    startAll: () => void;
    startAgent: (agentName: string) => void;
    startMode: (modeId: string) => void;
    stop: () => void;
    stopAgent: (agentName: string) => void;
    modes: NonNullable<AppConfig['modes']>;
    getAgentByName: (name: string) => AgentsMap[string];
    createMode: CreateMode;
    renameMode: RenameMode;
    deleteMode: DeleteMode;
    setModeAgents: SetModeAgents;
    agentNames: string[];
} {
    const agentByName = useAgents();
    const {appConfig, setAppConfig} = useAppConfig();

    const forceRender = useForceRender();
    const runningAgents = new Set(AgentManager.get().getRunningAgentNames());
    const [runningModeId, setRunningModeId] = useState<string | null>(() => {
        // Infer which mode is running
        const runningAgentNames = new Set(AgentManager.get().getRunningAgentNames());
        if (!runningAgentNames.size) {
            return null;
        }
        for (const [modeId, {agents: modeAgentNames}] of Object.entries(appConfig.modes || {})) {
            if (!!modeAgentNames.length && modeAgentNames.length === runningAgentNames.size && modeAgentNames.every(name => runningAgentNames.has(name))) {
                return modeId;
            }
        }
        return null;
    });

    const createMode: CreateMode = useCallback(() => {
        setAppConfig(c => {
            if (!c.modes) {
                c.modes = {};
            }
            c.modes[randomTimeUuid()] = {
                label: '',
                agents: [],
            };
        });
    }, []);

    const renameMode: RenameMode = useCallback((modeId, newModeLabel) => {
        setAppConfig(c => {
            if (!c.modes?.[modeId]) {
                return;
            }
            c.modes[modeId].label = newModeLabel;
        });
    }, []);

    const deleteMode: DeleteMode = useCallback((modeId) => {
        setAppConfig(c => {
            if (!c.modes?.[modeId]) {
                return;
            }
            delete c.modes[modeId];
        });
    }, []);

    const setModeAgents: SetModeAgents = useCallback((modeId, agentNames) => {
        setAppConfig(c => {
            if (!c.modes?.[modeId]) {
                return;
            }
            c.modes[modeId].agents = agentNames;
        });
    }, []);

    const getAgentByName = useCallback((name: string) => {
        return agentByName[name];
    }, [agentByName]);

    const startAll = useCallback(() => {
        Transcription.get().startTranscription();
        AgentManager.get().managerStart();
    }, []);

    const startMode = useCallback((modeId: string) => {
        setRunningModeId(modeId);
        const agentNamesToStart = appConfig.modes?.[modeId]?.agents;
        if (!agentNamesToStart?.length) {
            return;
        }
        Transcription.get().startTranscription();
        AgentManager.get().managerStart(agentNamesToStart);
    }, []);

    const startAgent = useCallback((agentName: string) => {
        Transcription.get().startTranscription();
        AgentManager.get().managerStart([agentName]);
    }, []);

    const stop = useCallback(() => {
        setRunningModeId(null);
        Transcription.get().stopTranscription();
        AgentManager.get().managerStop();
    }, []);

    const stopAgent = useCallback((agentName: string) => {
        AgentManager.get().stopAgent(agentName);
    }, []);

    useEffect(() => {
        return Events.get().subscribe('agent-window-closed', (event: AgentWindowEvent) => {
            switch (event.type) {
                case 'agent-window-closed':
                    if (!AgentManager.get().getRunningAgentNames().length) {
                        // If user closes the last agent window,
                        // mark any mode as not running
                        setRunningModeId(null);
                    }
                    forceRender(); // refresh runningAgents
                    break;
            }
        });
    }, []);

    return {
        modes: appConfig.modes || {},
        runningModeId,
        runningAgents,
        startAgent,
        startAll,
        startMode,
        stop,
        stopAgent,
        createMode,
        renameMode,
        deleteMode,
        setModeAgents,
        getAgentByName,
        agentNames: Object.keys(agentByName),
    };
};
