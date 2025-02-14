import {useEffect} from "react";
import {useColorScheme} from "@mui/material";
import {Window} from '@tauri-apps/api/window';

export const ColorSchemeListener = () => {

    // Subscribe to dark/light mode changes
    const {setMode} = useColorScheme();
    useEffect(() => {
        Window.getCurrent().theme().then((systemMode) =>
            setMode(systemMode || 'light'));
        const unlistenPromise = Window.getCurrent().onThemeChanged((e) =>
            setMode(e.payload || 'light'));
        return () => {
            unlistenPromise.then(unlisten => unlisten())
        };
    }, [setMode]);

    return null;
};
