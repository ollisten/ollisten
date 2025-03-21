import {makeStyles} from "@mui/styles";
import {useEffect, useState} from "react";
import {AgentWorker} from "./system/agentWorker.ts";
import {Transcription} from "./system/transcription.ts";
import {Llm} from "./system/llm.ts";
import {Prompter} from "./system/prompter.ts";

function App() {
    const classes = useStyles();

    const [prompt, setPrompt] = useState<string | null>(null);
    const [answer, setAnswer] = useState<string | null>(null);

    useEffect(() => {
        return Transcription.get().subscribe(async event => {
            switch (event.type) {
                case 'transcription-data':
                    const prompt = Prompter.get().constructPrompt(event.text);
                    const answer = await Llm.get().talk(prompt);
                    setPrompt(prompt);
                    setAnswer(answer);
                    break;
            }
        });
    }, []);

    return (
        <main
            data-tauri-drag-region
            className={classes.root}
        >
            <p>
                Name: {AgentWorker.get().getName()}
            </p>
            <b>
                Prompt: {prompt}
            </b>
            <p>
                {answer || ''}
            </p>
        </main>
    );
}

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        margin: '1rem',
    },
});

export default App;
