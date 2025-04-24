import {makeStyles} from "@mui/styles";
import useModes from "./useModes.ts";
import {Chip, Grid2, Theme, Typography} from "@mui/material";
import Note from "./Note.tsx";

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        margin: theme.spacing(3),
    },
    groupLabel: {
        marginLeft: theme.spacing(5),
    },
    buttonContainer: {
        display: "flex",
    },
    button: {
        flex: '1 1 auto',
        padding: '2rem 1rem',
    },
}));

export default function Launcher() {
    const {modes, startMode, stop, runningModeId, agentNames, runningAgents, startAgent, stopAgent} = useModes();
    return (
        <>
            {!!Object.keys(modes).length && (
                <LauncherGroup type='mode'>
                    {Object.entries(modes).map(([modeId, mode]) => (
                        <LauncherMode
                            key={`mode-${mode.label}`}
                            type='mode'
                            label={mode.label}
                            running={modeId === runningModeId}
                            onClick={() => {
                                if (modeId !== runningModeId) {
                                    startMode(modeId);
                                } else {
                                    stop();
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
    const classes = useStyles();
    return (
        <>
            <Note title={props.type === 'mode' ? 'Modes' : 'Agents'} />
            <Grid2 className={classes.root} container spacing={3} columns={{xs: 3, sm: 4, md: 5}}>
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
}) {
    const classes = useStyles();
    return (
        <Grid2 className={classes.buttonContainer} size={1}>
            <Chip
                className={classes.button}
                color={props.running ? 'primary' : 'default'}
                onClick={props.onClick}
                label={props.label}
            />
        </Grid2>
    );
}
