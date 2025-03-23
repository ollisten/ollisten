import {useEffect, useState} from "react";
import {
    DownloadProgressEvent,
    ErrorEvent,
    LoadingProgressEvent,
    Status,
    StatusChangeEvent,
    Transcription
} from "./system/transcription.ts";
import {Alert, AlertColor, Collapse} from "@mui/material";
import {makeStyles} from "@mui/styles";
import {SubscriptionManager} from "./system/subscriptionManager.ts";
import {formatBytesToString} from "./util/unitConversion.ts";

const useStyles = makeStyles({
    root: {
        margin: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
});

export default function StatusView() {
    const classes = useStyles();

    const [statusAlertContent, setStatusAlertContent] = useState<AlertContent>(() => mapStatusToDisplay(Transcription.get().getStatus()));
    const [messageAlertContent, setMessageAlertContent] = useState<AlertContent | null>(null);
    const [messageAlertShow, setMessageAlertShow] = useState<boolean>(false);

    useEffect(() => {
        return SubscriptionManager.get().subscribe([
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
            <Alert severity={statusAlertContent.severity} variant='standard'>{statusAlertContent.message}</Alert>
            <Collapse in={!!messageAlertShow}>
                <Alert severity={messageAlertContent?.severity || 'error'}
                       variant='filled'>{messageAlertContent?.message}</Alert>
            </Collapse>
        </div>
    );
}

type AlertContent = {
    message: string,
    severity: AlertColor,
}

const mapStatusToDisplay = (status: Status): AlertContent => {
    let display = 'Unknown';
    let severity: AlertColor = 'info';
    switch (status) {
        case Status.Starting:
            display = 'Starting...';
            break;
        case Status.ModelDownloading:
            display = 'Downloading model...';
            break;
        case Status.ModelLoading:
            display = 'Loading model...';
            break;
        case Status.TranscriptionStarted:
            display = 'Running';
            severity = 'success';
            break;
        case Status.Stopping:
            display = 'Stopping...';
            severity = 'error';
            break;
        case Status.Stopped:
            display = 'Stopped';
            severity = 'error';
            break;
    }
    return {
        message: display,
        severity: severity,
    }
}