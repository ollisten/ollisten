import {Button} from "@mui/material";
import {Llm} from "./system/llm.ts";
import {Events} from "./system/events.ts";

export function RetryOllamaButton() {
    return (
        <Button
            color='inherit'
            size="small"
            onClick={e => {
                e.preventDefault();
                Llm.get().fetchLlmModelOptions().catch(e => Events.get().showError(`Failed to fetch LLM Model options: ${e}`));
            }}
        >Retry</Button>
    );
}
