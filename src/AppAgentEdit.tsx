import {Transcription} from "./system/transcription.ts";
import {AgentConfig, AgentManager} from "./system/agentManager.ts";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
    Box,
    Button,
    Checkbox,
    Collapse,
    FormControlLabel,
    IconButton,
    Link,
    Slider,
    SxProps,
    TextField,
    Theme,
    Typography
} from "@mui/material";
import {invoke} from "@tauri-apps/api/core";
import {Events} from "./system/events.ts";
import {LlmResponseEvent, Prompter} from "./system/prompter.ts";
import {useForceRender} from "./util/useForceRender.ts";
import TranscriptionButton from "./TranscriptionButton.tsx";
import Menu, {Tab} from "./Menu.tsx";
import PrompterButton from "./PrompterButton.tsx";
import {Help} from "@mui/icons-material";
import {currentWindowClose} from "./util/windowUtil.ts";

Transcription.get(); // Required to subscribe to transcription events
let initialAgentConfig: AgentConfig = AgentManager.get().clientGetAgentConfig();

const MaxSelectableTranscriptionHistoryMaxChars = 3000;

const SectionStyle: SxProps<Theme> = {
    margin: '1rem',
    flex: '1 1 0',
};
const SectionInnerStyle: SxProps<Theme> = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
};

