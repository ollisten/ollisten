use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::ErrorKind;
use std::sync::Mutex;

const CONFIG_FILE: &str = "config.json";

/// Global cache for configuration
static CACHE: Lazy<Mutex<Option<Configuration>>> = Lazy::new(|| Mutex::new(None));

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct System {
    pub id: u32,
    pub description: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Configuration {
    pub name: String,
    pub systems: Vec<System>,
}

impl Default for Configuration {
    fn default() -> Self {
        Configuration {
            name: "default".to_string(),
            systems: vec![],
        }
    }
}

/// Retrieves the configuration, using the cache if available.
/// If the configuration file does not exist, a default configuration is created and saved.
///
/// # Returns
/// A `Result` containing the `Configuration` or an error.
pub fn config_get() -> Result<Configuration, Box<dyn std::error::Error>> {
    let mut cache = CACHE.lock()
        .expect("Configuration cache mutex poisoned - this indicates a critical error in a previous operation");
    if let Some(ref cached_data) = *cache {
        return Ok(cached_data.clone());
    }

    let data = match fs::File::open(CONFIG_FILE) {
        Ok(file) => {
            let reader = std::io::BufReader::new(file);
            serde_json::from_reader(reader)?
        }
        Err(ref e) if e.kind() == ErrorKind::NotFound => {
            let default_config = Configuration::default();
            config_set(&default_config)?;
            default_config
        }
        Err(e) => return Err(Box::new(e)),
    };

    *cache = Some(data.clone());
    Ok(data)
}

/// Saves the provided configuration to disk and updates the global cache.
///
/// # Arguments
/// * `data` - The configuration data to save.
///
/// # Returns
/// A `Result` indicating success or an error.
pub fn config_set(data: &Configuration) -> Result<(), Box<dyn std::error::Error>> {
    let file = fs::File::create(CONFIG_FILE)?;
    let writer = std::io::BufWriter::new(file);
    serde_json::to_writer(writer, data)?;

    let mut cache = CACHE.lock()
        .expect("Configuration cache mutex poisoned - this indicates a critical error in a previous operation");
    *cache = Some(data.clone());
    Ok(())
}
