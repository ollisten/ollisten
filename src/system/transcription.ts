import {Channel, invoke} from "@tauri-apps/api/core";
import {formatBytesToString} from "../util/unitConversion.ts";

export type Event = {
    type: 'status-change';
    status: Status;
} | {
    type: 'loading-progress';
    progressStr: string;
} | {
    type: 'transcription-model-options-updated';
    options: string[];
} | {
    type: 'transcription-model-option-selected';
    option: string;
} | {
    type: 'device-input-options-updated';
    options: DeviceOption[];
} | {
    type: 'device-input-option-selected';
    option: number;
} | {
    // There is no selection, so whatever we get, we select automatically
    type: 'device-output-updated';
    option: DeviceOption | null;
} | {
    type: 'transcription-data';
    text: string;
} | {
    type: 'error';
    msg: string;
}

export type DeviceOption = {
    name: string;
    id: number;
}

export enum Status {
    Starting,
    ModelDownloading,
    ModelLoading,
    TranscriptionStarted,
    Stopping,
    Stopped
}

export type Listener = (event: Event) => void;
export type Unsubscribe = () => void;

type SessionEvent = {
    event: 'DownloadProgress';
    data: {
        source: string;
        size: number; // total size
        progress: number; // Downloaded size
    };
} | {
    event: 'LoadingProgress';
    data: {
        progress: number; // From 0 to 1
    };
} | {
    event: 'TranscriptionStarted';
    data: {
        deviceName: string;
    };
} | {
    event: 'TranscriptionData';
    data: {
        deviceId: number,
        text: string,
        confidence: number,
    };
} | {
    event: 'Error';
    data: {
        message: string,
    };
} | {
    event: 'Stopped';
};

export class Transcription {

    private static instance: Transcription | null = null
    private readonly listeners: Set<Listener> = new Set();
    private readonly sessionChannel = new Channel<SessionEvent>();
    private readonly subscriberName = Math.random().toString(36).substring(7);

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

    private status: Status = Status.Stopped;

    public getStatus(): Status {
        return this.status;
    }

    public setStatus(newStatus: Status) {
        this.status = newStatus;
        this.onEvent({type: 'status-change', status: newStatus});
    }

    private async subscribeTranscription() {
        this.sessionChannel.onmessage = sessionEvent => this.onSessionEvent(sessionEvent);
        try {
            await invoke('transcription_subscribe', {
                sessionChannel: this.sessionChannel,
                subscriberName: this.subscriberName,
            });
        } catch (err) {
            this.onError(`Failed to subscribe to transcription events: ${err}`);
        }
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
                return;
        }

        if (!this.validateStart().valid) {
            return;
        }

        await this.startTranscription();
    }

    private validateStart(): {
        valid: true,
        deviceIds: number[],
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
        const deviceIds = [];
        if (this.deviceInputId !== null) {
            deviceIds.push(this.deviceInputId);
        }
        if (this.deviceOutput !== null) {
            deviceIds.push(this.deviceOutput.id);
        }
        if (!deviceIds.length) {
            return {
                valid: false,
                error: 'No devices to listen to',
            };
        }
        return {
            valid: true,
            deviceIds,
        }
    }

    public async startTranscription() {
        let startData = this.validateStart();
        if (!startData.valid) {
            this.onError(startData.error);
            return;
        }
        this.setStatus(Status.Starting);
        try {
            await invoke('start_transcription', {
                modelType: this.transcriptionModelName,
                deviceIds: startData.deviceIds,
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
                this.selectTranscriptionModelName(response[0]);
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
    }

    /*
     * Input devices
     */

    private deviceInputOptions: DeviceOption[] = [];
    private deviceInputId: number | null = null;

    private async fetchInputDevices() {
        try {
            const response = await invoke<DeviceOption[]>("get_listen_device_options");
            console.log('Recv get_listen_device_options', response);
            if (response.length === 0) {
                this.onError('No microphone/input devices available');
                return;
            }
            this.deviceInputOptions = response;
            this.onEvent({type: 'device-input-options-updated', options: response});
            if (this.deviceInputId == null || this.deviceInputOptions.findIndex(o => o.id === this.deviceInputId) === -1) {
                this.selectInputDeviceId(response[0].id);
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
    }

    /*
     * Output device
     */

    private deviceOutput: DeviceOption | null = null;

    private async fetchOutputDevice() {
        try {
            const response = await invoke<DeviceOption>("get_hidden_device");
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

    /*
     * Utility methods
     */

    public subscribe(listener: Listener): Unsubscribe {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        }
    }

    private onError(message: string) {
        this.onEvent({type: 'error', msg: message});
    }

    private onEvent(event: Event) {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (e) {
                console.error('Error in error handler', e);
                if (event.type !== 'error') {
                    this.onError(`Failed processing event ${event.type}: ${e}`);
                }
            }
        });
    }

    private onSessionEvent(event: SessionEvent) {
        switch (event.event) {
            case "DownloadProgress":
                if (this.getStatus() !== Status.ModelDownloading) {
                    this.setStatus(Status.ModelDownloading);
                }
                this.onEvent({
                    type: 'loading-progress',
                    progressStr: `Downloaded: ${formatBytesToString(event.data.progress)} / ${formatBytesToString(event.data.size)}`
                });
                break;
            case "LoadingProgress":
                if (this.getStatus() !== Status.ModelLoading) {
                    this.setStatus(Status.ModelLoading);
                }
                this.onEvent({
                    type: 'loading-progress',
                    progressStr: `Loaded: ${Math.round(event.data.progress * 100)}%`
                });
                break;
            case "TranscriptionStarted":
                this.setStatus(Status.TranscriptionStarted);
                break;
            case "Stopped":
                this.setStatus(Status.Stopped);
                break;
            case "TranscriptionData":
                this.onEvent({
                    type: 'transcription-data',
                    text: event.data.text,
                })
                break;
            case "Error":
                console.error('Received transcription error', event.data.message);
                break;
            default:
                break;
        }
    }
}
