import {ComponentProps, ReactNode, useEffect, useState} from "react";
import {useForceRender} from "./util/useForceRender.ts";
import {
    DeviceInputOptionSelectedEvent,
    DeviceOutputUpdatedEvent,
    Status,
    StatusChangeEvent,
    Transcription,
    TranscriptionModelOptionSelectedEvent
} from "./system/transcription.ts";
import {Button, IconButton, Popover, Typography} from "@mui/material";
import {Events} from "./system/events.ts";
import {Mic, MicNone, MicOff} from "@mui/icons-material";

export default function TranscriptionButton(props: {
    popoverDirection?: 'right' | 'up' | 'down';
}) {

    const forceRender = useForceRender();

    useEffect(() => {
        return Events.get().subscribe([
            'device-output-updated', 'status-change', 'device-input-option-selected', 'transcription-model-option-selected',
        ], (event: StatusChangeEvent | DeviceInputOptionSelectedEvent | TranscriptionModelOptionSelectedEvent | DeviceOutputUpdatedEvent) => {
            switch (event.type) {
                case 'device-input-option-selected':
                case 'transcription-model-option-selected':
                case 'device-output-updated':
                case 'status-change':
                    forceRender(); // Llm.canStart() may have changed
                    break;
            }
        });
    }, []);

    let buttonIcon: ReactNode = null;
    let buttonPopoverText: string = '';
    let buttonColor: ComponentProps<typeof Button>['color'] = undefined;
    switch (Transcription.get().getStatus()) {
        case Status.Starting:
            buttonIcon = <MicNone/>;
            buttonPopoverText = 'Starting to listen...';
            buttonColor = 'info';
            break;
        case Status.ModelDownloading:
            buttonIcon = <MicNone/>;
            buttonPopoverText = 'Starting to listen, model is downloading...';
            buttonColor = 'info';
            break;
        case Status.ModelLoading:
            buttonIcon = <MicNone/>;
            buttonPopoverText = 'Starting to listen, model is loading...';
            buttonColor = 'info';
            break;
        case Status.TranscriptionStarted:
            buttonIcon = <Mic/>;
            buttonPopoverText = 'Listening, press to stop.';
            buttonColor = 'inherit';
            break;
        case Status.Stopping:
            buttonIcon = <MicOff/>;
            buttonPopoverText = 'Stopping listening...';
            buttonColor = 'warning';
            break;
        case Status.Stopped:
            const canStart = Transcription.get().canStart();
            if (canStart.valid) {
                buttonIcon = <MicOff/>;
                buttonPopoverText = 'Not listening, press to start.';
                buttonColor = 'error';
            } else {
                buttonIcon = <MicOff/>;
                buttonPopoverText = 'Not listening and cannot start: ' + canStart.error;
                buttonColor = 'error';
            }
            break;
        case Status.Unknown:
        default:
            buttonIcon = <MicNone/>;
            buttonPopoverText = 'Unknown status';
            buttonColor = 'inherit';
            break;
    }

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const buttonPopoverOpen = Boolean(anchorEl);


    var anchorOrigin: ComponentProps<typeof Popover>['anchorOrigin'] | undefined;
    var transformOrigin: ComponentProps<typeof Popover>['transformOrigin'] | undefined;
    switch (props.popoverDirection || '') {
        case 'right':
            anchorOrigin = {
                vertical: 'center',
                horizontal: 'right',
            };
            transformOrigin = {
                vertical: 'center',
                horizontal: 'left',
            };
            break;
        default:
        case 'up':
            anchorOrigin = {
                vertical: 'top',
                horizontal: 'center',
            };
            transformOrigin = {
                vertical: 'bottom',
                horizontal: 'center',
            };
            break;
        case 'down':
            anchorOrigin = {
                vertical: 'bottom',
                horizontal: 'center',
            };
            transformOrigin = {
                vertical: 'top',
                horizontal: 'center',
            };
            break;
    }

    return (
        <>
            <IconButton
                color={buttonColor}
                onClick={async e => {
                    e.preventDefault();
                    switch (Transcription.get().getStatus()) {
                        case Status.Unknown:
                        case Status.Stopped:
                            if (!Transcription.get().canStart().valid) {
                                return
                            }
                            await Transcription.get().startTranscription();
                            break;
                        case Status.TranscriptionStarted:
                            await Transcription.get().stopTranscription();
                            break;
                    }
                    forceRender();
                }}
                onMouseEnter={event => setAnchorEl(event.currentTarget)}
                onMouseLeave={() => setAnchorEl(null)}
            >{buttonIcon}</IconButton>
            <Popover
                sx={{pointerEvents: 'none'}}
                open={buttonPopoverOpen && !!buttonPopoverText}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={anchorOrigin}
                transformOrigin={transformOrigin}
            >
                <Typography sx={{p: 1}}>{buttonPopoverText}</Typography>
            </Popover>
        </>
    );
}
