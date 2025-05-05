import {useCallback, useEffect} from "react";
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
    runningModeIds: Set<string>;
    startAll: () => void;
    startAgent: (agentName: string) => void;
    startMode: (modeId: string) => void;
    stop: () => void;
    stopAgent: (agentName: string) => void;
    stopMode: (modeId: string) => void;
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
    const runningModeIds = getRunningModeIds(appConfig, runningAgents);

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

    const startAgents = useCallback((agentNames?: string[]) => {
        if (agentNames != undefined && !agentNames.length) {
            return;
        }
        Transcription.get().startTranscription()
            .catch(e => Events.get().showError(`Failed to start transcription: ${e}`));
        AgentManager.get().managerStart(agentNames)
            .then(() => forceRender())
            .catch(e => Events.get().showError(`Failed to start agents ${agentNames}: ${e}`));
    }, []);
    const startAll = useCallback(() => startAgents(), [startAgents]);
    const startMode = useCallback((modeId: string) => startAgents(appConfig.modes?.[modeId].agents || []), [appConfig, startAgents]);
    const startAgent = useCallback((agentName: string) => startAgents([agentName]), [startAgents]);

    const stopAgents = useCallback((agentNames?: string[]) => {
        if (agentNames !== undefined && !agentNames.length) {
            return;
        }
        if (agentNames === undefined || [...runningAgents].every(value => agentNames.includes(value))) {
            // All agents are being shutdown
            Transcription.get().stopTranscription()
                .catch(e => Events.get().showError(`Failed to stop transcription: ${e}`));
            AgentManager.get().managerStop()
                .then(() => forceRender())
                .catch(e => Events.get().showError(`Failed to stop all agents: ${e}`));
        } else {
            // Subset of agents are being shutdown
            agentNames.forEach(agentName => AgentManager.get().stopAgent(agentName)
                .then(() => forceRender())
                .catch(e => Events.get().showError(`Failed to stop agent ${agentName}: ${e}`)));
        }
    }, [runningAgents]);
    const stop = useCallback(() => stopAgents(), [stopAgents]);
    const stopMode = useCallback((modeId: string) => stopAgents(appConfig.modes?.[modeId].agents || []), [appConfig, stopAgents]);
    const stopAgent = useCallback((agentName: string) => stopAgents([agentName]), [stopAgents]);

    useEffect(() => {
        return Events.get().subscribe([
            'agent-window-open',
            'agent-window-closed',
        ], (
            event: AgentWindowEvent
        ) => {
            switch (event.type) {
                case 'agent-window-open':
                case 'agent-window-closed':
                    forceRender(); // refresh running agents and mode
                    break;
            }
        });
    }, []);

    return {
        modes: appConfig.modes || {},
        runningModeIds,
        runningAgents,
        startAgent,
        startAll,
        startMode,
        stop,
        stopAgent,
        stopMode,
        createMode,
        renameMode,
        deleteMode,
        setModeAgents,
        getAgentByName,
        agentNames: Object.keys(agentByName),
    };
};

const getRunningModeIds = (appConfig: AppConfig, runningAgentNames: Set<string>) => {
    return new Set(Object.entries(appConfig.modes || {})
        .filter(([_, mode]) => {
            const modeAgentNames = mode.agents;
            return !!modeAgentNames.length
                && modeAgentNames.length === runningAgentNames.size
                && modeAgentNames.every(name => runningAgentNames.has(name));
        })
        .map(([modeId, _]) => modeId));
}
