import {invoke} from "@tauri-apps/api/core";
import {Events} from "./events.ts";
import {getAppConfig, setAppConfig} from "../util/useAppConfig.ts";
import {randomUuid} from "../util/idUtil.ts";

export type DeviceOption = {
    name: string;
    id: number;
}

export enum DeviceSource {
    Host,
    Guest,
}

export enum Status {
    Starting,
    ModelDownloading,
    ModelLoading,
    TranscriptionStarted,
    Stopping,
    Stopped,
    Unknown,
}

export type Listener = (event: Event) => void;
export type Unsubscribe = () => void;

/*
 * Rust events
 */
export type DownloadProgressEvent = {
    type: 'TranscriptionDownloadProgress';
    source: string;
    size: number; // total size
    progress: number; // Downloaded size
};
export type LoadingProgressEvent = {
    type: 'TranscriptionLoadingProgress';
    progress: number; // From 0 to 1
};
export type TranscriptionStartedEvent = {
    type: 'TranscriptionStarted';
    deviceName: string;
};
export type TranscriptionDataEvent = {
    type: 'TranscriptionData';
    deviceId: number,
    text: string,
    confidence: number,
};
export type ErrorEvent = {
    type: 'TranscriptionError';
    message: string,
};
export type StoppedEvent = {
    type: 'TranscriptionStopped';
};

/*
 * Our internal events
 */
export type StatusChangeEvent = {
    type: 'status-change';
    status: Status;
};
export type TranscriptionModelOptionSelectedEvent = {
    type: 'transcription-model-option-selected';
    option: string;
};
export type TranscriptionModelOptionsUpdatedEvent = {
    type: 'transcription-model-options-updated';
    options: string[];
};
export type DeviceInputOptionSelectedEvent = {
    type: 'device-input-option-selected';
    option: number;
};
export type DeviceInputOptionsUpdatedEvent = {
    type: 'device-input-options-updated';
    options: DeviceOption[];
};
export type DeviceOutputUpdatedEvent = {
    // There is no selection, so whatever we get, we select automatically
    type: 'device-output-updated';
    option: DeviceOption | null;
};

export class Transcription {

    private static instance: Transcription | null = null
    private unsubscribe: Unsubscribe | null = null;
    private readonly subscriberName = randomUuid();

    static get = () => {
        if (!Transcription.instance) {
            Transcription.instance = new Transcription();
        }
        return Transcription.instance;
    }

    private constructor() {
        this.initialize();
    }

    private async initialize() {
        try {
            await this.subscribeTranscription();
            await Promise.all([
                this.fetchTranscriptionModel(),
                this.fetchInputDevices(),
                this.fetchOutputDevice(),
            ]);
        } catch (err) {
            this.onError(`Failed to initialize transcription: ${err}`);
        }
    }

    public async shutdown() {
        try {
            await this.unsubscribeTranscription();
            this.onError("Transcription shutdown");
        } catch (err) {
            this.onError(`Failed to shutdown transcription: ${err}`);
        }
    }

    /*
     * State management
     */

    private status: Status = Status.Unknown;

    public getStatus(): Status {
        return this.status;
    }

    public setStatus(newStatus: Status) {
        this.status = newStatus;
        this.onEvent({type: 'status-change', status: newStatus});
    }

    private async subscribeTranscription() {
        if (this.unsubscribe) {
            return; // Already subscribed
        }

        // Setup event handler
        const unsubscribeEventHandler = Events.get().subscribe([
            'TranscriptionDownloadProgress', 'TranscriptionLoadingProgress', 'TranscriptionStarted', 'TranscriptionData', 'TranscriptionStopped'
        ], (
            event: DownloadProgressEvent | LoadingProgressEvent | TranscriptionDataEvent | TranscriptionStartedEvent | ErrorEvent | StoppedEvent
        ) => {
            switch (event.type) {
                case "TranscriptionDownloadProgress":
                    if (this.getStatus() !== Status.ModelDownloading) {
                        this.setStatus(Status.ModelDownloading);
                    }
                    break;
                case "TranscriptionLoadingProgress":
                    if (this.getStatus() !== Status.ModelLoading) {
                        this.setStatus(Status.ModelLoading);
                    }
                    break;
                case "TranscriptionStarted":
                case "TranscriptionData":
                    this.setStatus(Status.TranscriptionStarted);
                    break;
                case "TranscriptionStopped":
                    this.setStatus(Status.Stopped);
                    break;
                default:
                    console.error(`Unexpected event`, event);
                    break;
            }
        });

        this.unsubscribe = () => {
            unsubscribeEventHandler();
        };
    }

    private async unsubscribeTranscription() {
        try {
            await invoke('transcription_unsubscribe', {
                subscriberName: this.subscriberName,
            });
        } catch (err) {
            this.onError(`Failed to unsubscribe to transcription events: ${err}`);
        }
    }

    public async restartTranscriptionIfRunning() {
        switch (this.status) {
            case Status.Stopping:
            case Status.Stopped:
            case Status.Unknown:
                return;
        }

        if (!this.canStart().valid) {
            return;
        }

        await this.startTranscription();
    }

    public canStart(): {
        valid: true,
        deviceIdHost: number | null,
        deviceIdGuest: number | null,
    } | {
        valid: false,
        error: string,
    } {
        if (this.transcriptionModelName === null) {
            return {
                valid: false,
                error: 'No transcription model selected',
            };
        }
        if (this.deviceInputId === null
            && this.deviceOutput === null) {
            return {
                valid: false,
                error: 'No devices to listen to',
            };
        }
        return {
            valid: true,
            deviceIdGuest: this.deviceOutput?.id || null,
            deviceIdHost: this.deviceInputId,
        }
    }

