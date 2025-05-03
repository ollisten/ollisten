import {useCallback, useEffect, useState} from "react";
import Select, {Option} from "./Select.tsx";
import {
    DeviceInputOptionSelectedEvent,
    DeviceInputOptionsUpdatedEvent,
    DeviceOption,
    Transcription
} from "./system/transcription.ts";
import {Events} from "./system/events.ts";
import {Box, IconButton} from "@mui/material";
import {Refresh} from "@mui/icons-material";

export default function InputDeviceSelect() {

    const [options, setOptions] = useState<Option[]>(() => Transcription.get()
        .getInputDeviceOptions()
        .map(mapDeviceToOption));
    const refreshOptions = useCallback(() => Transcription.get()
        .fetchInputDevices()
        .catch(e => Events.get().showError(`Failed to refresh input devices: ${e}`)), [])
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
        <Box display="flex">
            <Select
                sx={{
                    margin: '1rem',
                }}
                label='Input device'
                value={deviceId}
                options={options}
                onSelect={useCallback((newValue: string) => {
                    Transcription.get().selectInputDeviceId(parseInt(newValue));
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

const mapDeviceIdToString = (deviceId: number | null): string | null => (
    deviceId == null ? null : `${deviceId}`
);

const mapDeviceToOption = (device: DeviceOption): Option => ({
    label: device.name,
    value: `${device.id}`,
});
