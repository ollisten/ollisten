import {useCallback, useEffect, useState} from "react";
import Select, {Option} from "./Select.tsx";
import {
    DeviceInputOptionSelectedEvent,
    DeviceInputOptionsUpdatedEvent,
    DeviceOption,
    Transcription
} from "./system/transcription.ts";
import {Events} from "./system/events.ts";
import {makeStyles} from "@mui/styles";

const useStyles = makeStyles({
    root: {
        margin: '1rem',
    },
});

export default function InputDeviceSelect() {

    const classes = useStyles();
    const [options, setOptions] = useState<Option[]>(() => Transcription.get()
        .getInputDeviceOptions()
        .map(mapDeviceToOption));
    const [deviceId, setDeviceId] = useState<string | null>(() => mapDeviceIdToString(Transcription.get()
        .getInputDeviceId()));

    useEffect(() => {
        return Events.get().subscribe([
            'device-input-options-updated',
            'device-input-option-selected',
        ], (
            event: DeviceInputOptionSelectedEvent | DeviceInputOptionsUpdatedEvent
        ) => {
            switch (event.type) {
                case 'device-input-options-updated':
                    setOptions(event.options.map(mapDeviceToOption));
                    break;
                case 'device-input-option-selected':
                    setDeviceId(mapDeviceIdToString(event.option));
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
            label='Input device'
            value={deviceId}
            options={options}
            onSelect={useCallback((newValue: string) => {
                Transcription.get().selectInputDeviceId(parseInt(newValue));
            }, [])}
        />
    );
}

const mapDeviceIdToString = (deviceId: number | null): string | null => (
    deviceId == null ? null : `${deviceId}`
);

const mapDeviceToOption = (device: DeviceOption): Option => ({
    label: device.name,
    value: `${device.id}`,
});
