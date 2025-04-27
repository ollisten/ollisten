import {useEffect, useRef} from "react";
import {LlmRequestEvent, LlmResponseEvent} from "./system/prompter.ts";
import {Events} from "./system/events.ts";
import {useAppConfig} from "./util/useAppConfig.ts";
import {DeviceSource, Transcription, TranscriptionDataEvent} from "./system/transcription.ts";
import {Box, Collapse, TextField, Typography} from "@mui/material";
import Menu, {Tab} from "./Menu.tsx";
import {useForceRender} from "./util/useForceRender.ts";
import {LlmMessage} from "./LlmMessage.tsx";
import {randomTimeUuid} from "./util/idUtil.ts";

const MaxEntriesTranscription = 9;
const MaxEntriesLlm = 6;
const MaxEntriesEvents = 30;
const HideBuffer = 3;

Transcription.get(); // Required to subscribe to transcription events

type TranscriptionRecord = TranscriptionDataEvent & {
    received: Date,
};
type LlmRecord = Omit<LlmRequestEvent, 'type'> & Omit<Partial<LlmResponseEvent>, 'type'> & {
    requested: Date,
    responded?: Date,
};
export const AllEventTypes = [
    'TranscriptionData',
    'TranscriptionDownloadProgress',
    'TranscriptionLoadingProgress',
    'TranscriptionStarted',
    'TranscriptionStopped',
    'agent-window-closed',
    'app-config-changed',
    'device-input-option-selected',
    'device-input-options-updated',
    'device-output-updated',
    'file-agent-created',
    'file-agent-deleted',
    'file-agent-modified',
    'llm-model-option-selected',
    'llm-model-options-updated',
    'llm-request',
    'llm-response',
    'ollama-is-stopped',
    'ollama-no-models',
    'ollama-not-installed',
    'prompter-status-changed',
    'status-change',
    'transcription-model-option-selected',
    'transcription-model-options-updated',
];

export default function AppDebug() {
    const {appConfig} = useAppConfig();
    const forceRender = useForceRender();
    const transcriptionEventsRef = useRef<Array<TranscriptionRecord>>([]);
    const llmRecordsRef = useRef<Array<LlmRecord>>([]);
    const eventsRef = useRef<Array<any>>([]);

    useEffect(() => {
        return Events.get().subscribe(AllEventTypes, event => {
            eventsRef.current.unshift({
                ...event,
                received: new Date(),
                uuid: randomTimeUuid(),
            });
            while (eventsRef.current.length > MaxEntriesEvents + HideBuffer) {
                eventsRef.current.pop();
            }
            forceRender();
        });
    }, []);

    useEffect(() => {
        return Events.get().subscribe([
            'llm-response', 'llm-request', 'TranscriptionData'
        ], (
            event: LlmRequestEvent | LlmResponseEvent | TranscriptionDataEvent
        ) => {
            switch (event.type) {
                case 'llm-request':
                    llmRecordsRef.current.push({
                        ...event,
                        requested: new Date(),
                    });
                    while (llmRecordsRef.current.length > MaxEntriesLlm + HideBuffer) {
                        llmRecordsRef.current.shift();
                    }
                    forceRender();
                    break;
                case 'llm-response':
                    for (let i = 0; i < llmRecordsRef.current.length; i++) {
                        const record = llmRecordsRef.current[i];
                        if (record.agentName === event.agentName && record.prompt === event.prompt) {
                            llmRecordsRef.current[i] = {
                                ...llmRecordsRef.current[i],
                                ...event,
                                responded: new Date(),
                            }
                            break;
                        }
                    }
                    break;
                case 'TranscriptionData':
                    transcriptionEventsRef.current.push({
                        ...event,
                        received: new Date(),
                    });
                    while (transcriptionEventsRef.current.length > MaxEntriesTranscription + HideBuffer) {
                        transcriptionEventsRef.current.shift();
                    }
                    forceRender();
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }
        });
    }, []);

    return (
        <Box component='main' sx={{
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            minWidth: '100vw',
            padding: '1rem',
            overflow: 'scroll',
            maxHeight: '30%',
        }} data-tauri-drag-region="">
            <Menu>
                <Tab label='Transcription'>
                    <div>
                        {transcriptionEventsRef.current.map((event, index, arr) => (
                            <Collapse in={arr.length - index <= MaxEntriesTranscription} appear
                                      key={`${event.received}`}>
                                <div>
                                    <Typography variant="h6">
                                        {Transcription.get().deviceIdToSource(event.deviceId) === DeviceSource.Host ? 'Host' : 'Guest'}
                                        {' - '}
                                        (Accuracy {(event.confidence * 100) | 0}%)
                                    </Typography>
                                    <Typography variant='body1' gutterBottom>
                                        {event.text}
                                    </Typography>
                                </div>
                            </Collapse>
                        ))}
                    </div>
                </Tab>
                <Tab label='LLM'>
                    <div>
                        {llmRecordsRef.current.map((event, index, arr) => (
                            <Collapse in={arr.length - index <= MaxEntriesLlm} appear key={event.requested.toString()}>
                                <div>
                                    <Typography variant="h6">
                                        {!event.answer ? 'Processing...' : 'Received'}
                                        {' - '}
                                        {event.agentName}
                                    </Typography>
                                    <Typography variant='body1' gutterBottom>
                                        <LlmMessage text={event.answer || ''}/>
                                    </Typography>
                                </div>
                            </Collapse>
                        ))}
                    </div>
                </Tab>
                <Tab label='Config'>
                    <TextField
                        variant='outlined'
                        disabled
                        fullWidth
                        multiline
                        value={JSON.stringify(appConfig, null, 4) || ''}
                        rows={26}
                    />
                </Tab>
                <Tab label='Events'>
                    <div>
                        {eventsRef.current.map((event, index, arr) => (
                            <Collapse in={arr.length - index <= MaxEntriesEvents} appear
                                      key={event.uuid}>
                                <div>
                                    <Typography variant='body1' gutterBottom component='pre' fontSize={10}>
                                        {JSON.stringify(event, null, 4)}
                                    </Typography>
                                </div>
                            </Collapse>
                        ))}
                    </div>
                </Tab>
            </Menu>
        </Box>
    );
}
