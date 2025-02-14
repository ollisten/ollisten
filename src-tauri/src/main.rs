// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod session_event;
mod whisper;

#[tokio::main]
async fn main() {
    nitra_lib::run()
}
