import {useCallback, useEffect, useRef, useState} from "react";
import {Channel, invoke} from "@tauri-apps/api/core";
import {useForceRender} from "./util/useForceRender.ts";
import {Alert, AlertColor, Button, FormControl, InputLabel, MenuItem, Select} from "@mui/material";
import {makeStyles} from "@mui/styles";

type SessionEvent =
    {
        event: 'started';
    } |
    {
        event: 'transcription';
        data: {
            text: string;
        };
    } |
    {
        event: 'questionAnswer';
        data: {
            text: string;
        };
    };

type ListenDevice = {
    name: string;
    id: number;
}
type LlmModel = {
    name: string;
    size: number;
}
type InitializeResponse = {
    error: string;
} | {
    error: null;
    whisper_model_options: string[];
    listen_device_options: ListenDevice[];
    llm_model_options: LlmModel[];
};

enum Status {
    initializing,
    starting,
    started,
    stopping,
    stopped
}

const sessionChannel = new Channel<SessionEvent>();

function App() {
    const classes = useStyles();

    const [error, setError] = useState<string>();
    const [whisperModel, setWhisperModel] = useState<string>();
    const [whisperModelOptions, setWhisperModelOptions] = useState<string[]>([]);
    const [listenDeviceId, setListenDeviceId] = useState<number>();
    const [listenDeviceOptions, setListenDeviceOptions] = useState<ListenDevice[]>([]);
    const [llmModelName, setLlmModelName] = useState<string>();
    const [llmModelOptions, setLlmModelOptions] = useState<LlmModel[]>([]);
    useEffect(() => {
        invoke<InitializeResponse>("initialize").then(response => {
            console.log('Received initialize response:', response);
            if (response.error === null) {
                setWhisperModel(response.whisper_model_options[0] || '');
                setWhisperModelOptions(response.whisper_model_options);
                setListenDeviceId(response.listen_device_options[0]?.id || -1);
                setListenDeviceOptions(response.listen_device_options);
                setLlmModelName(response.llm_model_options[0]?.name || '');
                setLlmModelOptions(response.llm_model_options);
                setStatus(Status.stopped);
            } else {
                setError(response.error);
            }
        }).catch(e => setError(e));
    }, []);

    // Using ref instead of state due to concurrency issues
    // If you restart, the previous message handler will process Started event before
    // React can process setStatus(Status.starting)
    const statusRef = useRef<Status>(Status.initializing);
    const status = statusRef.current;
    const setStatus = useCallback((newStatus: Status) => {
        statusRef.current = newStatus;
        forceRender();
    }, []);
    const transcriptionRef = useRef<string[]>([]);
    const forceRender = useForceRender();

    const [qAndA, setQAndA] = useState("");

    const stopSession = useCallback(async () => {
        setStatus(Status.stopping);
        await invoke("stop_session").catch(e => setError(e));
        setStatus(Status.stopped);
    }, []);
    const startSession = useCallback(() => {
        setStatus(Status.starting);
        sessionChannel.onmessage = sessionEvent => {
            console.log('Received session event:', sessionEvent);
            switch (sessionEvent.event) {
                case 'started':
                    setStatus(Status.started);
                    break;
                case 'transcription':
                    if (statusRef.current === Status.starting) {
                        setStatus(Status.started);
                    }
                    if (!sessionEvent.data.text || transcriptionRef.current[transcriptionRef.current.length - 1] === sessionEvent.data.text) {
                        return;
                    }
                    transcriptionRef.current.push(sessionEvent.data.text);
                    forceRender();
                    break;
                case 'questionAnswer':
                    setQAndA(sessionEvent.data.text);
                    break;
            }
        };
        invoke('start_session', {
            sessionChannel,
            listenDeviceId,
            whisperModel,
            llmModel: llmModelName,
        }).catch(e => setError(e));
    }, [listenDeviceId, whisperModel, llmModelName]);

    // Ensure stopped on unmount
    useEffect(() => () => {
        stopSession()
    }, []);

    var statusDisplay;
    var statusSeverity: AlertColor = 'info';
    var buttonEnabled = true;
    var buttonTitle;
    switch (status) {
        case Status.initializing:
            statusDisplay = 'Initializing...';
            buttonTitle = 'Start';
            buttonEnabled = false;
            break;
        case Status.stopped:
            statusDisplay = 'Stopped';
            statusSeverity = 'warning';
            buttonTitle = 'Start';
            break;
        case Status.starting:
            statusDisplay = 'Starting...';
            buttonTitle = 'Stop';
            buttonEnabled = false;
            break;
        case Status.started:
            statusDisplay = 'Started';
            statusSeverity = 'success';
            buttonTitle = 'Stop';
            break;
        case Status.stopping:
            statusDisplay = 'Stopping...';
            buttonTitle = 'Start';
            buttonEnabled = false;
            break;
    }

    return (
        <main
            data-tauri-drag-region
            className={classes.root}
        >
            <FormControl fullWidth>
                <InputLabel>Whisper Model</InputLabel>
                <Select
                    label='Listen device'
                    value={`${listenDeviceId}`}
                    onChange={e => setListenDeviceId(parseInt(e.target.value as string))}
                >
                    {listenDeviceOptions.map(listenDevice =>
                        <MenuItem key={listenDevice.id} value={`${listenDevice.id}`}>{listenDevice.name}</MenuItem>
                    )}
                </Select>
            </FormControl>
            <FormControl fullWidth>
                <Select
                    label='Whisper Model'
                    value={whisperModel || null}
                    onChange={e => setWhisperModel(e.target.value as string)}
                >
                    {whisperModelOptions.map(modelName =>
                        <MenuItem key={modelName} value={modelName}>{modelName}</MenuItem>
                    )}
                </Select>
            </FormControl>
            <FormControl fullWidth>
                <Select
                    label='LLM Model'
                    value={llmModelName || null}
                    onChange={e => setLlmModelName(e.target.value as string)}
                >
                    {llmModelOptions.map(model =>
                        <MenuItem key={model.name} value={model.name}>{model.name} ({model.size})</MenuItem>
                    )}
                </Select>
            </FormControl>
            <Button
                variant='contained'
                disabled={!buttonEnabled}
                onClick={e => {
                    e.preventDefault();
                    setError(undefined);
                    switch (status) {
                        case Status.started:
                            stopSession();
                            break;
                        case Status.stopped:
                            startSession();
                            break;
                    }
                }}
            >{buttonTitle}</Button>
            <Alert severity={error ? 'error' : statusSeverity}>{error || statusDisplay}</Alert>
            <h5>Q&A</h5>
            <p>{qAndA}</p>
            <h5>Transcript</h5>
            <pre>{transcriptionRef.current.join("\n")}</pre>
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
