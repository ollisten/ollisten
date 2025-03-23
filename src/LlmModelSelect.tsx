import {useCallback, useEffect, useState} from "react";
import Select, {Option} from "./Select.tsx";
import {Llm, LlmModel, LlmModelOptionSelectedEvent, LlmModeloptionsUpdatedEvent} from "./system/llm.ts";
import {formatBytesToString} from "./util/unitConversion.ts";
import {SubscriptionManager} from "./system/subscriptionManager.ts";

export default function LlmModelSelect() {

    const [options, setOptions] = useState<Option[]>(() => Llm.get()
        .getLlmModelOptions()
        .map(mapModelToOption));
    const [modelName, setModelName] = useState<string | null>(null);

    useEffect(() => {
        return SubscriptionManager.get().subscribe([
            'llm-model-option-selected', 'llm-model-options-updated',
        ], (event: LlmModelOptionSelectedEvent | LlmModeloptionsUpdatedEvent) => {
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
    label: `${model.name} (${formatBytesToString(model.size)})`,
    value: model.name,
})