    public isRunning() {
        switch (this.getStatus()) {
            case Status.Stopping:
            case Status.Stopped:
            case Status.Unknown:
                return false;
            default:
                return true;
        }
    }

    public async startTranscription() {
        let startData = this.canStart();
        if (!startData.valid) {
            this.onError(startData.error);
            return;
        }
        this.setStatus(Status.Starting);
        try {
            await invoke('start_transcription', {
                modelType: this.transcriptionModelName,
                deviceIds: [
                    ...(startData.deviceIdHost ? [startData.deviceIdHost] : []),
                    ...(startData.deviceIdGuest ? [startData.deviceIdGuest] : []),
                ],
            });
        } catch (e) {
            this.onError(`Failed to start transcription: ${e}`);
        }
    }

    public async stopTranscription() {
        this.setStatus(Status.Stopping);
        try {
            await invoke("stop_transcription");
        } catch (err) {
            this.onError(`Failed to stop transcription: ${err}`);
        }
    }

    public deviceIdToSource(deviceId: number): DeviceSource {
        if (this.deviceOutput?.id === deviceId) {
            return DeviceSource.Guest;
        }
        return DeviceSource.Host;
    }

    /*
     * Transcription Model options
     */

    private transcriptionModelOptions: string[] = [];
    private transcriptionModelName: string | null = null;

    private async fetchTranscriptionModel() {
        try {
            const response = await invoke<string[]>("list_available_transcription_models");
            console.log('Recv list_available_transcription_models', response);
            if (response.length === 0) {
                this.onError('No Transcription models available');
                return;
            }
            this.transcriptionModelOptions = response;
            this.onEvent({type: 'transcription-model-options-updated', options: response});
            if (this.transcriptionModelName == null || !this.transcriptionModelOptions.includes(this.transcriptionModelName)) {
                var chosenNewName: string | undefined = undefined;

                // Chose one from config if available
                const nameFromConfig = getAppConfig().selectedTranscriptionModelName;
                if (nameFromConfig && response.includes(nameFromConfig)) {
                    chosenNewName = nameFromConfig;
                }

                // Otherwise choose first on from the options
                if (!chosenNewName) {
                    chosenNewName = response[0]
                }

                this.selectTranscriptionModelName(chosenNewName);
            }
        } catch (e) {
            this.onError(`Failed to get Transcription model options: ${e}`);
        }
    }

    public getTranscriptionModelOptions(): string[] {
        return this.transcriptionModelOptions;
    }

    public getTranscriptionModelName(): string | null {
        return this.transcriptionModelName;
    }

    public selectTranscriptionModelName(newTranscriptionModelName: string): void {
        this.transcriptionModelName = newTranscriptionModelName;
        this.restartTranscriptionIfRunning();
        this.onEvent({type: 'transcription-model-option-selected', option: newTranscriptionModelName});
        setAppConfig(c => c.selectedTranscriptionModelName = newTranscriptionModelName);
    }

    /*
     * Input devices
     */

    private deviceInputOptions: DeviceOption[] = [];
    private deviceInputId: number | null = null;

    public async fetchInputDevices() {
        try {
            const response = await invoke<DeviceOption[]>("get_listen_device_options");
            console.log('Recv get_listen_device_options', response);
            if (response.length === 0) {
                this.onError('No microphone/input devices available');
                return;
            }
            this.deviceInputOptions = response;
            this.onEvent({type: 'device-input-options-updated', options: response});
            if (this.deviceInputId == null || !this.deviceInputOptions.some(o => o.id === this.deviceInputId)) {
                var chosenNewId: number | undefined = undefined;

                // Chose one from config if available
                const deviceNameFromConfig = getAppConfig().selectedInputDeviceName;
                if (deviceNameFromConfig) {
                    chosenNewId = response.find(o => o.name === deviceNameFromConfig)?.id;
                }

                // Otherwise choose first on from the options
                if (!chosenNewId) {
                    chosenNewId = response[0].id
                }

                this.selectInputDeviceId(chosenNewId);
            }
        } catch (e) {
            this.onError(`Failed to get microphone/input devices: ${e}`);
        }
    }

    public getInputDeviceOptions(): DeviceOption[] {
        return this.deviceInputOptions;
    }

    public getInputDeviceId(): number | null {
        return this.deviceInputId;
    }

    public selectInputDeviceId(newId: number): void {
        this.deviceInputId = newId;
        this.restartTranscriptionIfRunning();
        this.onEvent({type: 'device-input-option-selected', option: newId});

        const deviceName = this.getInputDeviceOptions().find(o => o.id === newId)?.name;
        setAppConfig(c => c.selectedInputDeviceName = deviceName);
    }

    /*
     * Output device
     */

    private deviceOutput: DeviceOption | null = null;

    public async fetchOutputDevice() {
        try {
            const response = await invoke<DeviceOption | null>("get_hidden_device");
            console.log('Recv get_hidden_device', response);
            this.selectOutputDevice(response);
            this.onEvent({type: 'device-output-updated', option: response});
        } catch (e) {
            this.onError(`Failed to find output device: ${e}`);
        }
    }

    public getOutputDevice(): DeviceOption | null {
        return this.deviceOutput;
    }

    private selectOutputDevice(newOutputDevice: DeviceOption | null) {
        this.deviceOutput = newOutputDevice;
        this.restartTranscriptionIfRunning();
    }

    onEvent(event: StatusChangeEvent | TranscriptionModelOptionSelectedEvent | TranscriptionModelOptionsUpdatedEvent | DeviceInputOptionSelectedEvent | DeviceOutputUpdatedEvent | DeviceInputOptionsUpdatedEvent) {
        Events.get().send(event);
    }

    onError(message: string) {
        Events.get().sendInternal<ErrorEvent>({
            type: 'TranscriptionError',
            message: message,
        });
    }
}
