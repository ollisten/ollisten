import {useCallback, useEffect, useState} from "react";
import Select, {Option} from "./Select.tsx";
import {Llm, LlmModel, LlmModelOptionSelectedEvent, LlmModelOptionsUpdatedEvent} from "./system/llm.ts";
import {Events} from "./system/events.ts";

export default function LlmModelSelect() {

    const [options, setOptions] = useState<Option[]>(() => Llm.get()
        .getLlmModelOptions()
        .map(mapModelToOption));
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
    );
}

const mapModelToOption = (model: LlmModel) => ({
    label: `${model.name} ${model.description}`,
    value: model.name,
})
