import {getCurrentWindow} from "@tauri-apps/api/window";
import {Events} from "../system/events.ts";

export async function currentWindowClose() {
    try {
        await getCurrentWindow().close();
    } catch (e) {
        Events.get().showError(`Failed to close window, force closing: ${e}`);
    }
    // Fallback to destroy if close doesn't work
    setTimeout(() => getCurrentWindow().destroy(), 1000)
}
