import {Button} from "@mui/material";
import {Llm} from "./system/llm.ts";

export function RetryOllamaButton() {
    return (
        <Button
            color='inherit'
            size="small"
            onClick={e => {
                e.preventDefault();
                Llm.get().fetchLlmModelOptions().catch(console.error);
            }}
        >Retry</Button>
    );
}
