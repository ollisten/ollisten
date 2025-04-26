import {styled} from "@mui/styles";
import {Transcription} from "./system/transcription.ts";
import {AgentConfig, AgentManager} from "./system/agentManager.ts";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Box, Button, Checkbox, Collapse, FormControlLabel, Slider, TextField, Typography} from "@mui/material";
import {invoke} from "@tauri-apps/api/core";
import {getCurrentWindow} from "@tauri-apps/api/window";
import {Events} from "./system/events.ts";
import {LlmResponseEvent, Prompter} from "./system/prompter.ts";
import {useForceRender} from "./util/useForceRender.ts";
import TranscriptionButton from "./TranscriptionButton.tsx";
import Menu, {Tab} from "./Menu.tsx";
import PrompterButton from "./PrompterButton.tsx";

Transcription.get(); // Required to subscribe to transcription events
let initialAgentConfig: AgentConfig = AgentManager.get().clientGetAgentConfig();

const MaxSelectableTranscriptionHistoryMaxChars = 3000;

export default function AppAgentEdit() {
    const [changed, setChanged] = useState<boolean>(false);
    const [name, setName] = useState<string>(initialAgentConfig.name);
    const [prompt, setPrompt] = useState<string>(initialAgentConfig.agent.prompt);
    const [compiledPrompt, setCompiledPrompt] = useState<string>('Invoke to see output.');
    const [intervalInSec, setIntervalInSec] = useState<number>(initialAgentConfig.agent.intervalInSec || 3);
    const [transcriptionHistoryMaxChars, setTranscriptionHistoryMaxChars] = useState<number | null>(initialAgentConfig.agent.transcriptionHistoryMaxChars);
    const [structuredOutputEnabled, setStructuredOutputEnabled] = useState<boolean>(!!initialAgentConfig.agent.structuredOutput);
    const [structuredOutputSchema, setStructuredOutputSchema] = useState<string>(initialAgentConfig.agent.structuredOutput?.schema || '');
    const [structuredOutputMapper, setStructuredOutputMapper] = useState<string>(initialAgentConfig.agent.structuredOutput?.mapper || '');
    const currentAgentConfig: AgentConfig = useMemo(() => ({
        name,
        agent: {
            prompt,
            intervalInSec,
            transcriptionHistoryMaxChars,
            structuredOutput: !structuredOutputEnabled ? null : {
                schema: structuredOutputSchema,
                mapper: structuredOutputMapper,
            },
        }
    }), [
        name,
        prompt,
        intervalInSec,
        structuredOutputEnabled,
        structuredOutputSchema,
        structuredOutputMapper,
    ]);
    const doReset = useCallback(() => {
        setChanged(false);
        setName(initialAgentConfig.name);
        setPrompt(initialAgentConfig.agent.prompt);
        setStructuredOutputEnabled(!!initialAgentConfig.agent.structuredOutput);
        setStructuredOutputSchema(initialAgentConfig.agent.structuredOutput?.schema || '');
        setStructuredOutputMapper(initialAgentConfig.agent.structuredOutput?.mapper || '');
        setIntervalInSec(initialAgentConfig.agent.intervalInSec || 3);
        setTranscriptionHistoryMaxChars(initialAgentConfig.agent.transcriptionHistoryMaxChars);
    }, []);
    const doSave = useCallback(() => {
        setChanged(false);
        const initialName = initialAgentConfig.name
        initialAgentConfig = currentAgentConfig;
        invoke<void>('save_agent_config', {
            initialName,
            agentConfig: initialAgentConfig,
        }).catch(e => Events.get().showError(`Failed to save agent config: ${e}`));
    }, [currentAgentConfig]);
    const doDelete = useCallback(async () => {
        await invoke<void>('delete_agent_config', {name});
        await getCurrentWindow().close();
    }, []);

    const [transcriptionHistory, setTranscriptionHistory] = useState<string>('Guest: Hey' +
        '\nHost: Hi' +
        '\nGuest: How are you?' +
        '\nHost: I\'m good, just going to get milk at the grocery store.');
    const [transcription, setTranscription] = useState<string>('Guest: I see.');
    const answerJsonRef = useRef<object | null>(null);
    const answerRef = useRef<string | null>(null);

    const forceRender = useForceRender();
    const [invokeLoading, setInvokeLoading] = useState<boolean>(false);
    const doInvoke = useCallback(async () => {
        try {
            const event = await Prompter.get().invoke(
                transcriptionHistory,
                transcription,
                answerRef.current,
                answerJsonRef.current,
            );
            if (event) {
                setCompiledPrompt(event.prompt)
                answerRef.current = event.answer;
                answerJsonRef.current = event.answerJson;
                forceRender()
            }
        } catch (e) {
            Events.get().showError(`Failed to invoke: ${e}`);
        }
    }, [transcriptionHistory, transcription]);

    // Configure prompter
    useEffect(() => {
        Prompter.get().configureAgent(currentAgentConfig);
    }, [currentAgentConfig]);
    useEffect(() => Prompter.get().start(), []);

    useEffect(() => {
        return Events.get().subscribe('llm-response', (
            event: LlmResponseEvent
        ) => {
            if (event.agentName !== currentAgentConfig.name) {
                return;
            }
            switch (event.type) {
                case 'llm-response':
                    answerRef.current = event.answer;
                    // This also forces a re-render for the answer
                    setTranscription(event.transcriptionLatest)
                    setTranscriptionHistory(event.transcriptionHistory)
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }
        });
    }, [currentAgentConfig.name]);

    return (
        <Box component='main' sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'row',
        }} data-tauri-drag-region="">
            <DivSection data-tauri-drag-region="">
                <TextField
                    variant='standard'
                    sx={{
                        fontSize: 30,
                    }}
                    value={name || ''}
                    onChange={(e) => {
                        const nameSanitized = e.target.value.replace(/[^a-zA-Z0-9-_]/g, '_');
                        setName(nameSanitized);
                        setChanged(true);
                    }}
                />
                <Box sx={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'flex-end',
                }} data-tauri-drag-region="">
                    <Button
                        disabled={!changed}
                        onClick={doSave}
                    >{initialAgentConfig.name === '' ? 'Create' : (initialAgentConfig.name === name ? 'Save' : 'Rename')}</Button>
                    <Box sx={{
                        flexGrow: 1,
                    }}/>
                    <Button
                        color='warning'
                        disabled={!changed || initialAgentConfig.name === ''}
                        onClick={doReset}
                    >Reset</Button>
                    <Button
                        color='error'
                        disabled={initialAgentConfig.name !== name || initialAgentConfig.name === ''}
                        onClick={doDelete}
                    >Delete</Button>
                </Box>

                {/* Prompt edit/view */}
                <Typography variant='h5'>Prompt</Typography>
                <Menu>
                    <Tab label='Edit'>
                        <TextField
                            variant='outlined'
                            multiline
                            fullWidth
                            value={prompt || ''}
                            onChange={(e) => {
                                const newPrompt = e.target.value;
                                setPrompt(newPrompt);
                                setChanged(true);
                            }}
                            rows={20}
                        />
                    </Tab>
                    <Tab label='Result'>
                        <TextField
                            variant='outlined'
                            disabled
                            multiline
                            fullWidth
                            value={compiledPrompt || ''}
                            onChange={(_) => {
                            }}
                            rows={20}
                        />
                    </Tab>
                </Menu>

            </DivSection>
            <DivSection data-tauri-drag-region="">
                <Box display='flex' flexDirection='row' alignItems='center' gap='1em'>
                    <Typography variant='h5'>Structured Output</Typography>
                    <FormControlLabel label='Enable' control={
                        <Checkbox
                            checked={structuredOutputEnabled}
                            onChange={(e) => {
                                setStructuredOutputEnabled(e.target.checked);
                                if (e.target.checked && !structuredOutputSchema) {
                                    setStructuredOutputSchema(JSON.stringify({
                                        $schema: "http://json-schema.org/draft-07/schema#",
                                        type: 'object',
                                        properties: {
                                            firstName: {type: 'string'},
                                            groceryList: {
                                                type: 'array',
                                                items: {
                                                    type: 'string',
                                                },
                                            },
                                        },
                                        required: [
                                            'firstName',
                                            'groceryList',
                                        ],
                                    }, null, 4));
                                }
                                if (e.target.checked && !structuredOutputMapper) {
                                    setStructuredOutputMapper("First Name: {{firstName}}\n" +
                                        "{{#each groceryList}}\n" +
                                        " - {{this}}\n" +
                                        "{{/each}}");
                                }
                                setChanged(true);
                            }}
                        />
                    }/>
                </Box>

                {/* Structured schema/mapper */}
                <Collapse in={structuredOutputEnabled}>
                    <Menu>
                        <Tab label='Schema'>
                            <TextField
                                variant='outlined'
                                multiline
                                fullWidth
                                value={structuredOutputSchema || ''}
                                onChange={(e) => {
                                    setStructuredOutputSchema(e.target.value);
                                    setChanged(true);
                                }}
                                rows={20}
                            />
                        </Tab>
                        <Tab label='Mapper'>
                            <TextField
                                variant='outlined'
                                multiline
                                fullWidth
                                value={structuredOutputMapper || ''}
                                onChange={(e) => {
                                    setStructuredOutputMapper(e.target.value);
                                    setChanged(true);
                                }}
                                rows={20}
                            />
                        </Tab>
                    </Menu>
                </Collapse>
            </DivSection>
            <DivSection data-tauri-drag-region="">
                <Box display='flex' flexDirection='row' alignItems='center' gap='0.5em'>
                    <Typography variant='h5'>
                        Transcription
                    </Typography>
                    <TranscriptionButton popoverDirection='down'/>
                </Box>

                {/* Transcription edit/view */}
                <Menu>
                    <Tab label='Current'>
                        <DivSectionInner>

                            {/* Current transcription view/edit */}
                            <TextField
                                variant='outlined'
                                multiline
                                value={transcription || ''}
                                onChange={(e) => {
                                    setTranscription(e.target.value);
                                }}
                                rows={20}
                            />

                            {/* Interval */}
                            <div>
                                <Typography gutterBottom>Minimum buffering</Typography>
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
                                    }}
                                />
                            </div>

                        </DivSectionInner>
                    </Tab>
                    <Tab label='History'>
                        <DivSectionInner>

                            {/* Transcription history view/edit */}
                            <TextField
                                variant='outlined'
                                multiline
                                value={transcriptionHistory || ''}
                                onChange={(e) => {
                                    setTranscriptionHistory(e.target.value);
                                }}
                                rows={20}
                            />

                            {/* History char count */}
                            <div>
                                <Typography gutterBottom>History size</Typography>
                                <Slider
                                    valueLabelDisplay="auto"
                                    valueLabelFormat={(value) => value === 0
                                        ? 'Disabled'
                                        : (value === MaxSelectableTranscriptionHistoryMaxChars
                                            ? 'Unlimited'
                                            : `${value} chars;\n~${Math.round(value / 5.33)} words;\n~${Math.round(value / 4)} tokens`)}
                                    step={4}
                                    min={0}
                                    max={MaxSelectableTranscriptionHistoryMaxChars}
                                    value={transcriptionHistoryMaxChars === null ? MaxSelectableTranscriptionHistoryMaxChars : transcriptionHistoryMaxChars}
                                    onChange={(_, value) => {
                                        const newTranscriptionHistoryMaxChars = value as number;
                                        if (newTranscriptionHistoryMaxChars === MaxSelectableTranscriptionHistoryMaxChars) {
                                            setTranscriptionHistoryMaxChars(null);
                                        } else {
                                            setTranscriptionHistoryMaxChars(newTranscriptionHistoryMaxChars | 0);
                                            // Truncate history if needed
                                            if (newTranscriptionHistoryMaxChars === 0 && transcriptionHistory.length) {
                                                setTranscriptionHistory('');
                                            } else if (transcriptionHistory.length > (newTranscriptionHistoryMaxChars)) {
                                                setTranscriptionHistory(transcriptionHistory.slice(-newTranscriptionHistoryMaxChars));
                                            }
                                        }
                                        setChanged(true);
                                    }}
                                />
                            </div>

                        </DivSectionInner>
                    </Tab>
                </Menu>

            </DivSection>
            <DivSection data-tauri-drag-region="">
                <Box display='flex' flexDirection='row' alignItems='center' gap='0.5em'>
                    <Typography variant='h5'>Output</Typography>
                    <PrompterButton agentName={currentAgentConfig.name} popoverDirection='down'/>
                </Box>

                <Menu
                    hideTabSelection={structuredOutputEnabled ? undefined : true}
                    activePage={structuredOutputEnabled ? undefined : 'Answer'}
                >
                    <Tab label='Answer'>
                        <TextField
                            variant='outlined'
                            disabled
                            fullWidth
                            multiline
                            value={answerRef.current || ''}
                            rows={20}
                        />
                    </Tab>
                    <Tab label='Structured JSON'>
                        <TextField
                            variant='outlined'
                            disabled
                            fullWidth
                            multiline
                            value={answerJsonRef.current ? JSON.stringify(answerJsonRef.current, null, 4) : ''}
                            rows={20}
                        />
                    </Tab>
                </Menu>
                <Button loading={invokeLoading} variant='contained' onClick={async () => {
                    setInvokeLoading(true)
                    await doInvoke();
                    setInvokeLoading(false)
                }}>Invoke</Button>
            </DivSection>
        </Box>
    );
}

const DivSection = styled("div")({
    margin: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    flexGrow: 1,
    flexBasis: '0',
});

const DivSectionInner = styled("div")({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
});
