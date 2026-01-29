use super::common::get_default_path;
use super::site::add_parked_path_logic;
use futures_util::StreamExt;
use std::fs;
use std::io::Write;
use std::os::unix::fs::symlink;
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;
use std::process::Command;
use tauri::{Emitter, Window};

#[tauri::command]
pub fn get_install_path() -> String {
    get_default_path().to_string_lossy().to_string()
}

#[tauri::command]
pub fn init_environment() -> Result<String, String> {
    let base_path = get_default_path();
    let dirs = vec!["bin", "config", "logs", "pids", "valet", "versions", "data"];

    for dir in dirs {
        let p = base_path.join(dir);
        if !p.exists() {
            fs::create_dir_all(&p).map_err(|e| e.to_string())?;
        }
    }

    // Create user-friendly projects directory in Home
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let projects_dir = PathBuf::from(home).join("LekStack/Web");
    if !projects_dir.exists() {
        fs::create_dir_all(&projects_dir).map_err(|e| e.to_string())?;
        let _ = fs::write(
            projects_dir.join("index.php"),
            "<?php echo '<h1>Welcome to LekStack</h1><p>This file is located at ~/LekStack/Web/index.php</p>'; phpinfo(); ?>",
        );
    }

    // Auto-park the new projects directory if not already parked
    add_parked_path_logic(projects_dir.to_string_lossy().to_string());

    Ok(base_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn list_installed_versions(runtime: &str) -> Vec<String> {
    let base_path = get_default_path().join("versions").join(runtime);
    let mut versions = Vec::new();

    if base_path.exists() {
        if let Ok(entries) = fs::read_dir(&base_path) {
            for entry in entries {
                if let Ok(entry) = entry {
                    if let Ok(ft) = entry.file_type() {
                        if ft.is_dir() {
                            if let Ok(name) = entry.file_name().into_string() {
                                if !name.starts_with('.') {
                                    versions.push(name);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    versions.sort();
    versions
}

#[tauri::command]
pub async fn install_runtime(
    window: Window,
    runtime: String,
    version: String,
) -> Result<String, String> {
    println!("Installing {} v{}", runtime, version);
    let base_path = get_default_path();
    let version_path = base_path.join("versions").join(&runtime).join(&version);

    if version_path.exists() {
        return Ok("Version already installed".to_string());
    }
    fs::create_dir_all(&version_path).map_err(|e| e.to_string())?;

    let downloads = match runtime.as_str() {
        "node" => vec![
            (format!("https://github.com/taweechai/lekstack-binaries/releases/download/v1.0.0/node-v20.11.0-linux-x64.tar.xz"), "archive.tar.xz")
        ],
        "bun" => vec![
            (format!("https://github.com/taweechai/lekstack-binaries/releases/download/v1.0.0/bun-v1.0.0-linux-x64.zip"), "archive.zip")
        ],
        "php" => {
            // Use GitHub Actions pre-built binaries with real PHP-FPM
            // Build these using: .github/workflows/build-php.yml
            // Updated: January 2026 - Latest patch versions
            let (download_version, short_ver) = match version.as_str() {
                "8.2" => ("8.2.30", "8.2"),  // Security support only (until Dec 2026)
                "8.3" => ("8.3.30", "8.3"),  // Recommended - LTS (until Dec 2027)
                "8.4" => ("8.4.17", "8.4"),  // Latest Stable (until Dec 2028)
                "8.5" => ("8.5.2", "8.5"),   // Bleeding Edge (until Dec 2029)
                _ => ("8.3.30", "8.3"),      // Default to 8.3 (most stable)
            };
            
            // For PHP 8.5, use static-php-cli as fallback until GitHub Actions build is available
            if version == "8.5" {
                vec![
                    (format!("https://github.com/crazywhalecc/static-php-cli/releases/download/2.7.8/php-{}-cli-linux-x86_64.tar.gz", download_version), "php-cli.tar.gz"),
                    (format!("https://github.com/crazywhalecc/static-php-cli/releases/download/2.7.8/php-{}-micro-linux-x86_64.tar.gz", download_version), "php-micro.tar.gz")
                ]
            } else {
                // Download CLI and FPM separately for better efficiency
                vec![
                    (format!("https://github.com/taweechai/LekStack/releases/download/php-{}/php-{}-cli-linux-x86_64.tar.gz", download_version, download_version), "php-cli.tar.gz"),
                    (format!("https://github.com/taweechai/LekStack/releases/download/php-{}/php-{}-fpm-linux-x86_64.tar.gz", download_version, download_version), "php-fpm.tar.gz")
                ]
            }
        },
        "nginx" => {
            let (download_url, archive_name) = match version.as_str() {
                "1.27.2" => ("https://github.com/godmaycrying/nginx_binaries_for_linux/releases/download/1.27.2/nginx-1.27.2-binary.tar.gz".to_string(), "archive.tar.gz"),
                "1.27.1" => ("https://github.com/godmaycrying/nginx_binaries_for_linux/releases/download/1.27.1/1.27.1.tar.gz".to_string(), "archive.tar.gz"),
                "1.26.2" => ("https://github.com/godmaycrying/nginx_binaries_for_linux/releases/download/1.26.2/1.26.2.tar.gz".to_string(), "archive.tar.gz"),
                "1.26.1" => ("https://github.com/godmaycrying/nginx_binaries_for_linux/releases/download/1.26.1/nginx-1.26.1.tar.gz".to_string(), "archive.tar.gz"),
                _ => ("https://github.com/godmaycrying/nginx_binaries_for_linux/releases/download/1.27.2/nginx-1.27.2-binary.tar.gz".to_string(), "archive.tar.gz"),
            };
            vec![(download_url, archive_name)]
        },
        "mariadb" => vec![
            ("https://github.com/taweechai/lekstack-binaries/releases/download/v1.0.0/mariadb-11.4.4-linux-systemd-x86_64.tar.gz".to_string(), "mariadb.tar.gz")
        ],
        "postgresql" => vec![
            ("https://github.com/taweechai/lekstack-binaries/releases/download/v1.0.0/postgresql-16.2-linux-amd64.jar".to_string(), "postgres.jar")
        ],
        "redis" => vec![
            ("https://github.com/taweechai/lekstack-binaries/releases/download/v1.0.0/redis-7.4.1-linux-amd64.jar".to_string(), "redis.jar")
        ],
        _ => return Err("Unsupported runtime".to_string()),
    };

    for (url, archive_name) in downloads {
        println!("Downloading {}...", url);
        let archive_path = version_path.join(archive_name);

        let client = reqwest::Client::new();
        let res = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("Download failed: HTTP {}", res.status()));
        }

        let total_size = res.content_length().unwrap_or(0);
        let mut file = fs::File::create(&archive_path).map_err(|e| e.to_string())?;
        let mut downloaded: u64 = 0;
        let mut stream = res.bytes_stream();

        while let Some(item) = stream.next().await {
            let chunk = item.map_err(|e| e.to_string())?;
            file.write_all(&chunk).map_err(|e| e.to_string())?;
            downloaded += chunk.len() as u64;
            let _ = window.emit("download_progress", serde_json::json!({
                "current": downloaded,
                "total": total_size,
                "percent": if total_size > 0 { (downloaded as f64 / total_size as f64) * 100.0 } else { 0.0 }
            }));
        }

        let _ = window.emit(
            "download_progress",
            serde_json::json!({ "current": 100, "total": 100, "percent": 100.0 }),
        );

        println!("Extracting {}...", archive_name);

        let extract_status = if archive_name.ends_with(".zip") {
            Command::new("unzip")
                .arg(&archive_path)
                .arg("-d")
                .arg(&version_path)
                .status()
        } else if archive_name.ends_with(".jar") {
            let unzip_status = Command::new("unzip")
                .arg(&archive_path)
                .arg("-d")
                .arg(&version_path)
                .status();
            if !unzip_status.map_err(|e| e.to_string())?.success() {
                return Err("Failed to unzip jar".to_string());
            }

            // Find txz
            let mut txz_file = None;
            if let Ok(entries) = fs::read_dir(&version_path) {
                for entry in entries {
                    if let Ok(e) = entry {
                        if let Some(name) = e.file_name().to_str() {
                            if name.ends_with(".txz") {
                                txz_file = Some(e.path());
                                break;
                            }
                        }
                    }
                }
            }

            if let Some(txz) = txz_file {
                Command::new("tar")
                    .arg("-xf")
                    .arg(&txz)
                    .arg("-C")
                    .arg(&version_path)
                    .status()
            } else if runtime == "redis" {
                // Redis specific jar logic
                let bin_dir = version_path.join("bin");
                fs::create_dir_all(&bin_dir).ok();
                if version_path.join("redis-server-7.4.1-linux-amd64").exists() {
                    fs::rename(
                        version_path.join("redis-server-7.4.1-linux-amd64"),
                        bin_dir.join("redis-server"),
                    )
                    .ok();
                }
                if version_path.join("redis-cli-7.4.1-linux-amd64").exists() {
                    fs::rename(
                        version_path.join("redis-cli-7.4.1-linux-amd64"),
                        bin_dir.join("redis-cli"),
                    )
                    .ok();
                }
                // +x
                if bin_dir.join("redis-server").exists() {
                    let mut perms = fs::metadata(bin_dir.join("redis-server"))
                        .unwrap()
                        .permissions();
                    perms.set_mode(0o755);
                    fs::set_permissions(bin_dir.join("redis-server"), perms).ok();
                }
                if bin_dir.join("redis-cli").exists() {
                    let mut perms = fs::metadata(bin_dir.join("redis-cli"))
                        .unwrap()
                        .permissions();
                    perms.set_mode(0o755);
                    fs::set_permissions(bin_dir.join("redis-cli"), perms).ok();
                }
                Ok(std::process::ExitStatus::default())
            } else {
                return Err("No txz found in jar".to_string());
            }
        } else {
            let mut cmd = Command::new("tar");
            cmd.arg("-xf")
                .arg(&archive_path)
                .arg("-C")
                .arg(&version_path);
            if runtime == "node" || runtime == "nginx" || runtime == "mariadb" {
                cmd.arg("--strip-components=1");
            }
            cmd.status()
        };

        if !extract_status.map_err(|e| e.to_string())?.success() {
            return Err("Extraction failed".to_string());
        }
        let _ = fs::remove_file(archive_path);

        // Post-extraction fix for Nginx
        if runtime == "nginx" {
            // The archive from godmaycrying has structure: ./<version>/amd64/nginx
            // We want to move it to the root of version_path
            let mut found_bin = None;
            if let Ok(entries) = fs::read_dir(&version_path) {
                for entry in entries.flatten() {
                    if entry.path().is_dir() {
                        let amd64_path = entry.path().join("amd64/nginx");
                        if amd64_path.exists() {
                            found_bin = Some(amd64_path);
                            break;
                        }
                    }
                }
            }

            if let Some(bin_path) = found_bin {
                let target_bin = version_path.join("nginx");
                let _ = fs::rename(bin_path, &target_bin);
                
                // Set executable permission
                if let Ok(metadata) = fs::metadata(&target_bin) {
                    let mut perms = metadata.permissions();
                    perms.set_mode(0o755);
                    let _ = fs::set_permissions(&target_bin, perms);
                }
            }
        }
    }

    if runtime == "php" {
        let bin_dir = version_path.join("bin");
        let sbin_dir = version_path.join("sbin");
        fs::create_dir_all(&bin_dir).ok();
        fs::create_dir_all(&sbin_dir).ok();
        
        // Move binaries from extracted location to proper directories
        // The GitHub Actions build creates these in bin/ and sbin/ already
        if version_path.join("php").exists() {
            let target = bin_dir.join("php");
            fs::rename(version_path.join("php"), &target).ok();
            if let Ok(metadata) = fs::metadata(&target) {
                let mut perms = metadata.permissions();
                perms.set_mode(0o755);
                fs::set_permissions(&target, perms).ok();
            }
        }
        
        if version_path.join("php-fpm").exists() {
            let target = sbin_dir.join("php-fpm");
            fs::rename(version_path.join("php-fpm"), &target).ok();
            if let Ok(metadata) = fs::metadata(&target) {
                let mut perms = metadata.permissions();
                perms.set_mode(0o755);
                fs::set_permissions(&target, perms).ok();
            }
        }
    }

    Ok("Installation successful".to_string())
}

#[tauri::command]
pub async fn update_global_shims(runtime: String, version: String) -> Result<String, String> {
    let base_path = get_default_path();
    let bin_dir = base_path.join("bin");
    if !bin_dir.exists() {
        fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;
    }
    let version_path = base_path.join("versions").join(&runtime).join(&version);
    if !version_path.exists() {
        return Err(format!(
            "Version {} v{} is not installed.",
            runtime, version
        ));
    }

    match runtime.as_str() {
        "php" => {
            let source_bin = version_path.join("bin/php");
            let target_link = bin_dir.join("php");
            if source_bin.exists() {
                if target_link.exists() {
                    let _ = fs::remove_file(&target_link);
                }
                symlink(&source_bin, &target_link).map_err(|e| e.to_string())?;
            } else {
                return Err("PHP binary not found".to_string());
            }
            ensure_composer(&base_path).await?;
        }
        "node" => {
            let node_bins = vec!["node", "npm", "npx"];
            for bin_name in node_bins {
                let source = version_path.join("bin").join(bin_name);
                let target = bin_dir.join(bin_name);
                if source.exists() {
                    if target.exists() {
                        let _ = fs::remove_file(&target);
                    }
                    symlink(&source, &target).map_err(|e| e.to_string())?;
                }
            }
        }
        "bun" => {
            let source = version_path.join("bun");
            let target_bun = bin_dir.join("bun");
            let target_bunx = bin_dir.join("bunx");
            if source.exists() {
                if target_bun.exists() {
                    let _ = fs::remove_file(&target_bun);
                }
                symlink(&source, &target_bun).map_err(|e| e.to_string())?;
                if target_bunx.exists() {
                    let _ = fs::remove_file(&target_bunx);
                }
                symlink(&source, &target_bunx).map_err(|e| e.to_string())?;
            }
        }
        _ => {}
    }

    // Always save active version to config for UI consistency
    let config_path = base_path.join("config/active_versions.json");
    let mut active_versions_val = if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            serde_json::from_str::<serde_json::Value>(&content).unwrap_or(serde_json::json!({}))
        } else {
            serde_json::json!({})
        }
    } else {
        serde_json::json!({})
    };

    if let Some(obj) = active_versions_val.as_object_mut() {
        obj.insert(runtime.clone(), serde_json::json!(version));
    }

    let _ = fs::create_dir_all(config_path.parent().unwrap());
    let _ = fs::write(
        &config_path,
        serde_json::to_string_pretty(&active_versions_val).unwrap(),
    );

    Ok("Global version updated".to_string())
}

async fn ensure_composer(base_path: &PathBuf) -> Result<(), String> {
    let bin_dir = base_path.join("bin");
    let composer_phar = bin_dir.join("composer.phar");
    let composer_wrapper = bin_dir.join("composer");

    if !composer_phar.exists() {
        let status = Command::new("curl")
            .arg("-L")
            .arg("-o")
            .arg(&composer_phar)
            .arg("https://getcomposer.org/composer.phar")
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("Failed to download composer.phar".to_string());
        }
    }

    let php_shim = bin_dir.join("php");
    let wrapper_content = format!(
        r#"#!/bin/sh
exec "{}" "{}" "$@"
"#,
        php_shim.to_string_lossy(),
        composer_phar.to_string_lossy()
    );

    fs::write(&composer_wrapper, wrapper_content).map_err(|e| e.to_string())?;

    let mut perms = fs::metadata(&composer_wrapper)
        .map_err(|e| e.to_string())?
        .permissions();
    perms.set_mode(0o755);
    fs::set_permissions(&composer_wrapper, perms).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn uninstall_runtime(runtime: String, version: String) -> Result<String, String> {
    let base_path = get_default_path();
    let version_path = base_path.join("versions").join(&runtime).join(&version);

    if !version_path.exists() {
        return Err(format!("Version {} v{} is not installed.", runtime, version));
    }

    fs::remove_dir_all(&version_path).map_err(|e| format!("Failed to delete directory: {}", e))?;

    Ok(format!("{} v{} uninstalled successfully.", runtime, version))
}

#[tauri::command]
pub fn get_active_version(runtime: String) -> String {
    let base_path = get_default_path();
    let config_path = base_path.join("config/active_versions.json");
    
    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(ver) = json.get(&runtime).and_then(|v| v.as_str()) {
                    return ver.to_string();
                }
            }
        }
    }
    
    // For PHP, try to detect from binary shim if not in config
    if runtime == "php" {
        let php_bin = base_path.join("bin/php");
        if php_bin.exists() {
            if let Ok(target) = fs::read_link(&php_bin) {
                // path looks like .../versions/php/8.2/bin/php
                if let Some(ver) = target.parent().and_then(|p| p.parent()).and_then(|p| p.file_name()) {
                    return ver.to_string_lossy().to_string();
                }
            }
        }
    }

    "".to_string()
}
