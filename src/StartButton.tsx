import {useEffect} from "react";
import {useForceRender} from "./util/useForceRender.ts";
import {
    DeviceInputOptionSelectedEvent,
    DeviceOutputUpdatedEvent,
    Status,
    StatusChangeEvent,
    Transcription,
    TranscriptionModelOptionSelectedEvent
} from "./system/transcription.ts";
import {Button} from "@mui/material";
import {AgentManager} from "./system/agentManager.ts";
import {Llm, LlmModelOptionSelectedEvent} from "./system/llm.ts";
import {Events} from "./system/events.ts";

enum ButtonState {
    Start,
    Stop,
}

function StartButton(props: {
    startTranscription?: boolean;
    startAgents?: boolean;
    label?: string;
}) {

    const forceRender = useForceRender();

    useEffect(() => {
        return Events.get().subscribe([
            'device-output-updated', 'llm-model-option-selected', 'status-change', 'device-input-option-selected', 'transcription-model-option-selected',
        ], (event: StatusChangeEvent | DeviceInputOptionSelectedEvent | TranscriptionModelOptionSelectedEvent | DeviceOutputUpdatedEvent | LlmModelOptionSelectedEvent) => {
            switch (event.type) {
                case 'device-input-option-selected':
                case 'transcription-model-option-selected':
                case 'device-output-updated':
                case 'status-change':
                case 'llm-model-option-selected':
                    forceRender(); // Llm.canStart() may have changed
                    break;
            }
        });
    }, []);

    let disabled: boolean = false;
    let buttonState: ButtonState = ButtonState.Stop;
    switch (Transcription.get().getStatus()) {
        case Status.Stopping:
        case Status.Stopped:
            buttonState = ButtonState.Start;
            break;
        case Status.ModelLoading:
        case Status.ModelDownloading:
            disabled = true;
            break;
    }
    if (buttonState === ButtonState.Start && (
        !Transcription.get().canStart().valid
        || !Llm.get().canStart()
    )) {
        disabled = true;
    }

    return (
        <Button
            variant='contained'
            disabled={disabled}
            onClick={e => {
                e.preventDefault();
                switch (buttonState) {
                    case ButtonState.Start:
                        if (props.startTranscription) {
                            Transcription.get().startTranscription();
                        }
                        if (props.startAgents) {
                            AgentManager.get().managerStart();
                        }
                        break;
                    case ButtonState.Stop:
                        if (props.startTranscription) {
                            Transcription.get().stopTranscription();
                        }
                        if (props.startAgents) {
                            AgentManager.get().managerStop();
                        }
                        break;
                }
            }}
        >{buttonState === ButtonState.Start ? (props.label || 'Start') : 'Stop'}</Button>
    );
}

export default StartButton;
