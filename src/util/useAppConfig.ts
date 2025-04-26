import {useEffect} from 'react';
import {invoke} from "@tauri-apps/api/core";
import {Events} from "../system/events.ts";
import {useForceRender} from "./useForceRender.ts";
import debounce from "./debounce.ts";

export type AppConfig = Partial<{
    windowProps: {
        [windowLabel: string]: Partial<{
            x: number;
            y: number;
            width: number;
            height: number;
        }>
    };
    modes: {
        [modeId: string]: {
            label: string;
            agents: string[];
        }
    };
    selectedLlmModelName: string;
    selectedInputDeviceName: string;
    selectedTranscriptionModelName: string;
}>;

export type AppConfigChangedEvent = {
    type: 'app-config-changed',
    config: AppConfig,
}
const emitAppConfig = async () => {
    const appConfigChangedEvent: AppConfigChangedEvent = {
        type: 'app-config-changed',
        config: appConfig!,
    };
    await Events.get().send(appConfigChangedEvent);
}
export type AppConfigSetter = (ac: AppConfig) => void;

let loading = true;
let appConfig: AppConfig = {};
(async () => {
    try {
        appConfig = JSON.parse(await invoke<string>('read_app_config'));
    } catch (e) {
        Events.get().showError(`Failed to read app config: ${e}`);
    }
    if (typeof appConfig !== 'object') {
        appConfig = {};
    }
    loading = false;
    await emitAppConfig();
    Events.get().subscribe('app-config-changed', (event: AppConfigChangedEvent) => {
        console.log("App config changed", event.config);
        appConfig = event.config; // Refresh config
    });
})();

export const getAppConfig = (): AppConfig => {
    return appConfig;
}
export const setAppConfig = async (setter: AppConfigSetter) => {
    if (loading) {
        return;
    }
    setter(appConfig);
    await emitAppConfig();
    await invoke<string>('set_app_config', {
        appConfig: JSON.stringify(appConfig, null, 2),
    });
}
export const setAppConfigDebounced = debounce(setAppConfig, 500);
export const useAppConfig = (): {
    loading: boolean;
    appConfig: AppConfig;
    setAppConfig: (setter: AppConfigSetter) => void;
    setAppConfigDebounced: (setter: AppConfigSetter) => Promise<void>;
} => {
    const forceRender = useForceRender();
    useEffect(() => {
        return Events.get().subscribe(['app-config-changed'], (_: AppConfigChangedEvent) => {
            forceRender(); // Refresh config
        });
    }, []);
    return {
        loading,
        appConfig: getAppConfig(), // Will be refreshed on change event
        setAppConfig,
        setAppConfigDebounced,
    }
}
