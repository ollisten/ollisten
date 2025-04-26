import {useEffect, useState} from "react";
import {Alert, Collapse} from "@mui/material";
import {Events} from "./system/events.ts";
import {
    LlmModelOptionsUpdatedEvent,
    OllamaIsStoppedEvent,
    OllamaNoModels,
    OllamaNotInstalledEvent
} from "./system/llm.ts";
import {RetryOllamaButton} from "./RetryOllamaButton.tsx";
import {InstallOllamaButton} from "./InstallOllamaButton.tsx";

export function InstallStartOllamaNotice() {

    const [state, setState] = useState<'Modelless' | 'Stopped' | 'Missing' | null>(null);

    useEffect(() => {
        return Events.get().subscribe([
            'ollama-no-models', 'ollama-is-stopped', 'ollama-not-installed', 'llm-model-options-updated',
        ], (event: LlmModelOptionsUpdatedEvent | OllamaNoModels | OllamaIsStoppedEvent | OllamaNotInstalledEvent) => {
            switch (event.type) {
                case 'ollama-is-stopped':
                    setState('Stopped');
                    break;
                case 'ollama-not-installed':
                    setState('Missing');
                    break;
                case 'ollama-no-models':
                    setState('Modelless');
                    break;
                case 'llm-model-options-updated':
                    setState(null);
                    break;
            }
        });
    }, []);

    var show = true;
    var msg = '';
    var showInstall = false;
    switch (state) {
        case 'Stopped':
            msg = 'The Ollama service is stopped. Please start the service to use the device.';
            break;
        case 'Missing':
            showInstall = true;
            msg = 'The Ollama service is not installed.';
            break;
        case 'Modelless':
            msg = 'Ollama has no models available. Run command "ollama pull llama3.1" to download the model llama3.1.';
            break;
        default:
            show = false;
    }

    return (
        <Collapse in={show}>
            <Alert
                variant='outlined'
                severity='warning'
                sx={{
                    margin: '1rem',
                    marginTop: 0,
                }}
                action={
                    <>
                        <RetryOllamaButton/>
                        {showInstall && (
                            <InstallOllamaButton/>
                        )}
                    </>
                }
            >
                {msg}
            </Alert>
        </Collapse>
    );
}
