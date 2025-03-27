import {Button} from "@mui/material";
import {openUrl} from "@tauri-apps/plugin-opener";

export function InstallOllamaButton() {

    return (
        <Button
            color='inherit'
            size="small"
            onClick={e => {
                e.preventDefault();
                openUrl('https://ollama.com/download').catch(console.error);
            }}
        >Download</Button>
    );
}