export default function AppAgentEdit() {
    const [changed, setChanged] = useState<boolean>(false);
    const [name, setName] = useState<string>(initialAgentConfig.name);
    const [prompt, setPrompt] = useState<string>(initialAgentConfig.agent.prompt);
    const [compiledPrompt, setCompiledPrompt] = useState<string>('Invoke to see output.');
    const [intervalInSec, setIntervalInSec] = useState<number>(initialAgentConfig.agent.intervalInSec || 3);
    const [transcriptionHistoryMaxChars, setTranscriptionHistoryMaxChars] = useState<number | null>(initialAgentConfig.agent.transcriptionHistoryMaxChars);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
    const [helpOpenPrompt, setHelpOpenPrompt] = useState<boolean>(false);
    const [helpOpenStructuredOutput, setHelpOpenStructuredOutput] = useState<boolean>(false);
    const [helpOpenTranscription, setHelpOpenTranscription] = useState<boolean>(false);
    const [helpOpenOutput, setHelpOpenOutput] = useState<boolean>(false);
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
        try {
            await invoke<void>('delete_agent_config', {name});
        } catch (e) {
            Events.get().showError(`Failed to delete: ${e}`);
            return;
        }
        await currentWindowClose()
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
            flexDirection: 'column',
            alignItems: 'stretch',
        }} data-tauri-drag-region="">

            <Box sx={{
                margin: '1rem',
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end',
            }} data-tauri-drag-region="">
                <TextField
                    variant='standard'
                    inputProps={{
                        sx: {
                            fontSize: 30,
                        }
                    }}
                    value={name || ''}
                    onChange={(e) => {
                        const nameSanitized = e.target.value.replace(/[^a-zA-Z0-9-_]/g, '_');
                        setName(nameSanitized);
                        setChanged(true);
                    }}
                />
                <Button
                    disabled={!changed}
                    onClick={doSave}
                >{initialAgentConfig.name === '' ? 'Create' : (initialAgentConfig.name === name ? 'Save' : 'Rename')}</Button>
                <Button
                    color='warning'
                    disabled={!changed || initialAgentConfig.name === ''}
                    onClick={doReset}
                >Reset</Button>
                <Button
                    color='error'
                    disabled={initialAgentConfig.name !== name || initialAgentConfig.name === ''}
                    onClick={() => {
                        if (!deleteDialogOpen) {
                            setDeleteDialogOpen(true);
                        } else {
                            setDeleteDialogOpen(false);
                            doDelete()
                        }
                    }}
                >{!deleteDialogOpen ? 'Delete' : 'Are you sure to delete?'}</Button>
                <Box sx={{
                    flexGrow: 1,
                }}/>
            </Box>
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
            }} data-tauri-drag-region="">
                <Box sx={SectionStyle} data-tauri-drag-region="">
                    {/* Prompt edit/view */}
                    <Typography variant='h5'>
                        <Box display='flex' flexDirection='row' alignItems='center' gap={1}>
                            Prompt
                            <IconButton size='small'
                                        onClick={() => setHelpOpenPrompt(!helpOpenPrompt)}><Help/></IconButton>
                        </Box>
                    </Typography>
                    <Typography variant='body1'>
                        Create prompt template sent to LLM. Uses&nbsp;
                        <Link href='https://handlebarsjs.com' target='_blank'>Handlebars syntax</Link>
                        .
                    </Typography>
                    <Collapse in={helpOpenPrompt}>
                        <Typography variant='h6'>Available variables:</Typography>
                        <pre>{
                            'transcription: {\n' +
                            '  all: "...",\n' +
                            '  latest: "..."\n' +
                            '},\n' +
                            'answer: {\n' +
                            '  previous: {\n' +
                            '    text: "answer"\n' +
                            '    json: { ... }\n' +
                            '  },\n' +
                            '}'
                        }</pre>
                        <Typography variant='body1'>Previous answer JSON only available if Structured output is
                            enabled.</Typography>
                        <Typography variant='h6'>Available custom functions:</Typography>
                        <ul>
                            <li>
                                <code>json_stringify</code>{' Calls JSON.stringify, commonly used as {{json answer.previous.json}}'}
                            </li>
                        </ul>
                        <Typography variant='h6'>Common usages:</Typography>
                        <ul>
                            <li><code>{'{{ json answer.previous.json }}'}</code> Previous answer as JSON string</li>
                            <li><code>{'{{ transcription.latest }}'}</code> Most recent transcription</li>
                            <li><code>{'{{ transcription.all }}'}</code> All stored transcription</li>
                        </ul>
                    </Collapse>
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

                </Box>
                <Box sx={SectionStyle} data-tauri-drag-region="">
                    <Box display='flex' flexDirection='row' alignItems='center' gap='1em'>
                        <Box display='flex' flexDirection='row' alignItems='center' gap={1}>
                            <Typography variant='h5'>Structured Output</Typography>
                            <IconButton size='small'
                                        onClick={() => setHelpOpenStructuredOutput(!helpOpenStructuredOutput)}><Help/></IconButton>
                        </Box>
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

                    <Typography variant='body1'>
                        Structured output forces LLM to output its answer in the provided <Link
                        href='https://json-schema.org/' target='_blank'>JSON Schema</Link> which you can map into the
                        final answer.
                    </Typography>

                    {/* Structured schema/mapper */}
                    <Collapse in={helpOpenStructuredOutput}>
                        <div>
                            <Typography variant='body1'>In this mode, LLM will abide by your schema and the raw JSON
                                output
                                can be seen under the <b>Output</b> {'->'} <b>Structured Json</b> section.</Typography>
                            <Typography variant='body1'>From this LLM JSON output, you need to define
                                a <b>Mapper</b> that
                                will convert this JSON into the final Answer output shown to the user.</Typography>
                            <Typography variant='body1'>The Mapper also uses&nbsp;
                                <Link href='https://handlebarsjs.com' target='_blank'>Handlebars syntax</Link>
                                . It has access to the raw JSON output from LLM as Handlebars variables.
                            </Typography>
                            <Typography variant='h6'>Example Schema</Typography>
                            <Typography variant='body1'>
                                The following will output an optional <code>detectedIssue</code> and a
                                mandatory <code>followUpQuestions</code>. It's best to explain what these mean in the
                                prompt.
                            </Typography>
                            <pre>{
                                '{\n' +
                                '    "type": "object",\n' +
                                '    "properties": {\n' +
                                '        "detectedIssue": {\n' +
                                '            "type": "string"\n' +
                                '        },\n' +
                                '        "followUpQuestions": {\n' +
                                '            "type": "array",\n' +
                                '            "items": {\n' +
                                '                "type": "string"\n' +
                                '            }\n' +
                                '        }\n' +
                                '    },\n' +
                                '    "required": [\n' +
                                '        "followUpQuestions"\n' +
                                '    ]\n' +
                                '}'
                            }</pre>
                            <Typography variant='h6'>Example Mapper</Typography>
                            <Typography variant='body1'>
                                The following will use the schema above and output follow up questions in a list. If the
                                list is not empty, it will print QUESTIONS preceding the list. It will then print out
                                the
                                detected issue if it exists.
                            </Typography>
                            <pre>{
                                '{{#each followUpQuestions}}\n' +
                                '{{#if @first}}\n' +
                                'QUESTIONS:\n' +
                                '{{/if}}\n' +
                                ' - {{this}}\n' +
                                '{{/each}}\n' +
                                '{{#detectedIssue}}\n' +
                                'ISSUE: {{this}}\n' +
                                '{{/detectedIssue}}\n'
                            }</pre>
                        </div>
                    </Collapse>
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
                </Box>
                <Box sx={SectionStyle} data-tauri-drag-region="">
                    <Box display='flex' flexDirection='row' alignItems='center' gap={1}>
                        <Typography variant='h5'>Transcription</Typography>
                        <IconButton size='small'
                                    onClick={() => setHelpOpenTranscription(!helpOpenTranscription)}><Help/></IconButton>
                        <TranscriptionButton popoverDirection='down'/>
                    </Box>

                    <Typography variant='body1'>View stored transcription of your input audio.</Typography>
                    <Collapse in={helpOpenTranscription}>
                        <div>
                            <Typography variant='body1'>
                                Shows the most recently transcribed audio available
                                via <code>{'{{transcription.latest}}'}</code> while all history is
                                in <code>{'{{transcription.all}}'}</code>.
                            </Typography>
                        </div>
                    </Collapse>

                    {/* Transcription edit/view */}
                    <Menu>
                        <Tab label='Latest'>
                            <Box sx={SectionInnerStyle}>

                                {/* Latest transcription view/edit */}
                                <TextField
                                    variant='outlined'
                                    multiline
                                    value={transcription || ''}
                                    onChange={(e) => {
                                        setTranscription(e.target.value);
                                    }}
                                    rows={20}
                                />

                            </Box>
                        </Tab>
                        <Tab label='History'>
                            <Box sx={SectionInnerStyle}>

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

                            </Box>
                        </Tab>

                        {/* Interval */}
                        <div>
                            <Typography variant='h6' gutterBottom>Minimum buffering</Typography>
                            <Collapse in={helpOpenTranscription}>
                                <Typography variant='body1' gutterBottom>Each new buffered transcription will contain
                                    audio
                                    for at least this amount of time.</Typography>
                            </Collapse>
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

                        {/* History char count */}
                        <div>
                            <Typography variant='h6'>History size</Typography>
                            <Collapse in={helpOpenTranscription}>
                                <Typography variant='body1' gutterBottom>Truncates all history up to this
                                    amount.</Typography>
                            </Collapse>
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
                    </Menu>

                </Box>
                <Box sx={SectionStyle} data-tauri-drag-region="">
                    <Box display='flex' flexDirection='row' alignItems='center' gap='0.5em'>
                        <Typography variant='h5'>Output</Typography>
                        <IconButton size='small' onClick={() => setHelpOpenOutput(!helpOpenOutput)}><Help/></IconButton>
                        <PrompterButton agentName={currentAgentConfig.name} popoverDirection='down'/>
                    </Box>

                    <Typography variant='body1'>View LLM output.</Typography>
                    <Collapse in={helpOpenOutput}>
                        <div>
                            <Typography variant='body1'>The <b>Answer</b> contains the final displayed output as shown
                                to
                                the user.</Typography>
                            <Typography variant='body1'>The <b>Structured JSON</b> contains the raw JSON output from LLM
                                which is pre-defined by the JSON schema. You can use this data in the Structured Output
                                Mapper to construct the Answer</Typography>
                        </div>
                    </Collapse>

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
                </Box>
            </Box>
        </Box>
    );
}
