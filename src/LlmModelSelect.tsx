import {useCallback, useEffect, useState} from "react";
import Select, {Option} from "./Select.tsx";
import {Llm, LlmModel} from "./system/llm.ts";
import {formatBytesToString} from "./util/unitConversion.ts";

export default function LlmModelSelect() {

    const [options, setOptions] = useState<Option[]>(() => Llm.get()
        .getLlmModelOptions()
        .map(mapModelToOption));
    const [modelName, setModelName] = useState<string | null>(null);

    useEffect(() => {
        return Llm.get().subscribeLlmModel(event => {
            switch (event.type) {
                case 'llm-model-options-updated':
                    setOptions(event.options
                        .map(mapModelToOption));
                    break;
                case 'llm-model-option-selected':
                    setModelName(event.modelName);
                    break;
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
