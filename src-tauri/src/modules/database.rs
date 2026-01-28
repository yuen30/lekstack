use super::common::{get_default_path, get_service_port_value, DbUser};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

pub fn init_mariadb_data(base_path: &PathBuf) -> Result<(), String> {
    let data_dir = base_path.join("data/mariadb");
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

        let versions_dir = base_path.join("versions/mariadb");
        let version_entry = fs::read_dir(&versions_dir)
            .ok()
            .and_then(|mut d| d.next())
            .and_then(|e| e.ok());

        if let Some(entry) = version_entry {
            let mariadb_home = entry.path();
            // linux script: scripts/mysql_install_db
            let install_db_script = mariadb_home.join("scripts/mysql_install_db");
            if install_db_script.exists() {
                let output = Command::new(&install_db_script)
                    .arg(format!("--datadir={}", data_dir.to_string_lossy()))
                    .arg(format!("--basedir={}", mariadb_home.to_string_lossy()))
                    .arg("--auth-root-authentication-method=normal")
                    .output()
                    .map_err(|e| e.to_string())?;

                if !output.status.success() {
                    return Err(format!(
                        "MariaDB init failed: {}",
                        String::from_utf8_lossy(&output.stderr)
                    ));
                }
            } else {
                return Err("mariadb install db script not found".to_string());
            }
        }
    }
    Ok(())
}

pub fn init_postgresql_data(base_path: &PathBuf) -> Result<(), String> {
    let data_dir = base_path.join("data/postgresql");
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
        // Find PG
        let pg_home = base_path.join("versions/postgresql/16.2/pgsql"); // Hardcoded version check?
                                                                        // Logic to find installed version could be better, but for now reuse existing logic
        if !pg_home.exists() {
            // Try list?
            return Err("PostgreSQL home not found".to_string());
        }
        let initdb = pg_home.join("bin/initdb");
        let output = Command::new(initdb)
            .arg("-D")
            .arg(&data_dir)
            .arg("-U")
            .arg("postgres")
            .arg("-E")
            .arg("UTF8")
            .arg("--locale=C")
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            return Err(format!(
                "Postgres init failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }
    }
    Ok(())
}

#[tauri::command]
pub fn get_db_users(runtime: String) -> Result<Vec<DbUser>, String> {
    let base_path = get_default_path();
    let mut users = Vec::new();

    if runtime == "mariadb" {
        let socket = base_path.join("pids/mysql.sock");
        let versions_dir = base_path.join("versions/mariadb");
        let version_entry = fs::read_dir(&versions_dir)
            .ok()
            .and_then(|mut d| d.next())
            .and_then(|e| e.ok());

        if let Some(entry) = version_entry {
            let mysql_bin = entry.path().join("bin/mysql");
            let output = Command::new(mysql_bin)
                .arg("-u")
                .arg("root")
                .arg("--socket")
                .arg(socket)
                .arg("-s") // silent
                .arg("-N") // skip column names
                .arg("-e")
                .arg("SELECT User, Host FROM mysql.user")
                .output()
                .map_err(|e| e.to_string())?;

            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        users.push(DbUser {
                            username: parts[0].to_string(),
                            host: parts[1].to_string(),
                        });
                    }
                }
            }
        }
    } else if runtime == "postgresql" {
        // PG uses port
        let port = get_service_port_value("postgresql");

        let output = Command::new("psql")
            .arg("-h")
            .arg("127.0.0.1")
            .arg("-p")
            .arg(port.to_string())
            .arg("-U")
            .arg("postgres")
            .arg("-t") // tuples only (no header)
            .arg("-c")
            .arg("SELECT usename FROM pg_user")
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let u = line.trim();
                if !u.is_empty() {
                    users.push(DbUser {
                        username: u.to_string(),
                        host: "localhost".to_string(),
                    });
                }
            }
        }
    }
    Ok(users)
}

