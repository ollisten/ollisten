import {useForceRender} from "./util/useForceRender.ts";
import {useEffect, useRef} from "react";
import {Agent, AgentConfig, AgentManager, FileChangeEvent} from "./system/agentManager.ts";
import {Events} from "./system/events.ts";

export type AgentsMap = { [name: string]: Agent };

export default function useAgents(): AgentsMap {

    const forceRender = useForceRender();
    const agentsRef = useRef<AgentsMap>({});

    useEffect(() => {
        AgentManager.get().getAllAgentConfigs().then((agentConfigs: AgentConfig[]) => {
            agentConfigs.forEach(agentConfig => {
                agentsRef.current[agentConfig.name] = agentConfig.agent;
            })
            forceRender();
        });

        return Events.get().subscribe([
            'file-agent-created', 'file-agent-deleted', 'file-agent-modified'
        ], (
            event: FileChangeEvent
        ) => {
            switch (event.type) {
                case 'file-agent-created':
                case 'file-agent-modified':
                    agentsRef.current[event.name] = event.agent;
                    forceRender();
                    break;
                case 'file-agent-deleted':
                    delete agentsRef.current[event.name];
                    forceRender();
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }
        });
    }, []);

    return agentsRef.current;
};
