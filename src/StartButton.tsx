import {useEffect} from "react";
import {useForceRender} from "./util/useForceRender.ts";
import {Status, Transcription} from "./system/transcription.ts";
import {Button} from "@mui/material";
import {AgentManager} from "./system/agentManager.ts";

enum ButtonState {
    Start,
    Stop,
}

function StartButton() {

    const forceRender = useForceRender();

    useEffect(() => {
        return Transcription.get().subscribe((event) => {
            switch (event.type) {
                case 'status-change':
                    forceRender();
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
