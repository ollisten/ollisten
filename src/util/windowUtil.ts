import {getCurrentWindow, Window} from "@tauri-apps/api/window";
import {Events} from "../system/events.ts";

export async function currentWindowCloseSafely() {
    await windowCloseSafely(getCurrentWindow())
}

export async function windowCloseSafely(window: Window) {
    try {
        await window.close();
    } catch (e) {
        Events.get().showError(`Failed to close window: ${e}`);
    }
    // Fallback to destroy if close doesn't work
    return new Promise<void>((resolve) => {
        setTimeout(async () => {
            try {
                await window.destroy();
            } catch (e) {
                // Likely window was already closed
            }
            resolve();
        }, 700)
    })
}
