import {useCallback, useEffect, useState} from "react";
import Select, {Option} from "./Select.tsx";
import {DeviceOption, DeviceOutputUpdatedEvent, Transcription} from "./system/transcription.ts";
import {Events} from "./system/events.ts";
import {Box, IconButton} from "@mui/material";
import {Refresh} from "@mui/icons-material";

export default function OutputDeviceSelect() {
    const [option, setOption] = useState<Option | null>(() => mapDeviceToOption(Transcription.get()
        .getOutputDevice()));
    const refreshOptions = useCallback(() => Transcription.get()
        .fetchOutputDevice()
        .catch(e => Events.get().showError(`Failed to refresh output device: ${e}`)), [])

    useEffect(() => {
        return Events.get().subscribe('device-output-updated', (
            event: DeviceOutputUpdatedEvent
        ) => {
            switch (event.type) {
                case 'device-output-updated':
                    setOption(mapDeviceToOption(event.option));
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
                label='Output device'
                value={option?.value ?? null}
                options={option === null ? [] : [option]}
                onSelect={useCallback(_ => {
                    // There is no selection as we only have one output device and it auto-selects
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

const mapDeviceToOption = (device: DeviceOption | null): Option | null => (
    device == null ? null : {
        label: device.name,
        value: `${device.id}`,
    }
);
