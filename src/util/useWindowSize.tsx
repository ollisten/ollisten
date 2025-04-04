import {useCallback} from "react";
import {getCurrentWindow, LogicalSize} from "@tauri-apps/api/window";

export default function useWindowSize() {
    return useCallback((size: { width?: number, height?: number }) => {
        getCurrentWindow().innerSize().then(currentSize => {
            getCurrentWindow().setSize(new LogicalSize(
                size.width || currentSize.width,
                size.height || currentSize.height,
            ));
        });
    }, []);
}
