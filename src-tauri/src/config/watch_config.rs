use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc::channel;

fn main() {
    // Create a channel to receive events
    let (tx, rx) = channel();

    // Create a watcher instance
    let mut watcher = RecommendedWatcher::new(tx).expect("Failed to create watcher");

    // Specify the path and mode to watch
    watcher
        .watch(Path::new("./"), RecursiveMode::Recursive)
        .expect("Failed to watch path");

    println!("Watching for file changes...");

    // Handle events in a loop
    for res in rx {
        match res {
            Ok(event) => println!("Change detected: {:?}", event),
            Err(e) => eprintln!("Watch error: {:?}", e),
        }
    }
}
