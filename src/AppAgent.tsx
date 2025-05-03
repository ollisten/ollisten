import {useEffect, useMemo, useRef, useState} from "react";
import {LlmResponseEvent, Prompter} from "./system/prompter.ts";
import {Events} from "./system/events.ts";
import {AppConfig, getAppConfig, setAppConfigDebounced, useAppConfig} from "./util/useAppConfig.ts";
import {getCurrentWindow} from '@tauri-apps/api/window';
import {Transcription} from "./system/transcription.ts";
import {Box, Collapse, IconButton, Slider, Typography} from "@mui/material";
import {UnlistenFn} from "@tauri-apps/api/event";
import {AgentManager} from "./system/agentManager.ts";
import TranscriptionButton from "./TranscriptionButton.tsx";
import {Close, Edit, History} from "@mui/icons-material";
import PrompterButton from "./PrompterButton.tsx";
import {LlmMessage} from "./LlmMessage.tsx";
import PinOffIcon from "./icon/PinOffIcon.tsx";
import PinIcon from "./icon/PinIcon.tsx";
import {openAgentEdit} from "./agentEditWindow.ts";
import {useForceRender} from "./util/useForceRender.ts";

Transcription.get(); // Required to subscribe to transcription events

export default function AppAgent() {
    const agentConfig = useMemo(() => AgentManager.get()
        .clientGetAgentConfig(), []);
    const [isWindowFocused, setIsWindowFocused] = useState<boolean>(false);
    useEffect(() => {
        getCurrentWindow().isFocused().then(setIsWindowFocused);
    }, []);
    const answersRef = useRef<string[]>([]);
    const answerOffsetRef = useRef<number>(0);
    const forceRender = useForceRender();

    const {loading} = useAppConfig();

    const [taskbarPinned, setTaskbarPinned] = useState<boolean>(false);

    useEffect(() => {
        const getWindowProps = (c: AppConfig): NonNullable<AppConfig['windowProps']>[string] => {
            let props = c.windowProps?.[getCurrentWindow().label];
            if (!props) {
                props = {};
                getAppConfig().windowProps = {
                    ...getAppConfig().windowProps,
                    [getCurrentWindow().label]: props,
                };
            }
            return props;
        }
        const unlistenPromises: Promise<UnlistenFn>[] = [];
        unlistenPromises.push(getCurrentWindow().onFocusChanged(({payload}) => {
            setIsWindowFocused(payload.valueOf());
        }));
        unlistenPromises.push(getCurrentWindow().onMoved(({payload}) => {
            setAppConfigDebounced(c => {
                const props = getWindowProps(c);
                props.x = payload.x;
                props.y = payload.y;
            });
        }));
        unlistenPromises.push(getCurrentWindow().onResized(({payload}) => {
            setAppConfigDebounced(c => {
                const props = getWindowProps(c);
                props.width = payload.width;
                props.height = payload.height;
            });
        }));
        return () => {
            unlistenPromises.forEach(unlistenPromise => unlistenPromise.then(unlisten => unlisten()));
        }
    }, []);

    useEffect(() => {
        return Events.get().subscribe('llm-response', (
            event: LlmResponseEvent
        ) => {
            if (event.agentName !== agentConfig.name) {
                return;
            }
            switch (event.type) {
                case 'llm-response':
                    answersRef.current.unshift(event.answer)
                    forceRender();
                    while (answersRef.current.length > 30) {
                        answersRef.current.pop();
                    }
                    if (answerOffsetRef.current > 0) {
                        answerOffsetRef.current = Math.min(answerOffsetRef.current + 1, answersRef.current.length - 1);
                    }
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }
        });
    }, [agentConfig.name]);

    useEffect(() => {
        Prompter.get().configureAgent(agentConfig);
        Prompter.get().start(true);
    }, [agentConfig]);

    if (loading) {
        return null;
    }

    return (
        <Box component='main' data-tauri-drag-region="" sx={{
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            width: '100vw',
            padding: '1rem',
            maxHeight: '30%',
        }}>
            <div>
                <Collapse in={taskbarPinned || isWindowFocused}>
                    <Box data-tauri-drag-region="" sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                        marginBottom: '0.5rem',
                    }}>
                        <IconButton onClick={() => {
                            getCurrentWindow().close()
                            // Fallback to destroy if close doesn't work
                            setTimeout(() => getCurrentWindow().destroy(), 1000)
                        }}>
                            <Close/>
                        </IconButton>
                        <IconButton size='small' onClick={() => setTaskbarPinned(!taskbarPinned)}>
                            {taskbarPinned ? <PinIcon/> : <PinOffIcon/>}
                        </IconButton>
                        <Box data-tauri-drag-region="" sx={{
                            flexGrow: 1,
                        }}/>
                        <Typography data-tauri-drag-region="" variant='overline'>
                            {agentConfig.name}
                        </Typography>
                        <Box data-tauri-drag-region="" sx={{
                            flexGrow: 1,
                        }}/>
                        <TranscriptionButton popoverDirection='down'/>
                        <PrompterButton agentName={agentConfig.name} popoverDirection='down'/>
                        <IconButton onClick={() => openAgentEdit(agentConfig.name, agentConfig.agent)}>
                            <Edit/>
                        </IconButton>
                    </Box>
                </Collapse>
            </div>
            <Box data-tauri-drag-region="" sx={{
                overflow: 'scroll',
                flexGrow: 1,
            }}>
                <LlmMessage text={answersRef.current[answerOffsetRef.current] || ''}/>
            </Box>
            <div>
                <Collapse in={taskbarPinned || isWindowFocused}>
                    <Box data-tauri-drag-region="" sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                        marginTop: '0.5rem',
                    }}>
                        <Slider
                            sx={{
                                margin: '0 2rem',
                            }}
                            color='primary'
                            track={false}
                            value={answersRef.current.length - answerOffsetRef.current}
                            onChange={(_, value) => {
                                answerOffsetRef.current = answersRef.current.length - (value as number);
                                forceRender();
                            }}
                            valueLabelDisplay='auto'
                            valueLabelFormat={value => {
                                const historyAmount = answersRef.current.length - value;
                                if (historyAmount === 0) {
                                    return 'Current';
                                }
                                return `${historyAmount} answers ago`;
                            }}
                            step={1}
                            marks
                            min={0}
                            max={answersRef.current.length}
                        />
                        <History/>
                    </Box>
                </Collapse>
            </div>
        </Box>
    );
}
