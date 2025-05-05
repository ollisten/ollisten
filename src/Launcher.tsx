import useModes from "./useModes.ts";
import {Chip, Grid2} from "@mui/material";
import Note from "./Note.tsx";

export default function Launcher() {
    const {
        modes,
        startMode,
        runningModeIds,
        agentNames,
        runningAgents,
        startAgent,
        stopAgent,
        stopMode
    } = useModes();
    return (
        <>
            {!!Object.keys(modes).length && (
                <LauncherGroup type='mode'>
                    {Object.entries(modes).map(([modeId, mode]) => (
                        <LauncherMode
                            key={`mode-${mode.label}`}
                            type='mode'
                            label={mode.label}
                            running={runningModeIds.has(modeId)}
                            disabled={!mode.agents.length}
                            onClick={() => {
                                if (!runningModeIds.has(modeId)) {
                                    startMode(modeId);
                                } else {
                                    stopMode(modeId);
                                }
                            }}
                        />
                    ))}
                </LauncherGroup>
            )}
            {!!agentNames.length && (
                <LauncherGroup type='agent'>
                    {agentNames.map(agentName =>
                        <LauncherMode
                            key={`agent-${agentName}`}
                            type='agent'
                            label={agentName}
                            running={runningAgents.has(agentName)}
                            onClick={() => {
                                if (!runningAgents.has(agentName)) {
                                    startAgent(agentName);
                                } else {
                                    stopAgent(agentName);
                                }
                            }}
                        />
                    )}
                </LauncherGroup>
            )}
        </>
    );
}

function LauncherGroup(props: {
    type: 'mode' | 'agent';
    children: React.ReactNode;
}) {
    return (
        <>
            <Note title={props.type === 'mode' ? 'Modes' : 'Agents'}/>
            <Grid2 sx={theme => ({
                margin: theme.spacing(3),
            })} container spacing={3} columns={{xs: 3, sm: 4, md: 5}}>
                {props.children}
            </Grid2>
        </>
    );
}

function LauncherMode(props: {
    type: 'mode' | 'agent';
    label: string;
    onClick: () => void;
    running: boolean;
    disabled?: boolean;
}) {
    return (
        <Grid2 sx={{
            display: "flex",
        }} size={1}>
            <Chip
                sx={{
                    flex: '1 1 auto',
                    padding: '2rem 1rem',
                }}
                color={props.running ? 'primary' : 'default'}
                onClick={props.onClick}
                label={props.label}
                disabled={props.disabled}
            />
        </Grid2>
    );
}
