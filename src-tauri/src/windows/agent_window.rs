use tauri::{Manager, WebviewWindow};

#[tauri::command]
pub fn setup_agent_window(handle: tauri::AppHandle, window_label: String) -> Result<(), String> {
    // Find window by name
    let window = handle
        .get_webview_window(&window_label)
        .ok_or(format!("Window not found: {}", window_label))?;

    show_window(&window)?;

    Ok(())
}

fn set_window_color(window: &WebviewWindow, r: f64, g: f64, b: f64, a: f64) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::{NSColor, NSWindow};
        use cocoa::base::{id, nil};

        let ns_window = window
            .ns_window()
            .map_err(|e| format!("Failed to get NSWindow: {}", e))? as id;
        unsafe {
            let bg_color = NSColor::colorWithRed_green_blue_alpha_(nil, r, g, b, a);
            ns_window.setBackgroundColor_(bg_color);
        }
    }
    Ok(())
}

fn show_window(window: &WebviewWindow) -> Result<(), String> {
    window
        .show()
        .map_err(|e| format!("Failed to show window: {}", e))?;

    Ok(())
}
