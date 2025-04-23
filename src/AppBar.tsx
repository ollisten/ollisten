import {ComponentProps, useEffect, useState} from "react";
import {DownloadProgressEvent, ErrorEvent, LoadingProgressEvent, StatusChangeEvent} from "./system/transcription.ts";
import {Alert, Collapse, IconButton, useColorScheme} from "@mui/material";
import {makeStyles} from "@mui/styles";
import {Events} from "./system/events.ts";
import {formatBytesToString} from "./util/unitConversion.ts";
import {Settings} from "@mui/icons-material";
import TranscriptionButton from "./TranscriptionButton.tsx";
import DebugButton from "./DebugButton.tsx";

const useStyles = makeStyles({
    root: {
        margin: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: 'left',
    },
    topBar: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
    },
    flexGrow: {
        flexGrow: 1,
    },
});

export default function AppBar(props: {
    popoverDirection: ComponentProps<typeof TranscriptionButton>['popoverDirection'];
    onSettingsClick: () => void;
    isEditing: boolean;
}) {
    const classes = useStyles();

    const [messageAlertContent, setMessageAlertContent] = useState<AlertContent | null>(null);
    const [messageAlertShow, setMessageAlertShow] = useState<boolean>(false);
    const {mode, systemMode} = useColorScheme();
    const isDark = (mode === 'system' ? systemMode : mode) === 'dark';

    useEffect(() => {
        return Events.get().subscribe([
            'status-change',
            'TranscriptionDownloadProgress',
            'TranscriptionLoadingProgress',
            'TranscriptionError',
        ], (
            event: StatusChangeEvent | DownloadProgressEvent | LoadingProgressEvent | ErrorEvent
        ) => {
            switch (event.type) {
                case 'status-change':
                    setMessageAlertShow(false);
                    break;
                case 'TranscriptionDownloadProgress':
                    setMessageAlertContent({
                        severity: 'info',
                        message: `Downloaded: ${formatBytesToString(event.progress)} / ${formatBytesToString(event.size)}`,
                    });
                    setMessageAlertShow(true);
                    break;
                case 'TranscriptionLoadingProgress':
                    setMessageAlertContent({
                        severity: 'info',
                        message: `Loaded: ${Math.round(event.progress * 100)}%`,
                    });
                    setMessageAlertShow(true);
                    break;
                case 'TranscriptionError':
                    setMessageAlertContent({
                        severity: 'error',
                        message: event.message,
                    });
                    setMessageAlertShow(true);
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }
        });
    }, []);

    return (
        <div className={classes.root}>
            <div className={classes.topBar}>
                <div>
                    <img src={`/ollisten-logo-circle-${isDark ? 'white' : 'black'}.png`} width={40} height={40} />
                </div>
                <div className={classes.flexGrow}/>
                <Collapse in={props.isEditing} orientation='horizontal'>
                    <DebugButton/>
                </Collapse>
                <TranscriptionButton popoverDirection={props.popoverDirection}/>
                <IconButton onClick={props.onSettingsClick}>
                    <Settings/>
                </IconButton>
            </div>
            <Collapse in={messageAlertShow}>
                <Alert severity={messageAlertContent?.severity || 'error'}
                       variant='outlined'>{messageAlertContent?.message}</Alert>
            </Collapse>
        </div>
    );
}

type AlertContent = {
    message: string,
    severity: 'success' | 'info' | 'warning' | 'error',
}
