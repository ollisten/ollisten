use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Agent {
    pub name: String,
    pub prompt: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    pub agents: Vec<Agent>,
}

pub fn get_config() -> Result<Config, String> {
    // Determine the path to the config file
    let home_dir =
        dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    let config_dir = home_dir.join(".localecho");
    let config_path = config_dir.join("agents.yaml");

    // Create the directory if it doesn't exist
    if !config_dir.exists() {
        std::fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    // Check if the config file exists
    if !config_path.exists() {
        // Create a default empty config
        let default_config = Config { agents: Vec::new() };

        // Serialize and write to file
        let yaml = serde_yaml::to_string(&default_config)
            .map_err(|e| format!("Failed to serialize default config: {}", e))?;

        std::fs::write(&config_path, yaml)
            .map_err(|e| format!("Failed to write default config: {}", e))?;
    }

    // Read and parse the config file
    let config_str = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: Config = serde_yaml::from_str(&config_str)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    Ok(config)
}
