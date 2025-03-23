import {useCallback, useEffect, useState} from "react";
import Select, {Option} from "./Select.tsx";
import {
    DeviceInputOptionSelectedEvent,
    DeviceInputOptionsUpdatedEvent,
    DeviceOption,
    Transcription
} from "./system/transcription.ts";
import {SubscriptionManager} from "./system/subscriptionManager.ts";

export default function InputDeviceSelect() {

    const [options, setOptions] = useState<Option[]>(() => Transcription.get()
        .getInputDeviceOptions()
        .map(mapDeviceToOption));
    const [deviceId, setDeviceId] = useState<string | null>(() => mapDeviceIdToString(Transcription.get().getInputDeviceId()));

    useEffect(() => {
        return SubscriptionManager.get().subscribe([
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
            label='Output device'
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
