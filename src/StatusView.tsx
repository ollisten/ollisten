import {useEffect, useState} from "react";
import {
    DownloadProgressEvent,
    ErrorEvent,
    LoadingProgressEvent,
    Status,
    StatusChangeEvent,
    Transcription
} from "./system/transcription.ts";
import {Alert, Chip, Collapse} from "@mui/material";
import {makeStyles} from "@mui/styles";
import {Events} from "./system/events.ts";
import {formatBytesToString} from "./util/unitConversion.ts";

const useStyles = makeStyles({
    root: {
        margin: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: 'left',
    },
});

export default function StatusView() {
    const classes = useStyles();

    const [statusAlertContent, setStatusAlertContent] = useState<AlertContent>(() => mapStatusToDisplay(Transcription.get().getStatus()));
    const [messageAlertContent, setMessageAlertContent] = useState<AlertContent | null>(null);
    const [messageAlertShow, setMessageAlertShow] = useState<boolean>(false);

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
                    setStatusAlertContent(mapStatusToDisplay(event.status));
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
            <Chip color={statusAlertContent.severity} variant='outlined' label={statusAlertContent.message}/>
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

const mapStatusToDisplay = (status: Status): AlertContent => {
    let alertContent: AlertContent = {
        message: 'Unknown',
        severity: 'info',
    }
    switch (status) {
        case Status.Starting:
            alertContent.message = 'Starting...';
            break;
        case Status.ModelDownloading:
            alertContent.message = 'Downloading model...';
            break;
        case Status.ModelLoading:
            alertContent.message = 'Loading model...';
            break;
        case Status.TranscriptionStarted:
            alertContent.message = 'Running';
            alertContent.severity = 'success';
            break;
        case Status.Stopping:
            alertContent.message = 'Stopping...';
            alertContent.severity = 'error';
            break;
        case Status.Stopped:
            alertContent.message = 'Stopped';
            alertContent.severity = 'error';
            break;
    }
    return alertContent;
}