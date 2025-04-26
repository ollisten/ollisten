import {useEffect} from "react";
import {DownloadProgressEvent, ErrorEvent, LoadingProgressEvent} from "./system/transcription.ts";
import {IconButton} from "@mui/material";
import {Events, UserFacingMessageEvent} from "./system/events.ts";
import {formatBytesToString} from "./util/unitConversion.ts";
import {SharedProps, useSnackbar} from "notistack";
import {Close} from "@mui/icons-material";
import {randomUuid} from "./util/idUtil.ts";

export default function ErrorNotifier() {
    const {enqueueSnackbar, closeSnackbar} = useSnackbar();
    useEffect(() => {
        return Events.get().subscribe([
            'user-facing-message',
            'TranscriptionDownloadProgress',
            'TranscriptionLoadingProgress',
            'TranscriptionError',
        ], (
            event: UserFacingMessageEvent | DownloadProgressEvent | LoadingProgressEvent | ErrorEvent
        ) => {
            var variant: SharedProps['variant'] = 'info';
            var message = '';
            var key = randomUuid();
            switch (event.type) {
                case 'user-facing-message':
                    variant = event.severity;
                    message = event.message;
                    break;
                case 'TranscriptionDownloadProgress':
                    variant = 'info';
                    message = `Downloaded: ${formatBytesToString(event.progress)} / ${formatBytesToString(event.size)}`;
                    key = 'TranscriptionDownloadProgress';
                    break;
                case 'TranscriptionLoadingProgress':
                    variant = 'info';
                    message = `Loaded: ${Math.round(event.progress * 100)}%`;
                    key = 'TranscriptionLoadingProgress';
                    break;
                case 'TranscriptionError':
                    variant = 'error';
                    message = event.message;
                    key = 'TranscriptionError';
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }

            enqueueSnackbar(message, {
                key,
                variant,
                preventDuplicate: true,
                action: (key) => (
                    <IconButton aria-label="Close" color="inherit" onClick={() => closeSnackbar(key)}>
                        <Close fontSize='small'/>
                    </IconButton>
                ),
            });

        });
    }, []);

    return null;
}
