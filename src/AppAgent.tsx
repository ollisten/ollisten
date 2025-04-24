import {makeStyles} from "@mui/styles";
import {useEffect, useMemo, useRef, useState} from "react";
import {LlmResponseEvent, Prompter} from "./system/prompter.ts";
import {Events} from "./system/events.ts";
import {AppConfig, getAppConfig, setAppConfigDebounced, useAppConfig} from "./util/useAppConfig.ts";
import {getCurrentWindow} from '@tauri-apps/api/window';
import {Transcription} from "./system/transcription.ts";
import {Collapse, IconButton, Slider, Typography} from "@mui/material";
import {UnlistenFn} from "@tauri-apps/api/event";
import {AgentManager} from "./system/agentManager.ts";
import TranscriptionButton from "./TranscriptionButton.tsx";
import {Close, Edit, History} from "@mui/icons-material";
import PrompterButton from "./PrompterButton.tsx";
import {LlmMessage} from "./LlmMessage.tsx";
import PinOffIcon from "./icon/PinOffIcon.tsx";
import PinIcon from "./icon/PinIcon.tsx";
import {openAgentEdit} from "./agentEditWindow.ts";
import clsx from "clsx";
import {useForceRender} from "./util/useForceRender.ts";

Transcription.get(); // Required to subscribe to transcription events

export default function AppAgent() {
    const classes = useStyles();

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
        <main className={classes.root} data-tauri-drag-region="">
            <div>
                <Collapse in={taskbarPinned || isWindowFocused}>
                    <div className={clsx(classes.actionBar, classes.actionBarTop)} data-tauri-drag-region="">
                        <IconButton onClick={() => getCurrentWindow().close()}>
                            <Close/>
                        </IconButton>
                        <IconButton size='small' onClick={() => setTaskbarPinned(!taskbarPinned)}>
                            {taskbarPinned ? <PinIcon/> : <PinOffIcon/>}
                        </IconButton>
                        <div data-tauri-drag-region="" className={classes.fill}/>
                        <Typography data-tauri-drag-region="" variant='overline'>
                            {agentConfig.name}
                        </Typography>
                        <div data-tauri-drag-region="" className={classes.fill}/>
                        <TranscriptionButton popoverDirection='down'/>
                        <PrompterButton agentName={agentConfig.name} popoverDirection='down'/>
                        <IconButton onClick={() => openAgentEdit(agentConfig.name, agentConfig.agent)}>
                            <Edit/>
                        </IconButton>
                    </div>
                </Collapse>
            </div>
            <div className={classes.output} data-tauri-drag-region="">
                <LlmMessage text={answersRef.current[answerOffsetRef.current] || ''}/>
            </div>
            <div>
                <Collapse in={taskbarPinned || isWindowFocused}>
                    <div className={clsx(classes.actionBar, classes.actionBarBottom)} data-tauri-drag-region="">
                        <Slider
                            className={classes.historySlider}
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
                    </div>
                </Collapse>
            </div>
        </main>
    );
}

const useStyles = makeStyles({
    root: {
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        padding: '1rem',
        maxHeight: '30%',
    },
    output: {
        overflow: 'scroll',
        flexGrow: 1,
    },
    actionBar: {
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
    },
    actionBarTop: {
        marginBottom: '0.5rem',
    },
    actionBarBottom: {
        marginTop: '0.5rem',
    },
    historySlider: {
        margin: '0 2rem',
    },
    fill: {
        flexGrow: 1,
    },
});
