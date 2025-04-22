// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod lib;
mod transcription;

#[tokio::main]
async fn main() {
    lib::run()
}
