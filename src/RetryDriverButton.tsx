import {Button} from "@mui/material";
import {Transcription} from "./system/transcription.ts";

export function RetryDriverButton() {
    return (
        <Button
            color='inherit'
            size="small"
            onClick={e => {
                e.preventDefault();
                Transcription.get().fetchOutputDevice().catch(console.error);
            }}
        >Retry</Button>
    );
}
