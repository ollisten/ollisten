import {Button} from "@mui/material";
import {Transcription} from "./system/transcription.ts";
import {Events} from "./system/events.ts";

export function RetryDriverButton() {
    return (
        <Button
            color='inherit'
            size="small"
            onClick={e => {
                e.preventDefault();
                Transcription.get().fetchOutputDevice().catch(e => Events.get().showError(`Failed to fetch output device: ${e}`));
            }}
        >Retry</Button>
    );
}
