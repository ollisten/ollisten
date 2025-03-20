import {useCallback, useEffect, useState} from "react";
import Select, {Option} from "./Select.tsx";
import {Llm, LlmModel} from "./system/llm.ts";
import {useAlerts} from "./util/useAlerts.tsx";
import {formatBytesToString} from "./util/unitConversion.ts";

export default function LlmModelSelect() {

    const {beginProcessing} = useAlerts();
    const [options, setOptions] = useState<Option[]>([]);
    // TODO This should be inside Llm.ts, not here
    const [modelName, setModelName] = useState<string | null>(null);

    useEffect(() => {
        const {onSuccess, onError} = beginProcessing();
        Llm.getModels().then(models => {
            onSuccess({content: 'Loaded LLM models'});
            setOptions(models.map(mapModelToOption));
            if (models.length > 0) {
                setModelName(models[0].name);
            }
        }).catch(err => {
            onError({content: 'Failed to load LLM models'});
        });
    }, []);

    return (
        <Select
            label='LLM Model'
            value={modelName}
            options={options}
            onSelect={useCallback((newValue: string) => {
                setModelName(newValue);
            }, [])}
        />
    );
}

const mapModelToOption = (model: LlmModel) => ({
    label: `${model.name} (${formatBytesToString(model.size)})`,
    value: model.name,
})
