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
import {SubscriptionManager} from "./system/subscriptionManager.ts";

enum ButtonState {
    Start,
    Stop,
}

function StartButton() {

    const forceRender = useForceRender();

    useEffect(() => {
        return SubscriptionManager.get().subscribe([
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
        !Transcription.get().canStart()
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
                        Transcription.get().startTranscription();
                        AgentManager.get().managerStart();
                        break;
                    case ButtonState.Stop:
                        Transcription.get().stopTranscription();
                        AgentManager.get().managerStop();
                        break;
                }
            }}
        >{buttonState === ButtonState.Start ? 'Start' : 'Stop'}</Button>
    );
}

export default StartButton;
