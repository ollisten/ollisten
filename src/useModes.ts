import {useCallback, useMemo} from "react";
import useAgents, {AgentsMap} from "./useAgents.ts";
import {useAppConfig} from "./util/useAppConfig.ts";

export type Mode = {
    label: string;
    agents: AgentsMap;
}
export type ModesMap = { [label: string]: Mode };
export type SetModeAgents = (modeLabel: string, agentNames: string[]) => void;

export default function useModes(): {
    modes: ModesMap;
    setModeAgents: SetModeAgents;
    agentNames: string[];
} {
    const agentByName = useAgents();
    const {appConfig, setAppConfig} = useAppConfig();

    const modes = useMemo((): ModesMap => Object
        .entries(appConfig.modes || {})
        .reduce<ModesMap>((acc, [modeLabel, mode]) => {
            // map values of mode.agents
            const agentMap: AgentsMap = mode.agents.reduce<AgentsMap>((acc, agentName) => {
                const agent = agentByName[agentName];
                if (!agent) {
                    return acc;
                }
                acc[agentName] = agent;
                return acc;
            }, {});
            acc[modeLabel] = {
                label: modeLabel,
                agents: agentMap,
            };
            return acc;
        }, {}), [appConfig.modes, agentByName]);

    const setModeAgents: SetModeAgents = useCallback((modeLabel, agentNames) => {
        setAppConfig(c => {
            if (!c.modes) {
                c.modes = {};
            }
            c.modes[modeLabel] = {
                ...c.modes[modeLabel],
                label: modeLabel,
                agents: agentNames,
            };
        });
    }, []);

    return {
        modes,
        setModeAgents,
        agentNames: Object.keys(agentByName),
    };
};
