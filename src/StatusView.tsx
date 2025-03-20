import {useEffect, useState} from "react";
import {Status, Transcription} from "./system/transcription.ts";
import {Alert, AlertColor, Collapse} from "@mui/material";

export default function StatusView() {

    const [statusAlertContent, setStatusAlertContent] = useState<AlertContent>(() => mapStatusToDisplay(Transcription.get().getStatus()));
    const [messageAlertContent, setMessageAlertContent] = useState<AlertContent | null>(null);
    const [messageAlertShow, setMessageAlertShow] = useState<boolean>(false);

    useEffect(() => {
        return Transcription.get().subscribe((event) => {
            switch (event.type) {
                case 'status-change':
                    setStatusAlertContent(mapStatusToDisplay(event.status));
                    setMessageAlertShow(false);
                    break;
                case 'loading-progress':
                    setMessageAlertContent({
                        severity: 'info',
                        message: event.progressStr,
                    });
                    setMessageAlertShow(true);
                    break;
                case 'error':
                    setMessageAlertContent({
                        severity: 'error',
                        message: event.msg,
                    });
                    setMessageAlertShow(true);
                    break;
            }
        });
    }, []);

    return (
        <>
            <Alert severity={statusAlertContent.severity} variant='standard'>{statusAlertContent.message}</Alert>
            <Collapse in={!!messageAlertShow}>
                <Alert severity={messageAlertContent?.severity || 'error'} variant='filled'>{messageAlertContent?.message}</Alert>
            </Collapse>
        </>
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