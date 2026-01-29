use log::{info, warn};
use serde::{Deserialize, Serialize};
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;
use std::process::Command;
use tauri::ipc::InvokeError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum LekStackError {
    #[error("IO Error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("JSON Error: {0}")]
    JsonError(#[from] serde_json::Error),
    #[error("Runtime Error: {0}")]
    RuntimeError(String),
    #[error("Service Error: {0}")]
    ServiceError(String),
    #[error("Validation Error: {0}")]
    ValidationError(String),
    #[error("Reqwest Error: {0}")]
    ReqwestError(#[from] reqwest::Error),
}

impl From<String> for LekStackError {
    fn from(err: String) -> Self {
        LekStackError::RuntimeError(err)
    }
}

impl From<&str> for LekStackError {
    fn from(err: &str) -> Self {
        LekStackError::RuntimeError(err.to_string())
    }
}

impl From<LekStackError> for InvokeError {
    fn from(err: LekStackError) -> Self {
        InvokeError::from(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, LekStackError>;

// Helper to get default path
pub fn get_default_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    PathBuf::from(home).join(".lekstack")
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppConfig {
    pub parked_paths: Vec<String>,
}

#[derive(Serialize, Debug)]
pub struct Site {
    pub name: String,
    pub path: String,
    pub url: String,
    pub secured: bool,
    pub php_version: String,
}

#[derive(Serialize, Deserialize)]
pub struct ServiceConfig {
    pub port: u16,
}

#[derive(Serialize)]
pub struct DbUser {
    pub username: String,
    pub host: String,
}

#[derive(Deserialize, Debug)]
pub struct ProjectConfig {
    pub php: Option<String>,
}

pub fn is_secured(name: &str) -> bool {
    let base_path = get_default_path();
    let cert = base_path.join("config/certs").join(format!("{}.pem", name));
    cert.exists()
}

pub fn load_config() -> Result<AppConfig> {
    let config_path = get_default_path().join("config").join("settings.json");

    if !config_path.exists() {
        info!("Creating default config");
        let default_config = AppConfig {
            parked_paths: Vec::new(),
        };
        save_config(&default_config)?;
        return Ok(default_config);
    }

    let content = fs::read_to_string(&config_path).map_err(|e| LekStackError::IoError(e))?;

    let config: AppConfig =
        serde_json::from_str(&content).map_err(|e| LekStackError::JsonError(e))?;

    validate_config(&config)?;

    Ok(config)
}

pub fn save_config(config: &AppConfig) -> Result<()> {
    validate_config(config)?;

    let config_path = get_default_path().join("config").join("settings.json");
    fs::create_dir_all(config_path.parent().unwrap()).map_err(|e| LekStackError::IoError(e))?;

    fs::write(&config_path, serde_json::to_string_pretty(config)?)
        .map_err(|e| LekStackError::IoError(e))?;

    info!("Config saved successfully");
    Ok(())
}

pub fn validate_config(config: &AppConfig) -> Result<()> {
    // Validate parked paths
    for path in &config.parked_paths {
        if path.is_empty() {
            return Err(LekStackError::ValidationError(
                "Parked path cannot be empty".to_string(),
            ));
        }
        if !PathBuf::from(path).exists() {
            warn!("Parked path does not exist: {}", path);
            // Don't fail, just warn
        }
    }

    Ok(())
}

pub fn get_service_port_value(name: &str) -> u16 {
    let base_path = get_default_path();
    let config_path = base_path.join("config/services.json");

    // Default ports mapping
    let default_port = match name {
        "nginx" => 8080,
        "mariadb" => 3306,
        "postgresql" => 5432,
        "redis" => 6379,
        "node" => 3000,
        "bun" => 3001,
        "php-7.4" => 9074,
        "php-8.0" => 9080,
        "php-8.1" => 9081,
        "php-8.2" => 9082,
        "php-8.3" => 9083,
        "php-8.4" => 9084,
        "php-8.5" => 9085,
        _ => {
            // Dynamic PHP version fallback
            if name.starts_with("php-") {
                9000
            } else {
                0
            }
        }
    };

    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(service_conf) = json.get(name) {
                    if let Some(port) = service_conf.get("port") {
                        if let Some(p) = port.as_u64() {
                            return p as u16;
                        }
                    }
                }
            }
        }
    }
    default_port
}

pub async fn ensure_mkcert(base_path: &PathBuf) -> Result<()> {
    let bin_dir = base_path.join("bin");
    let mkcert_bin = bin_dir.join("mkcert");

    if !mkcert_bin.exists() {
        println!("Downloading mkcert...");
        let status = Command::new("curl")
            .arg("-L")
            .arg("-o")
            .arg(&mkcert_bin)
            .arg("https://dl.filippo.io/mkcert/latest?for=linux/amd64")
            .status()
            .map_err(|e| LekStackError::RuntimeError(e.to_string()))?;

        if !status.success() {
            return Err(LekStackError::RuntimeError(
                "Failed to download mkcert".to_string(),
            ));
        }

        // Make executable
        let mut perms = fs::metadata(&mkcert_bin)
            .map_err(|e| LekStackError::RuntimeError(e.to_string()))?
            .permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&mkcert_bin, perms)
            .map_err(|e| LekStackError::RuntimeError(e.to_string()))?;
    }
    Ok(())
}
