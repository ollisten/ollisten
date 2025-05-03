import {useCallback, useEffect, useState} from "react";
import Select, {Option} from "./Select.tsx";
import {Llm, LlmModel, LlmModelOptionSelectedEvent, LlmModelOptionsUpdatedEvent} from "./system/llm.ts";
import {Events} from "./system/events.ts";
import {Box, IconButton} from "@mui/material";
import {Refresh} from "@mui/icons-material";

export default function LlmModelSelect() {

    const [options, setOptions] = useState<Option[]>(() => Llm.get()
        .getLlmModelOptions()
        .map(mapModelToOption));
    const refreshOptions = useCallback(() => Llm.get()
        .fetchLlmModelOptions()
        .catch(e => Events.get().showError(`Failed to refresh LLM Model options: ${e}`)), [])
    const [modelName, setModelName] = useState<string | null>(() => Llm.get()
        .getLlmModelName());

    useEffect(() => {
        return Events.get().subscribe([
            'llm-model-option-selected', 'llm-model-options-updated',
        ], (event: LlmModelOptionSelectedEvent | LlmModelOptionsUpdatedEvent) => {
            switch (event.type) {
                case 'llm-model-options-updated':
                    setOptions(event.options
                        .map(mapModelToOption));
                    break;
                case 'llm-model-option-selected':
                    setModelName(event.modelName);
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
            }
        });
    }, []);

    return (
        <Box display="flex">
            <Select
                sx={{
                    margin: '1rem',
                }}
                label='LLM Model'
                value={modelName}
                options={options}
                onSelect={useCallback((newValue: string) => {
                    Llm.get().selectLlmModelName(newValue);
                }, [])}
            />
            <Box flex='0 1 auto' display='flex' alignItems='center' justifyContent='center' marginRight={2}>
                <IconButton size='large' onClick={refreshOptions}>
                    <Refresh/>
                </IconButton>
            </Box>
        </Box>
    );
}

const mapModelToOption = (model: LlmModel) => ({
    label: `${model.name} ${model.description}`,
    value: model.name,
})
