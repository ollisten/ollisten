import {useCallback, useEffect, useState} from "react";
import Select, {Option} from "./Select.tsx";
import {DeviceOption, DeviceOutputUpdatedEvent, Transcription} from "./system/transcription.ts";
import {Events} from "./system/events.ts";
import {makeStyles} from "@mui/styles";

const useStyles = makeStyles({
    root: {
        margin: '1rem',
    },
});

export default function OutputDeviceSelect() {

    const classes = useStyles();
    const [option, setOption] = useState<Option | null>(() => mapDeviceToOption(Transcription.get()
        .getOutputDevice()));

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
        <Select
            className={classes.root}
            label='Output device'
            value={option?.value ?? null}
            options={option === null ? [] : [option]}
            onSelect={useCallback(_ => {
                // There is no selection as we only have one output device and it auto-selects
            }, [])}
        />
    );
}

const mapDeviceToOption = (device: DeviceOption | null): Option | null => (
    device == null ? null : {
        label: device.name,
        value: `${device.id}`,
    }
);
