import {useCallback, useEffect, useState} from "react";
import Select, {Option} from "./Select.tsx";
import {DeviceOption, Transcription} from "./system/transcription.ts";

export default function OutputDeviceSelect() {


    const [option, setOption] = useState<Option | null>(() => mapDeviceToOption(Transcription.get()
        .getOutputDevice()));

    useEffect(() => {
        return Transcription.get().subscribe((event) => {
            switch (event.type) {
                case 'device-output-updated':
                    setOption(mapDeviceToOption(event.option));
                    break;
            }
        });
    }, []);

    return (
        <Select
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
