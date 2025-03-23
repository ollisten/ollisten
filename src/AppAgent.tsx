import {makeStyles} from "@mui/styles";
import {useEffect, useState} from "react";
import {LlmResponseEvent, Prompter} from "./system/prompter.ts";
import {SubscriptionManager} from "./system/subscriptionManager.ts";

function App() {
    const classes = useStyles();

    // @ts-ignore
    const [prompt, setPrompt] = useState<string | null>(null);
    const [answer, setAnswer] = useState<string | null>(null);

    useEffect(() => {
        return SubscriptionManager.get().subscribe('llm-response', (
            event: LlmResponseEvent
        ) => {
            switch (event.type) {
                case 'llm-response':
                    setPrompt(event.prompt);
                    setAnswer(event.answer);
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }
        });
    }, []);

    useEffect(() => {
        return Prompter.get().start();
    }, []);

    return (
        <main
            data-tauri-drag-region
            className={classes.root}
        >
            <div
                data-tauri-drag-region
            >
                {answer || ''}
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
        gap: '1rem',
        padding: '1rem',
    },
});

export default App;
