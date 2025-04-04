import {makeStyles} from "@mui/styles";
import useModes from "./useModes.ts";
import {Transcription} from "./system/transcription.ts";
import {Button, ButtonGroup} from "@mui/material";

const useStyles = makeStyles({
    root: {
        maxWidth: 400,
        margin: 'auto', // Center
        display: 'flex', // Override inline-flex for centering above
    },
    createButton: {
        margin: '1rem',
    },
    button: {
        padding: '1.5rem 0',
    },
});

export default function Launcher() {
    const classes = useStyles();
    const {modes, startAll, startMode, stop, runningModeId} = useModes();
    const hasModes = !!Object.keys(modes).length;
    return (
        <ButtonGroup
            classes={{
                root: classes.root,
            }}
            orientation='vertical'
            variant='contained'
            color='inherit'
            fullWidth
        >
            {Object.entries(modes).map(([modeId, mode]) => (
                <LauncherMode
                    key={`mode-${mode.label}`}
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
            {!hasModes && (
                <LauncherMode
                    key='start-all'
                    label='Start all'
                    running={Transcription.get().isRunning()}
                    onClick={() => {
                        if (!Transcription.get().isRunning()) {
                            startAll();
                        } else {
                            stop();
                        }
                    }}
                />
            )}
        </ButtonGroup>
    );
}

function LauncherMode(props: {
    label: string;
    onClick: () => void;
    running: boolean;
}) {
    const classes = useStyles();
    return (
        <Button
            classes={{
                root: classes.button,
            }}
            color={props.running ? 'success' : 'inherit'}
            onClick={props.onClick}
            // Allow label to be lower case
            sx={{textTransform: 'none'}}
        >
            {props.label}
        </Button>
    );
}
