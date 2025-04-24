import {useEffect, useState} from "react";
import {DownloadProgressEvent, ErrorEvent, LoadingProgressEvent, StatusChangeEvent} from "./system/transcription.ts";
import {Alert, Collapse} from "@mui/material";
import {Events} from "./system/events.ts";
import {formatBytesToString} from "./util/unitConversion.ts";

export default function AppBar() {

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
        <Collapse in={messageAlertShow}>
            <Alert severity={messageAlertContent?.severity || 'error'}
                   variant='outlined'>{messageAlertContent?.message}</Alert>
        </Collapse>
    );
}

type AlertContent = {
    message: string,
    severity: 'success' | 'info' | 'warning' | 'error',
}
