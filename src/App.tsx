import {useEffect, useState} from "react";
import {useForceRender} from "./util/useForceRender.ts";
import {Alert, AlertColor, Button, FormControl, InputLabel, MenuItem, Select} from "@mui/material";
import {makeStyles} from "@mui/styles";
import {Status, Transcription} from "./system/transcription.ts";
import TranscriptionView from "./TranscriptionView.tsx";

enum ButtonState {
    Start,
    Stop,
}

function App() {
    const classes = useStyles();

    const forceRender = useForceRender();
    const [error, setError] = useState<string>();
    const transcription = Transcription.get();

    useEffect(() => {
        return transcription.subscribe((event) => {
            switch (event.type) {
                case "device-input-options-updated":
                case "device-input-option-selected":
                case "device-output-updated":
                case 'transcription-model-options-updated':
                case 'transcription-model-option-selected':
                case "status-change":
                    forceRender();
                    break;
                case 'error':
                    setError(event.msg);
                    break;
            }
        });
    }, []);

    let statusDisplay;
    let statusSeverity: AlertColor = 'info';
    let buttonState: ButtonState = ButtonState.Stop;
    switch (transcription.getStatus()) {
        case Status.Starting:
            statusDisplay = 'Starting...';
            break;
        case Status.ModelDownloading:
            statusDisplay = 'Downloading model...';
            break;
        case Status.ModelLoading:
            statusDisplay = 'Loading model...';
            break;
        case Status.TranscriptionStarted:
            statusDisplay = 'Running';
            statusSeverity = 'success';
            break;
        case Status.Stopping:
            statusDisplay = 'Stopping...';
            statusSeverity = 'error';
            buttonState = ButtonState.Start;
            break;
        case Status.Stopped:
            statusDisplay = 'Stopped';
            statusSeverity = 'error';
            buttonState = ButtonState.Start;
            break;
    }

    return (
        <main
            data-tauri-drag-region
            className={classes.root}
        >
            <FormControl fullWidth>
                <InputLabel>Input device</InputLabel>
                <Select
                    label='Input device'
                    value={transcription.getInputDeviceId() !== null ? `${transcription.getInputDeviceId()}` : null}
                    onChange={e => transcription.selectInputDeviceId(parseInt(e.target.value as string))}
                >
                    {transcription.getInputDeviceOptions().map(inputDevice =>
                        <MenuItem key={inputDevice.id} value={`${inputDevice.id}`}>{inputDevice.name}</MenuItem>
                    )}
                </Select>
            </FormControl>
            <FormControl fullWidth>
                <InputLabel>Output device</InputLabel>
                <Select
                    label='Output device'
                    value={`${transcription.getOutputDevice()?.id}`}
                    onChange={() => {
                        // There is no selection as we only have one output device
                        // but we still want to have the same Select as the input device selection
                    }}
                >
                    <MenuItem key={`${transcription.getOutputDevice()?.id}`}
                              value={`${transcription.getOutputDevice()?.id}`}>{transcription.getOutputDevice()?.name || ''}</MenuItem>
                </Select>
            </FormControl>
            <FormControl fullWidth>
                <InputLabel>Transcription Model</InputLabel>
                <Select
                    label='Transcription Model'
                    value={transcription.getTranscriptionModelName()}
                    onChange={e => transcription.selectTranscriptionModelName(e.target.value as string)}
                >
                    {transcription.getTranscriptionModelOptions().map(modelName =>
                        <MenuItem key={modelName} value={modelName}>{modelName}</MenuItem>
                    )}
                </Select>
            </FormControl>
            {/*<FormControl fullWidth>*/}
            {/*    <Select*/}
            {/*        label='LLM Model'*/}
            {/*        value={transcription.getLlmModelName()}*/}
            {/*        onChange={e => transcription.selectLlmModelName(e.target.value as string)}*/}
            {/*    >*/}
            {/*        {transcription.getLlmModelOptions().map(model =>*/}
            {/*            <MenuItem key={model.name} value={model.name}>{model.name} ({model.size})</MenuItem>*/}
            {/*        )}*/}
            {/*    </Select>*/}
            {/*</FormControl>*/}
            <Button
                variant='contained'
                onClick={e => {
                    e.preventDefault();
                    setError(undefined);
                    switch (buttonState) {
                        case ButtonState.Start:
                            transcription.startTranscription();
                            break;
                        case ButtonState.Stop:
                            transcription.stopTranscription();
                            break;
                    }
                }}
            >{buttonState === ButtonState.Start ? 'Start' : 'Stop'}</Button>
            <Alert severity={error ? 'error' : statusSeverity}>{error || statusDisplay}</Alert>
            <TranscriptionView/>
        </main>
    );
}

const useStyles = makeStyles({
    root: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
});

export default App;
