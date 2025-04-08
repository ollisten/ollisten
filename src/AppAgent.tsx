import {makeStyles} from "@mui/styles";
import {useEffect, useMemo, useState} from "react";
import {LlmResponseEvent, Prompter} from "./system/prompter.ts";
import {Events} from "./system/events.ts";
import {AppConfig, getAppConfig, setAppConfigDebounced, useAppConfig} from "./util/useAppConfig.ts";
import {getCurrentWindow} from '@tauri-apps/api/window';
import {Transcription} from "./system/transcription.ts";
import {Collapse, IconButton, Typography} from "@mui/material";
import {UnlistenFn} from "@tauri-apps/api/event";
import {AgentManager} from "./system/agentManager.ts";
import TranscriptionButton from "./TranscriptionButton.tsx";
import {Close} from "@mui/icons-material";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TimeAgo from "react-timeago";
import PrompterButton from "./PrompterButton.tsx";


Transcription.get(); // Required to subscribe to transcription events

export default function AppAgent() {
    const classes = useStyles();

    const agentConfig = useMemo(() => AgentManager.get()
        .clientGetAgentConfig(), []);
    const [isWindowFocused, setIsWindowFocused] = useState<boolean>(false);
    useEffect(() => {
        getCurrentWindow().isFocused().then(setIsWindowFocused);
    }, []);
    const [answer, setAnswer] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const {loading} = useAppConfig();

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
            switch (event.type) {
                case 'llm-response':
                    setAnswer(event.answer);
                    setLastUpdated(new Date());
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }
        });
    }, []);

    useEffect(() => {
        Prompter.get().configureAgent(agentConfig.agent);
        Prompter.get().start(agentConfig.name);
    }, [agentConfig]);

    if (loading) {
        return null;
    }

    return (
        <main className={classes.root} data-tauri-drag-region="">
            <div className={classes.output} data-tauri-drag-region="">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer || ''}</ReactMarkdown>
            </div>
            <Collapse in={isWindowFocused}>
                <hr className={classes.hr}/>
                <div className={classes.actionBar} data-tauri-drag-region="">
                    <IconButton color='error' onClick={() => getCurrentWindow().close()}>
                        <Close/>
                    </IconButton>
                    <TranscriptionButton popoverDirection='right'/>
                    <PrompterButton popoverDirection='right' />
                    <div data-tauri-drag-region="" className={classes.fill}/>
                    <Typography variant='overline'>
                        {agentConfig.name}
                    </Typography>
                    <div data-tauri-drag-region="" className={classes.fill}/>
                    {lastUpdated && <TimeAgo date={lastUpdated}/>}
                </div>
            </Collapse>
        </main>
    );
}

const useStyles = makeStyles({
    root: {
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        minWidth: '100vw',
        padding: '1rem',
        overflow: 'scroll',
        maxHeight: '30%',
    },
    output: {
        overflow: 'scroll',
        flexGrow: 1,
    },
    actionBar: {
        display: 'flex',
        alignItems: 'center',
    },
    fill: {
        flexGrow: 1,
    },
    hr: {
        margin: '1rem 0',
    },
});
