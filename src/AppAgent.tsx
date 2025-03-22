import {makeStyles} from "@mui/styles";
import {useEffect, useState} from "react";
import {Prompter} from "./system/prompter.ts";

function App() {
    const classes = useStyles();

    // @ts-ignore
    const [prompt, setPrompt] = useState<string | null>(null);
    const [answer, setAnswer] = useState<string | null>(null);

    useEffect(() => {
        Prompter.get().start(llmResponse => {
            setPrompt(llmResponse.prompt);
            setAnswer(llmResponse.answer);
        });
        return () => Prompter.get().stop();
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
