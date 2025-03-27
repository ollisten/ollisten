import {makeStyles} from "@mui/styles";
import {Transcription} from "./system/transcription.ts";
import {AgentConfig} from "./system/agentManager.ts";
import {useEffect, useState} from "react";
import {Button, Slider, TextField, Typography} from "@mui/material";
import {invoke} from "@tauri-apps/api/core";
import {getCurrentWindow} from "@tauri-apps/api/window";
import StartButton from "./StartButton.tsx";
import {Events} from "./system/events.ts";
import {AgentOverrideEvent, LlmResponseEvent, Prompter} from "./system/prompter.ts";

Transcription.get(); // Required to subscribe to transcription events
let initialAgentConfig: AgentConfig = (() => {
    const searchParams = new URLSearchParams(window.location.search);
    const agentConfigStr = searchParams.get('agentConfig');
    if (!agentConfigStr) throw new Error('No agentConfig provided');
    return JSON.parse(decodeURIComponent(agentConfigStr));
})();

export default function AppAgentEdit() {
    const classes = useStyles();

    const [changed, setChanged] = useState<boolean>(false);
    const [name, setName] = useState<string>(initialAgentConfig.name);
    const [prompt, setPrompt] = useState<string>(initialAgentConfig.agent.prompt);
    const [intervalInSec, setIntervalInSec] = useState<number>(initialAgentConfig.agent.intervalInSec || 3);
    const [transcription, setTranscription] = useState<string>('');
    const [answer, setAnswer] = useState<string | null>(null);

    useEffect(() => {
        return Events.get().subscribe('llm-response', (
            event: LlmResponseEvent
        ) => {
            switch (event.type) {
                case 'llm-response':
                    setAnswer(event.answer);
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }
        });
    }, []);

    useEffect(() => {
        return Prompter.get().start(false);
    }, []);

    return (
        <main className={classes.root} data-tauri-drag-region="">
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
                    onChange={(_, value) => {
                        setIntervalInSec(value as number);
                        setChanged(true);
                        Events.get().sendInternal({
                            type: 'agent-override', agent: {
                                prompt,
                                intervalInSec: value,
                            }
                        } as AgentOverrideEvent);
                    }}
                />
            </div>
            <TextField
                label='Prompt'
                variant='outlined'
                multiline
                value={prompt || ''}
                onChange={(e) => {
                    setPrompt(e.target.value);
                    Events.get().sendInternal({
                        type: 'agent-override', agent: {
                            prompt: e.target.value,
                            intervalInSec,
                        }
                    } as AgentOverrideEvent);
                    setChanged(true);
                }}
                rows={15}
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
            <TextField
                label='Transcription'
                variant='outlined'
                multiline
                value={transcription || ''}
                onChange={(e) => {
                    setTranscription(e.target.value);
                    // TODO kickoff LLM debounced
                }}
                rows={3}
            />
            <StartButton startTranscription label='Use live transcription'/>
            <div className={classes.output}>
                {answer || ''}
            </div>
        </main>
    );
}

const useStyles = makeStyles({
    root: {
        margin: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        height: '100vh',
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
