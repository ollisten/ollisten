import {makeStyles} from "@mui/styles";
import {Status, Transcription} from "./system/transcription.ts";
import {AgentConfig} from "./system/agentManager.ts";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Button, Slider, Tab, Tabs, TextField, Typography} from "@mui/material";
import {invoke} from "@tauri-apps/api/core";
import {getCurrentWindow} from "@tauri-apps/api/window";
import {Events} from "./system/events.ts";
import {LlmResponseEvent, Prompter} from "./system/prompter.ts";
import clsx from "clsx";
import debounce from "./util/debounce.ts";

Transcription.get(); // Required to subscribe to transcription events
let initialAgentConfig: AgentConfig = (() => {
    const searchParams = new URLSearchParams(window.location.search);
    const agentConfigStr = searchParams.get('agentConfig');
    if (!agentConfigStr) throw new Error('No agentConfig provided');
    return JSON.parse(decodeURIComponent(agentConfigStr));
})();

enum TestSource {
    Live,
    Manual,
    Off,
}

export default function AppAgentEdit() {
    const classes = useStyles();

    const [testSource, setTestSource] = useState<TestSource>(() => {
        switch (Transcription.get().getStatus()) {
            case Status.Starting:
            case Status.ModelLoading:
            case Status.ModelDownloading:
            case Status.TranscriptionStarted:
                return TestSource.Live;
            case Status.Stopping:
            case Status.Stopped:
            default:
                return TestSource.Manual;
        }
    });
    const [changed, setChanged] = useState<boolean>(false);
    const [name, setName] = useState<string>(initialAgentConfig.name);
    const [prompt, setPrompt] = useState<string>(initialAgentConfig.agent.prompt);
    const [compiledPrompt, setCompiledPrompt] = useState<string>('');
    const [intervalInSec, setIntervalInSec] = useState<number>(initialAgentConfig.agent.intervalInSec || 3);
    const [transcription, setTranscription] = useState<string>('Guest: Not too bad.');
    const [transcriptionHistory, setTranscriptionHistory] = useState<string>('Guest: Hey' +
        '\nHost: Hi' +
        '\nGuest: How are you?' +
        '\nHost: I\'m good, how about you?');
    const [answer, setAnswer] = useState<string | null>(null);

    // Update agent during live mode
    useEffect(() => {
        Prompter.get().prepareInvocation({prompt, intervalInSec})
    }, [prompt, intervalInSec]);

    // Invoke during manual mode
    const invokeDebounced = useMemo(() => {
        return debounce(async (tHistory: string, t: string) => {
            return await Prompter.get().invoke(tHistory, t);
        }, intervalInSec * 1000, false);
    }, [intervalInSec]);
    useEffect(() => {
        if (testSource === TestSource.Manual) {
            invokeDebounced(transcriptionHistory, transcription)
                .then(event => {
                    if(event) {
                        setAnswer(event.answer);
                        setCompiledPrompt(event.prompt);
                        // Skip setting transcription
                    }
                });
        }
    }, [testSource, transcriptionHistory, transcription, prompt]);

    // Switch modes
    useEffect(() => {
        switch (testSource) {
            case TestSource.Off:
                Prompter.get().pause();
                Transcription.get().stopTranscription();
                break;
            case TestSource.Manual:
                Prompter.get().resume();
                Transcription.get().stopTranscription();
                break;
            case TestSource.Live:
                Prompter.get().resume();
                Prompter.get().start(false);
                Transcription.get().startTranscription();
                break;
        }
    }, [testSource]);

    // Scroll history to bottom
    const transcriptionHistoryRef = useRef<HTMLInputElement>();
    const scrollToBottom = useCallback(() => {
        const textAreaElement = transcriptionHistoryRef.current?.querySelector("textarea");
        if (textAreaElement) {
            textAreaElement.scrollTop = textAreaElement.scrollHeight;
        }
    }, []);
    useEffect(() => {
        if (testSource === TestSource.Live) {
            scrollToBottom();
        }
    }, [transcriptionHistory]);

    useEffect(() => {
        return Events.get().subscribe('llm-response', (
            event: LlmResponseEvent
        ) => {
            switch (event.type) {
                case 'llm-response':
                    setAnswer(event.answer);
                    setTranscription(event.transcriptionLatest)
                    setTranscriptionHistory(event.transcriptionHistory)
                    setCompiledPrompt(event.prompt)
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }
        });
    }, []);

    return (
        <main className={classes.root} data-tauri-drag-region="">
            <div className={clsx(classes.section, classes.sectionEdit)}>
                <Typography variant='h4'>Prompt Edit</Typography>
                <TextField
                    label='Name'
                    variant='outlined'
                    value={name || ''}
                    onChange={(e) => {
                        const nameSanitized = e.target.value.replace(/[^a-zA-Z0-9-_]/g, '_');
                        setName(nameSanitized);
                        setChanged(true);
                    }}
                />
                <div>
                    <Typography gutterBottom>Interval</Typography>
                    <Slider
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => `${value}s`}
                        step={1}
                        marks
                        min={1}
                        max={30}
                        value={intervalInSec}
                        onChange={(_, newIntervalInSec) => {
                            setIntervalInSec(newIntervalInSec as number);
                            setChanged(true);
                            Prompter.get().prepareInvocation({prompt, intervalInSec: newIntervalInSec as number});
                        }}
                    />
                </div>
                <TextField
                    label='Prompt'
                    variant='outlined'
                    multiline
                    value={prompt || ''}
                    onChange={(e) => {
                        const newPrompt = e.target.value;
                        setPrompt(newPrompt);
                        setChanged(true);
                        Prompter.get().prepareInvocation({prompt: newPrompt, intervalInSec});
                    }}
                    minRows={15}
                    maxRows={30}
                />
                <div className={classes.actionBar}>
                    <Button
                        color='warning'
                        disabled={!changed || initialAgentConfig.name === ''}
                        onClick={() => {
                            setChanged(false);
                            setName(initialAgentConfig.name);
                            setPrompt(initialAgentConfig.agent.prompt);
                            setIntervalInSec(initialAgentConfig.agent.intervalInSec || 3);
                        }}
                    >Reset</Button>
                    <Button
                        color='error'
                        disabled={initialAgentConfig.name !== name || initialAgentConfig.name === ''}
                        onClick={async () => {
                            await invoke<void>('delete_agent_config', {name});
                            await getCurrentWindow().destroy();
                        }}
                    >Delete</Button>
                    <div className={classes.grow}/>
                    <Button
                        disabled={!changed}
                        onClick={() => {
                            setChanged(false);
                            const initialName = initialAgentConfig.name
                            initialAgentConfig = {
                                name,
                                agent: {
                                    prompt,
                                    intervalInSec,
                                }
                            };
                            invoke<void>('save_agent_config', {
                                initialName,
                                agentConfig: initialAgentConfig,
                            }).catch(console.error);
                        }}
                    >{initialAgentConfig.name === '' ? 'Create' : (initialAgentConfig.name === name ? 'Save' : 'Rename')}</Button>
                </div>
            </div>
            <div className={clsx(classes.section, classes.sectionTest)}>
                <Typography variant='h4'>Prompt Test</Typography>
                <Tabs
                    value={testSource}
                    onChange={(_, newValue) => setTestSource(newValue)}
                    variant='fullWidth'
                >
                    <Tab label='Off' value={TestSource.Off}/>
                    <Tab label='Manual' value={TestSource.Manual}/>
                    <Tab label='Live' value={TestSource.Live}/>
                </Tabs>
                <TextField
                    label='Transcription History'
                    inputRef={transcriptionHistoryRef}
                    variant='outlined'
                    disabled={testSource !== TestSource.Manual}
                    multiline
                    value={transcriptionHistory || ''}
                    onChange={(e) => {
                        if(testSource === TestSource.Manual) {
                        setTranscriptionHistory(e.target.value);
                        }
                    }}
                    rows={8}
                />
                <TextField
                    label='Transcription'
                    variant='outlined'
                    disabled={testSource !== TestSource.Manual}
                    multiline
                    value={transcription || ''}
                    onChange={(e) => {
                        if(testSource === TestSource.Manual) {
                            setTranscription(e.target.value);
                        }
                    }}
                    rows={2}
                />
                {/*<TextField*/}
                {/*    label='Compiled Prompt'*/}
                {/*    variant='outlined'*/}
                {/*    disabled*/}
                {/*    multiline*/}
                {/*    value={compiledPrompt || ''}*/}
                {/*    onChange={() => {*/}
                {/*    }}*/}
                {/*    rows={2}*/}
                {/*/>*/}
                <TextField
                    label='Answer'
                    variant='outlined'
                    disabled
                    multiline
                    value={answer}
                    minRows={8}
                    maxRows={16}
                />
            </div>
        </main>
    );
}

const useStyles = makeStyles({
    root: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    section: {
        margin: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    sectionEdit: {
        flexGrow: 5,
    },
    sectionTest: {
        flexGrow: 3,
    },
    grow: {
        flexGrow: 1,
    },
    actionBar: {
        display: 'flex',
        gap: '1rem',
        justifyContent: 'flex-end',
    },
    output: {
        overflow: 'scroll',
        flexGrow: 1,
    },
});
