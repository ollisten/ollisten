import {useCallback, useEffect, useState} from "react";
import Select, {Option} from "./Select.tsx";
import {Transcription} from "./system/transcription.ts";

export default function TranscriptionModelSelect() {

    const [options, setOptions] = useState<Option[]>(() => Transcription.get()
        .getTranscriptionModelOptions()
        .map(mapModelToOption));
    const [modelName, setModelName] = useState<string | null>(() => Transcription.get().getTranscriptionModelName());

    useEffect(() => {
        return Transcription.get().subscribe((event) => {
            switch (event.type) {
                case 'transcription-model-options-updated':
                    setOptions(event.options.map(mapModelToOption));
                    break;
                case 'transcription-model-option-selected':
                    setModelName(event.option);
                    break;
            }
        });
    }, []);

    return (
        <Select
            label='Transcription Model'
            value={modelName}
            options={options}
            onSelect={useCallback((newValue: string) => {
                Transcription.get().selectTranscriptionModelName(newValue);
            }, [])}
        />
    );
}

const mapModelToOption = (modelName: string) => ({
    label: modelName,
    value: modelName,
})