#[tauri::command]
pub fn create_db_user(runtime: String, username: String, pass: String) -> Result<String, String> {
    let base_path = get_default_path();

    if runtime == "mariadb" {
        let socket = base_path.join("pids/mysql.sock");
        let versions_dir = base_path.join("versions/mariadb");
        let version_entry = fs::read_dir(&versions_dir)
            .ok()
            .and_then(|mut d| d.next())
            .and_then(|e| e.ok());

        if let Some(entry) = version_entry {
            let mysql_bin = entry.path().join("bin/mysql");
            // Allow access from any host %
            let sql = format!("CREATE USER '{}'@'%' IDENTIFIED BY '{}'; GRANT ALL PRIVILEGES ON *.* TO '{}'@'%' WITH GRANT OPTION; FLUSH PRIVILEGES;", username, pass, username);

            let status = Command::new(mysql_bin)
                .arg("-u")
                .arg("root")
                .arg("--socket")
                .arg(socket)
                .arg("-e")
                .arg(sql)
                .status()
                .map_err(|e| e.to_string())?;

            if !status.success() {
                return Err("Failed to create MariaDB user".to_string());
            }
        }
    } else if runtime == "postgresql" {
        let sql = format!(
            "CREATE ROLE \"{}\" WITH LOGIN PASSWORD '{}' SUPERUSER;",
            username, pass
        );
        // Uses port
        let port = get_service_port_value("postgresql");
        let status = Command::new("psql")
            .arg("-h")
            .arg("127.0.0.1")
            .arg("-p")
            .arg(port.to_string())
            .arg("-U")
            .arg("postgres")
            .arg("-c")
            .arg(sql)
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err("Failed to create PostgreSQL user".to_string());
        }
    }
    Ok("User created".to_string())
}

#[tauri::command]
pub fn delete_db_user(runtime: String, username: String) -> Result<String, String> {
    let base_path = get_default_path();

    if runtime == "mariadb" {
        let socket = base_path.join("pids/mysql.sock");
        let versions_dir = base_path.join("versions/mariadb");
        let version_entry = fs::read_dir(&versions_dir)
            .ok()
            .and_then(|mut d| d.next())
            .and_then(|e| e.ok());

        if let Some(entry) = version_entry {
            let mysql_bin = entry.path().join("bin/mysql");
            // Drop both variants if exist
            let sql = format!(
                "DROP USER IF EXISTS '{}'@'%'; DROP USER IF EXISTS '{}'@'localhost';",
                username, username
            );

            let status = Command::new(mysql_bin)
                .arg("-u")
                .arg("root")
                .arg("--socket")
                .arg(socket)
                .arg("-e")
                .arg(sql)
                .status()
                .map_err(|e| e.to_string())?;

            if !status.success() {
                return Err("Failed to delete MariaDB user".to_string());
            }
        }
    } else if runtime == "postgresql" {
        let sql = format!("DROP ROLE \"{}\";", username);
        let port = get_service_port_value("postgresql");
        let status = Command::new("psql")
            .arg("-h")
            .arg("127.0.0.1")
            .arg("-p")
            .arg(port.to_string())
            .arg("-U")
            .arg("postgres")
            .arg("-c")
            .arg(sql)
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err("Failed to delete PostgreSQL user".to_string());
        }
    }
    Ok("User deleted".to_string())
}

#[tauri::command]
pub fn change_db_password(
    runtime: String,
    username: String,
    pass: String,
) -> Result<String, String> {
    let base_path = get_default_path();

    if runtime == "mariadb" {
        let socket = base_path.join("pids/mysql.sock");
        let versions_dir = base_path.join("versions/mariadb");
        let version_entry = fs::read_dir(&versions_dir)
            .ok()
            .and_then(|mut d| d.next())
            .and_then(|e| e.ok());

        if let Some(entry) = version_entry {
            let mysql_bin = entry.path().join("bin/mysql");
            // Change for %
            let sql = format!(
                "ALTER USER '{}'@'%' IDENTIFIED BY '{}'; FLUSH PRIVILEGES;",
                username, pass
            );

            let status = Command::new(mysql_bin)
                .arg("-u")
                .arg("root")
                .arg("--socket")
                .arg(socket)
                .arg("-e")
                .arg(sql)
                .status()
                .map_err(|e| e.to_string())?;

            if !status.success() {
                return Err("Failed to change MariaDB password".to_string());
            }
        }
    } else if runtime == "postgresql" {
        let sql = format!("ALTER ROLE \"{}\" WITH PASSWORD '{}';", username, pass);
        let port = get_service_port_value("postgresql");
        let status = Command::new("psql")
            .arg("-h")
            .arg("127.0.0.1")
            .arg("-p")
            .arg(port.to_string())
            .arg("-U")
            .arg("postgres")
            .arg("-c")
            .arg(sql)
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err("Failed to change PostgreSQL password".to_string());
        }
    }
    Ok("Password updated".to_string())
}
