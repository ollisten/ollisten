import {Button} from "@mui/material";
import {openUrl} from "@tauri-apps/plugin-opener";
import {Events} from "./system/events.ts";

export function InstallOllamaButton() {

    return (
        <Button
            color='inherit'
            size="small"
            onClick={e => {
                e.preventDefault();
                openUrl('https://ollama.com/download').catch(e => Events.get().showError(`Failed to open URL: ${e}`));
            }}
        >Download</Button>
    );
}
