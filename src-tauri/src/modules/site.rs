use super::common::{
    ensure_mkcert, get_default_path, is_secured, load_config, save_config, LekStackError,
    ProjectConfig, Result, Site,
};
use std::fs;
use std::os::unix::fs::symlink;
use std::path::PathBuf;
use std::process::Command;

#[tauri::command]
pub fn get_parked_paths() -> Result<Vec<String>> {
    let config = load_config()?;
    Ok(config.parked_paths)
}

pub fn add_parked_path_logic(path: String) -> Result<Vec<String>> {
    let mut config = load_config()?;
    if !config.parked_paths.contains(&path) {
        config.parked_paths.push(path);
        save_config(&config)?;
    }
    Ok(config.parked_paths)
}

#[tauri::command]
pub fn add_parked_path(path: String) -> Result<Vec<String>> {
    add_parked_path_logic(path)
}

pub fn remove_parked_path_logic(path: String) -> Result<Vec<String>> {
    let mut config = load_config()?;
    config.parked_paths.retain(|p| p != &path);
    save_config(&config)?;
    Ok(config.parked_paths)
}

#[tauri::command]
pub fn remove_parked_path(path: String) -> Result<Vec<String>> {
    remove_parked_path_logic(path)
}

pub fn internal_scan_sites() -> Result<Vec<Site>> {
    let config = load_config()?;
    let mut sites = Vec::new();

    // 1. Scan Parked Paths
    for path_str in &config.parked_paths {
        let path = PathBuf::from(path_str);
        if path.exists() {
            if let Ok(entries) = fs::read_dir(&path) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        let p = entry.path();
                        if p.is_dir() {
                            let name = p.file_name().unwrap().to_string_lossy().to_string();
                            // Check for .lekstack.json/yaml or Composer.json?
                            // Default PHP version
                            let mut php_version = "8.2".to_string();

                            // Check .lekstack.json
                            let _proj_conf = p.join(".lekstack.json");

                            // Actually 'load_config' above is for Global.
                            // We need to parse project config here.

                            // Try reading .lekstack/settings.json in project
                            let local_conf = p.join(".lekstack/settings.json");
                            if local_conf.exists() {
                                if let Ok(c) = fs::read_to_string(&local_conf) {
                                    if let Ok(pc) = serde_json::from_str::<ProjectConfig>(&c) {
                                        if let Some(pv) = pc.php {
                                            php_version = pv;
                                        }
                                    }
                                }
                            }

                            // Check secured status
                            let secured = is_secured(&name);

                            sites.push(Site {
                                name: name.clone(),
                                path: p.to_string_lossy().to_string(),
                                url: format!("http://{}.test", name),
                                secured,
                                php_version: php_version, // default
                            });
                        }
                    }
                }
            }
        }
    }

    // 2. Scan Linked Sites (symlinks in ~/.lekstack/valet)
    let valet_dir = get_default_path().join("valet");
    if valet_dir.exists() {
        if let Ok(entries) = fs::read_dir(&valet_dir) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let p = entry.path();
                    // If symlink
                    if p.is_symlink() || p.is_dir() {
                        // Valet makes symlinks
                        let name = p.file_name().unwrap().to_string_lossy().to_string();
                        // Resolve target
                        if let Ok(target) = fs::read_link(&p) {
                            let mut php_version = "8.2".to_string();
                            // Check target for config
                            let local_conf = target.join(".lekstack/settings.json");
                            if local_conf.exists() {
                                if let Ok(c) = fs::read_to_string(&local_conf) {
                                    if let Ok(pc) = serde_json::from_str::<ProjectConfig>(&c) {
                                        if let Some(pv) = pc.php {
                                            php_version = pv;
                                        }
                                    }
                                }
                            }
                            let secured = is_secured(&name);
                            // Avoid duplicates if already found in parked?
                            // Simple check
                            if !sites.iter().any(|s| s.name == name) {
                                sites.push(Site {
                                    name: name.clone(),
                                    path: target.to_string_lossy().to_string(),
                                    url: format!("http://{}.test", name),
                                    secured,
                                    php_version,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(sites)
}

#[tauri::command]
pub fn scan_sites() -> Result<Vec<Site>> {
    Ok(internal_scan_sites()?)
}

pub fn link_site_logic(path: String, name: String) -> Result<String> {
    let base_path = get_default_path();
    let valet_dir = base_path.join("valet");
    if !valet_dir.exists() {
        fs::create_dir_all(&valet_dir).map_err(|e| LekStackError::IoError(e))?;
    }

    let link_path = valet_dir.join(&name);
    let target_path = PathBuf::from(&path);

    if link_path.exists() {
        fs::remove_file(&link_path).ok(); // Remove old link
    }

    symlink(&target_path, &link_path).map_err(|e| LekStackError::IoError(e))?;

    Ok(format!("Linked {} to {}", name, path))
}

#[tauri::command]
pub fn link_site(path: String, name: String) -> Result<String> {
    let res = link_site_logic(path, name)?;
    let _ = refresh_routes();
    Ok(res)
}

pub fn unlink_site_logic(name: String) -> Result<String> {
    let base_path = get_default_path();
    let valet_dir = base_path.join("valet");
    let link_path = valet_dir.join(&name);

    if link_path.exists() {
        fs::remove_file(&link_path).map_err(|e| LekStackError::IoError(e))?;
        Ok(format!("Unlinked {}", name))
    } else {
        Err(LekStackError::RuntimeError("Link not found".to_string()))
    }
}

#[tauri::command]
pub fn unlink_site(name: String) -> Result<String> {
    let res = unlink_site_logic(name)?;
    let _ = refresh_routes();
    Ok(res)
}

#[tauri::command]
pub fn refresh_routes() -> Result<String> {
    let sites = internal_scan_sites()?;
    let base_path = get_default_path();
    let config_dir = base_path.join("config");
    let sites_dir = config_dir.join("sites");

    if !sites_dir.exists() {
        fs::create_dir_all(&sites_dir).map_err(|e| LekStackError::IoError(e))?;
    }

    // Clean up old config files
    if let Ok(entries) = fs::read_dir(&sites_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if let Some(ext) = path.extension() {
                    if ext == "conf" {
                        let _ = fs::remove_file(path);
                    }
                }
            }
        }
    }

    // Generate Nginx Server Blocks
    for site in sites {
        let port = match site.php_version.as_str() {
            "7.4" => 9074,
            "8.0" => 9080,
            "8.1" => 9081,
            "8.2" => 9082,
            "8.3" => 9083,
            "8.4" => 9084,
            "8.5" => 9085,
            _ => 9000,
        };

        // Check for SSL
        let cert_file = config_dir.join("certs").join(format!("{}.pem", site.name));
        let key_file = config_dir
            .join("certs")
            .join(format!("{}-key.pem", site.name));

        let ssl_config = if cert_file.exists() && key_file.exists() {
            format!(
                r#"
    listen 8443 ssl;
    ssl_certificate "{}";
    ssl_certificate_key "{}";
"#,
                cert_file.to_string_lossy(),
                key_file.to_string_lossy()
            )
        } else {
            "".to_string()
        };

        let block = format!(
            r#"server {{
    listen 8080;
    {}
    server_name {}.test;
    root "{}";
    index index.html index.htm index.php;
    charset utf-8;

    location / {{
        try_files $uri $uri/ /index.php?$query_string;
    }}

    location = /favicon.ico {{ access_log off; log_not_found off; }}
    location = /robots.txt  {{ access_log off; log_not_found off; }}

    error_page 404 /index.php;

    location ~ \.php$ {{
        fastcgi_pass 127.0.0.1:{};
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }}

    location ~ /\.(?!well-known).* {{
        deny all;
    }}
}}
"#,
            ssl_config, site.name, site.path, port
        );

        let site_conf_path = sites_dir.join(format!("{}.test.conf", site.name));
        fs::write(&site_conf_path, block).map_err(|e| LekStackError::IoError(e))?;
    }

    // Reload Nginx
    let pid_path = base_path.join("pids").join("nginx.pid");
    if pid_path.exists() {
        let _ = Command::new("kill")
            .arg("-HUP") // Reload signal
            .arg(fs::read_to_string(pid_path).unwrap_or_default().trim())
            .status();
    }

    Ok("Routes refreshed".to_string())
}

#[tauri::command]
pub fn isolate_site(path: String, version: String) -> Result<String> {
    let target = PathBuf::from(&path);
    if !target.exists() {
        return Err(LekStackError::RuntimeError(
            "Path does not exist".to_string(),
        ));
    }

    let settings_dir = target.join(".lekstack");
    if !settings_dir.exists() {
        fs::create_dir_all(&settings_dir).map_err(|e| LekStackError::IoError(e))?;
    }

    let settings_file = settings_dir.join("settings.json");
    let content = serde_json::json!({
        "php": version
    });

    fs::write(
        &settings_file,
        serde_json::to_string_pretty(&content).unwrap(),
    )
    .map_err(|e| LekStackError::IoError(e))?;

    let _ = refresh_routes();
    Ok(format!("Isolated site at {} to PHP {}", path, version))
}

#[tauri::command]
pub async fn secure_site(name: String) -> Result<String> {
    let base_path = get_default_path();
    let certs_dir = base_path.join("config/certs");
    if !certs_dir.exists() {
        fs::create_dir_all(&certs_dir).map_err(|e| LekStackError::IoError(e))?;
    }

    // Ensure mkcert installed
    ensure_mkcert(&base_path).await?; // Await

    let mkcert_bin = base_path.join("bin/mkcert");
    let cert_file = certs_dir.join(format!("{}.pem", name));
    let key_file = certs_dir.join(format!("{}-key.pem", name));

    // mkcert -cert-file ... -key-file ... name.test
    let status = Command::new(&mkcert_bin)
        .arg("-cert-file")
        .arg(&cert_file)
        .arg("-key-file")
        .arg(&key_file)
        .arg(format!("{}.test", name))
        .env("CAROOT", base_path.join("config/rootCA")) // Use custom root location? Or let mkcert handle it
        // mkcert uses default ~/.local/share/mkcert usually.
        // If we want portable, we might play with CAROOT.
        // For now, let it use default.
        .status()
        .map_err(|e| LekStackError::RuntimeError(e.to_string()))?;

    if !status.success() {
        return Err(LekStackError::RuntimeError(
            "Failed to generate cert".to_string(),
        ));
    }

    refresh_routes()?; // Sync nginx
    Ok("Site secured".to_string())
}

#[tauri::command]
pub fn unsecure_site(name: String) -> Result<String> {
    let base_path = get_default_path();
    let certs_dir = base_path.join("config/certs");
    let cert_file = certs_dir.join(format!("{}.pem", name));
    let key_file = certs_dir.join(format!("{}-key.pem", name));

    if cert_file.exists() {
        fs::remove_file(cert_file).ok();
    }
    if key_file.exists() {
        fs::remove_file(key_file).ok();
    }

    refresh_routes()?;
    Ok("Site unsecured".to_string())
}

pub fn init_project_logic(path: String) -> Result<String> {
    let target = PathBuf::from(&path);
    if !target.exists() {
        return Err(LekStackError::RuntimeError("Path not found".to_string()));
    }
    let conf = target.join(".lekstack");
    if !conf.exists() {
        fs::create_dir_all(&conf).map_err(|e| LekStackError::IoError(e))?;
    }
    Ok("Project initialized".to_string())
}

#[tauri::command]
pub fn init_project(path: String) -> Result<String> {
    init_project_logic(path)
}
