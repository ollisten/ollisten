import {useCallback, useEffect, useState} from "react";
import Select, {Option} from "./Select.tsx";
import {
    Transcription,
    TranscriptionModelOptionSelectedEvent,
    TranscriptionModelOptionsUpdatedEvent
} from "./system/transcription.ts";
import {Events} from "./system/events.ts";
import {makeStyles} from "@mui/styles";

const useStyles = makeStyles({
    root: {
        margin: '1rem',
    },
});

export default function TranscriptionModelSelect() {

    const classes = useStyles();
    const [options, setOptions] = useState<Option[]>(() => Transcription.get()
        .getTranscriptionModelOptions()
        .map(mapModelToOption));
    const [modelName, setModelName] = useState<string | null>(() => Transcription.get().getTranscriptionModelName());

    useEffect(() => {
        return Events.get().subscribe([
            'transcription-model-options-updated',
            'transcription-model-option-selected',
        ], (
            event: TranscriptionModelOptionSelectedEvent | TranscriptionModelOptionsUpdatedEvent
        ) => {
            switch (event.type) {
                case 'transcription-model-options-updated':
                    setOptions(event.options.map(mapModelToOption));
                    break;
                case 'transcription-model-option-selected':
                    setModelName(event.option);
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }
        });
    }, []);

    return (
        <Select
            className={classes.root}
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
