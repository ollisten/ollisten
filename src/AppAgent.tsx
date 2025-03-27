import {makeStyles} from "@mui/styles";
import {useEffect, useState} from "react";
import {LlmResponseEvent, Prompter} from "./system/prompter.ts";
import {Events} from "./system/events.ts";
import {AppConfig, getAppConfig, setAppConfigDebounced, useAppConfig} from "./util/useAppConfig.ts";
import {getCurrentWindow} from '@tauri-apps/api/window';
import {Transcription} from "./system/transcription.ts";
import {Button, Collapse} from "@mui/material";
import {UnlistenFn} from "@tauri-apps/api/event";




Transcription.get(); // Required to subscribe to transcription events

export default function AppAgent() {
    const classes = useStyles();

    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);
    const [isDebug, setIsDebug] = useState<boolean>(false);
    const [transcription, setTranscription] = useState<string | null>(null);
    const [answer, setAnswer] = useState<string | null>(null);

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
                    setTranscription(event.transcriptionLatest);
                    setAnswer(event.answer);
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }
        });
    }, []);

    useEffect(() => {
        return Prompter.get().start(true);
    }, []);

    if (loading) {
        return null;
    }

    return (
        <main className={classes.root} data-tauri-drag-region="">
            <Collapse in={isDebug}>
                <div data-tauri-drag-region="">
                    {transcription || ''}
                    <hr className={classes.hr} />
                </div>
            </Collapse>
            <div className={classes.output} data-tauri-drag-region="">
                {answer || ''}
            </div>
            <Collapse in={isWindowFocused}>
                <div className={classes.actionBar} data-tauri-drag-region="">
                    <Button onClick={() => {
                        if (isPaused) {
                            Prompter.get().resume();
                            setIsPaused(false);
                        } else {
                            Prompter.get().pause();
                            setIsPaused(true);
                        }
                    }}>
                        {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <div data-tauri-drag-region="" className={classes.fill}/>
                    <Button color='warning' onClick={() => {
                        setIsDebug(!isDebug)
                    }}>
                        Debug
                    </Button>
                    <Button color='error' onClick={() => {
                        getCurrentWindow().destroy()
                    }}>
                        Close
                    </Button>
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
        height: '100vh',
        width: '100vw',
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
    },
    fill: {
        flexGrow: 1,
    },
    hr: {
        margin: '1rem 0',
    },
});
