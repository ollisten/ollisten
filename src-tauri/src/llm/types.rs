use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LlmModel {
    pub name: String,
    pub description: String,
}
