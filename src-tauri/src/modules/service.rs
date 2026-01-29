use super::common::{get_default_path, get_service_port_value};
use super::database::{init_mariadb_data, init_postgresql_data};
use std::fs;
// use std::io::Write;
use std::path::PathBuf;
use std::process::Command;

// Helper to generate basic nginx config
pub fn generate_nginx_config(base_path: &PathBuf) -> PathBuf {
    let config_dir = base_path.join("config");
    if !config_dir.exists() {
        let _ = fs::create_dir_all(&config_dir);
    }

    let logs_dir = base_path.join("logs");
    let pids_dir = base_path.join("pids");
    let html_dir = base_path.join("html");
    if !html_dir.exists() {
        let _ = fs::create_dir_all(&html_dir);
        let _ = fs::write(
            html_dir.join("index.html"),
            "<h1>Welcome to LekStack Nginx!</h1>",
        );
    }

    // mime.types (Simplified for brevity, or full?)
    let mime_path = config_dir.join("mime.types");
    if !mime_path.exists() {
        let mime_content = r#"
types {
    text/html                             html htm shtml;
    text/css                              css;
    text/xml                              xml;
    image/gif                             gif;
    image/jpeg                            jpeg jpg;
    application/javascript                js;
    application/atom+xml                  atom;
    application/rss+xml                   rss;
    text/mathml                           mml;
    text/plain                            txt;
    text/vnd.sun.j2me.app-descriptor      jad;
    text/vnd.wap.wml                      wml;
    text/x-component                      htc;
    image/png                             png;
    image/svg+xml                         svg svgz;
    image/tiff                            tif tiff;
    image/vnd.wap.wbmp                    wbmp;
    image/webp                            webp;
    image/x-icon                          ico;
    image/x-jng                           jng;
    image/x-ms-bmp                        bmp;
    application/font-woff                 woff;
    application/java-archive              jar war ear;
    application/json                      json;
    application/mac-binhex40              hqx;
    application/msword                    doc;
    application/pdf                       pdf;
    application/postscript                ps eps ai;
    application/rtf                       rtf;
    application/vnd.apple.mpegurl         m3u8;
    application/vnd.google-earth.kml+xml  kml;
    application/vnd.google-earth.kmz      kmz;
    application/vnd.ms-excel              xls;
    application/vnd.ms-fontobject         eot;
    application/vnd.ms-powerpoint         ppt;
    application/vnd.oasis.opendocument.graphics odg;
    application/vnd.oasis.opendocument.presentation odp;
    application/vnd.oasis.opendocument.spreadsheet ods;
    application/vnd.oasis.opendocument.text odt;
    application/vnd.openxmlformats-officedocument.presentationml.presentation pptx;
    application/vnd.openxmlformats-officedocument.spreadsheetml.sheet xlsx;
    application/vnd.openxmlformats-officedocument.wordprocessingml.document docx;
    application/vnd.wap.wmlc              wmlc;
    application/x-7z-compressed           7z;
    application/x-cocoa                   cco;
    application/x-java-archive-diff       jardiff;
    application/x-java-jnlp-file          jnlp;
    application/x-makeself                run;
    application/x-perl                    pl pm;
    application/x-pilot                   prc pdb;
    application/x-rar-compressed          rar;
    application/x-redhat-package-manager  rpm;
    application/x-sea                     sea;
    application/x-shockwave-flash         swf;
    application/x-stuffit                 sit;
    application/x-tcl                     tcl tk;
    application/x-x509-ca-cert            der pem crt;
    application/x-xpinstall               xpi;
    application/xhtml+xml                 xhtml;
    application/xspf+xml                  xspf;
    application/zip                       zip;
    application/octet-stream              bin exe dll deb dmg iso img msi msp msm;
    audio/midi                            mid midi kar;
    audio/mpeg                            mp3;
    audio/ogg                             ogg;
    audio/x-m4a                           m4a;
    audio/x-realaudio                     ra;
    video/3gpp                            3gpp 3gp;
    video/mp2t                            ts;
    video/mp4                             mp4;
    video/mpeg                            mpeg mpg;
    video/quicktime                       mov;
    video/webm                            webm;
    video/x-flv                           flv;
    video/x-m4v                           m4v;
    video/x-mng                           mng;
    video/x-ms-asf                        asx asf;
    video/x-ms-wmv                        wmv;
    video/x-msvideo                       avi;
}
"#;
        let _ = fs::write(&mime_path, mime_content);
    }

    let fastcgi_params_path = config_dir.join("fastcgi_params");
    if !fastcgi_params_path.exists() {
        let params_content = r#"
fastcgi_param  QUERY_STRING       $query_string;
fastcgi_param  REQUEST_METHOD     $request_method;
fastcgi_param  CONTENT_TYPE       $content_type;
fastcgi_param  CONTENT_LENGTH     $content_length;

fastcgi_param  SCRIPT_NAME        $fastcgi_script_name;
fastcgi_param  REQUEST_URI        $request_uri;
fastcgi_param  DOCUMENT_URI       $document_uri;
fastcgi_param  DOCUMENT_ROOT      $document_root;
fastcgi_param  SERVER_PROTOCOL    $server_protocol;
fastcgi_param  REQUEST_SCHEME     $scheme;
fastcgi_param  HTTPS              $https if_not_empty;

fastcgi_param  GATEWAY_INTERFACE  CGI/1.1;
fastcgi_param  SERVER_SOFTWARE    nginx/$nginx_version;

fastcgi_param  REMOTE_ADDR        $remote_addr;
fastcgi_param  REMOTE_PORT        $remote_port;
fastcgi_param  SERVER_ADDR        $server_addr;
fastcgi_param  SERVER_PORT        $server_port;
"#;
        let _ = fs::write(&fastcgi_params_path, params_content);
    }

    let sites_dir = config_dir.join("sites");
    if !sites_dir.exists() {
        let _ = fs::create_dir_all(&sites_dir);
    }

    // Fetch dynamic port from service settings with 8080 as fallback
    let nginx_port = get_service_port_value("nginx");
    
    let conf_path = config_dir.join("nginx.conf");
    let conf_content = format!(
        r#"
worker_processes  1;
error_log  {}/nginx-error.log;
pid        {}/nginx.pid;

events {{
    worker_connections  1024;
}}

http {{
    include       mime.types;
    default_type  application/octet-stream;
    access_log    {}/nginx-access.log;
    sendfile      on;
    keepalive_timeout  65;
    client_max_body_size 100M;
    include       {}/sites/*.conf;

    server {{
        listen       {} default_server;
        server_name  _;
        root         {};
        index        index.html index.htm index.php;

        location / {{
            try_files $uri $uri/ /index.php?$query_string;
        }}

        location ~ \.php$ {{
            fastcgi_pass   127.0.0.1:9000;
            fastcgi_index  index.php;
            include        fastcgi_params;
            fastcgi_param  SCRIPT_FILENAME $document_root$fastcgi_script_name;
        }}
    }}
}}
"#,
        logs_dir.to_string_lossy(),
        pids_dir.to_string_lossy(),
        logs_dir.to_string_lossy(),
        config_dir.to_string_lossy(),
        nginx_port,
        html_dir.to_string_lossy()
    );

    let _ = fs::write(&conf_path, conf_content);
    conf_path
}

pub fn generate_php_config(base_path: &PathBuf, version: &str, port: u16) -> PathBuf {
    let config_dir = base_path.join("config");
    let logs_dir = base_path.join("logs");
    let pids_dir = base_path.join("pids");
    let socket_dir = base_path.join("sockets");
    if !socket_dir.exists() {
        let _ = fs::create_dir_all(&socket_dir);
    }

    let fpm_conf_path = config_dir.join(format!("php-{}-fpm.conf", version));
    let fpm_content = format!(
        r#"
[global]
pid = {}/php-{}-fpm.pid
error_log = {}/php-{}-fpm.log
daemonize = no

[www]
listen = 127.0.0.1:{}
user = {}
group = {}
pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
"#,
        pids_dir.to_string_lossy(),
        version,
        logs_dir.to_string_lossy(),
        version,
        port,
        std::env::var("USER").unwrap_or("root".to_string()),
        std::env::var("USER").unwrap_or("root".to_string())
    );

    let _ = fs::write(&fpm_conf_path, fpm_content);
    fpm_conf_path
}

#[tauri::command]
pub fn get_php_ini(version: String) -> Result<String, String> {
    let base_path = get_default_path();
    let ini_path = base_path
        .join("versions/php")
        .join(&version)
        .join("lib/php.ini");

    if ini_path.exists() {
        let content = fs::read_to_string(ini_path).map_err(|e| e.to_string())?;
        Ok(content)
    } else {
        // Create default
        let default_ini = r#"
memory_limit = 512M
upload_max_filesize = 128M
post_max_size = 128M
max_execution_time = 300
display_errors = On
short_open_tag = On
date.timezone = UTC
opcache.enable = 1
opcache.memory_consumption = 128
"#;
        if let Some(parent) = ini_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&ini_path, default_ini).map_err(|e| e.to_string())?;
        Ok(default_ini.to_string())
    }
}

#[tauri::command]
pub fn update_php_ini(version: String, content: String) -> Result<String, String> {
    let base_path = get_default_path();
    let ini_path = base_path
        .join("versions/php")
        .join(version)
        .join("lib/php.ini");

    if let Some(parent) = ini_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(ini_path, content).map_err(|e| e.to_string())?;
    Ok("Updated php.ini".to_string())
}

#[tauri::command]
pub fn start_service(name: String) -> bool {
    println!("กำลังสั่ง Start service {}", name);
    let base_path = get_default_path();

    if name.contains("nginx") {
        let versions_dir = base_path.join("versions/nginx");
        
        // Try to read active/default version from config first
        let config_path = base_path.join("config/active_versions.json");
        let mut nginx_bin = PathBuf::new();
        
        if config_path.exists() {
            if let Ok(content) = fs::read_to_string(&config_path) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(nginx_ver) = json.get("nginx").and_then(|v| v.as_str()) {
                        nginx_bin = versions_dir.join(format!("{}/nginx", nginx_ver));
                    }
                }
            }
        }
        
        // Fallback to default or any installed version
        if !nginx_bin.exists() {
            nginx_bin = versions_dir.join("1.27.2/nginx");
        }
        
        // If still not found, try to find any installed version
        if !nginx_bin.exists() {
            if let Ok(entries) = fs::read_dir(&versions_dir) {
                for entry in entries.flatten() {
                    if entry.path().is_dir() {
                        let bin = entry.path().join("nginx");
                        if bin.exists() {
                            nginx_bin = bin;
                            break;
                        }
                    }
                }
            }
        }

        if !nginx_bin.exists() {
            return false;
        }
        let config_path = generate_nginx_config(&base_path);
        let child = Command::new(&nginx_bin)
            .arg("-c")
            .arg(&config_path)
            .arg("-p")
            .arg(&base_path.join("config"))
            .spawn();
        return child.is_ok();
    } else if name.starts_with("php") {
        let parts: Vec<&str> = name.split('-').collect();
        let version = if parts.len() > 1 { parts[1] } else { "8.2" };
        let php_fpm_bin = base_path
            .join("versions/php")
            .join(version)
            .join("sbin/php-fpm");

        if !php_fpm_bin.exists() {
            return false;
        }

        let port = if version.starts_with("7.4") {
            9074
        } else if version.starts_with("8.0") {
            9080
        } else if version.starts_with("8.1") {
            9081
        } else if version.starts_with("8.2") {
            9082
        } else if version.starts_with("8.3") {
            9083
        } else if version.starts_with("8.4") {
            9084
        } else {
            9000
        };

        let config_path = generate_php_config(&base_path, version, port);
        let ini_path = base_path
            .join("versions/php")
            .join(version)
            .join("lib/php.ini");
        if !ini_path.exists() {
            let _ = get_php_ini(version.to_string());
        }

        let child = Command::new(&php_fpm_bin)
            .arg("-y")
            .arg(&config_path)
            .arg("-c")
            .arg(&ini_path)
            .spawn();
        return child.is_ok();
    } else if name == "mariadb" {
        if let Err(e) = init_mariadb_data(&base_path) {
            println!("Init mariadb failed: {}", e);
            return false;
        }
        let versions_dir = base_path.join("versions/mariadb");
        let version_entry = fs::read_dir(&versions_dir)
            .ok()
            .and_then(|mut d| d.next())
            .and_then(|e| e.ok());

        if let Some(entry) = version_entry {
            let mariadb_home = entry.path();
            let mysqld_safe = mariadb_home.join("bin/mysqld_safe");
            let data_dir = base_path.join("data/mariadb");
            let pids_dir = base_path.join("pids");
            let pid_file = pids_dir.join("mariadb.pid");
            let socket_file = pids_dir.join("mysql.sock");
            let port = get_service_port_value("mariadb");

            let child = Command::new(mysqld_safe)
                .arg(format!("--datadir={}", data_dir.to_string_lossy()))
                .arg(format!("--pid-file={}", pid_file.to_string_lossy()))
                .arg(format!("--socket={}", socket_file.to_string_lossy()))
                .arg(format!("--port={}", port))
                .arg("--innodb-use-native-aio=0")
                .arg("--skip-log-error")
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .spawn();
            return child.is_ok();
        }
    } else if name == "postgresql" {
        if let Err(e) = init_postgresql_data(&base_path) {
            println!("Init postgres failed: {}", e);
            return false;
        }
        let pg_ctl = base_path.join("versions/postgresql/16.2/pgsql/bin/pg_ctl");
        let data_dir = base_path.join("data/postgresql");
        let log_file = base_path.join("logs/postgresql.log");
        let port = get_service_port_value("postgresql");

        let child = Command::new(pg_ctl)
            .arg("start")
            .arg("-D")
            .arg(&data_dir)
            .arg("-l")
            .arg(&log_file)
            .arg("-o")
            .arg(format!("-p {} -k /tmp", port))
            .spawn();
        return child.is_ok();
    } else if name == "redis" {
        let redis_server = base_path.join("versions/redis/7.4.1/bin/redis-server");
        let pids_dir = base_path.join("pids");
        let pid_file = pids_dir.join("redis.pid");
        let port = get_service_port_value("redis");

        let child = Command::new(redis_server)
            .arg("--port")
            .arg(port.to_string())
            .arg("--pidfile")
            .arg(&pid_file)
            .spawn();
        return child.is_ok();
    }
    false
}

#[tauri::command]
pub fn stop_service(name: String) -> bool {
    let base_path = get_default_path();
    let pid_path = if name == "postgresql" {
        base_path.join("data/postgresql/postmaster.pid")
    } else {
        base_path.join("pids").join(format!("{}.pid", name))
    };

    if pid_path.exists() {
        if let Ok(content) = fs::read_to_string(&pid_path) {
            let pid = content.trim();
            // Kill
            let _ = Command::new("kill").arg(pid).status();
            // Remove file
            let _ = fs::remove_file(&pid_path);
            return true;
        }
    }
    false
}

#[tauri::command]
pub fn get_service_status(name: &str) -> String {
    let base_path = get_default_path();
    let pid_path = if name == "postgresql" {
        base_path.join("data/postgresql/postmaster.pid")
    } else {
        base_path.join("pids").join(format!("{}.pid", name))
    };

    if pid_path.exists() {
        "running".to_string()
    } else {
        "stopped".to_string()
    }
}

#[tauri::command]
pub fn get_service_port(name: String) -> u16 {
    get_service_port_value(&name)
}

#[tauri::command]
pub fn update_service_port(name: String, port: u16) -> Result<String, String> {
    let base_path = get_default_path();
    let config_path = base_path.join("config/services.json");

    // Read existing
    let mut current_config: serde_json::Value = if config_path.exists() {
        let content = fs::read_to_string(&config_path).unwrap_or_else(|_| "{}".to_string());
        serde_json::from_str(&content).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    if let Some(obj) = current_config.as_object_mut() {
        obj.insert(name, serde_json::json!({ "port": port }));
    }

    let config_str = serde_json::to_string_pretty(&current_config).map_err(|e| e.to_string())?;
    fs::create_dir_all(config_path.parent().unwrap()).ok();
    fs::write(config_path, config_str).map_err(|e| e.to_string())?;
    Ok("Port updated".to_string())
}

pub fn restart_all_services_logic() -> Result<String, String> {
    // Stop list
    let services = vec!["nginx", "php-8.2", "mariadb", "postgresql", "redis"];
    for s in &services {
        stop_service(s.to_string());
    }
    std::thread::sleep(std::time::Duration::from_secs(1));
    for s in &services {
        start_service(s.to_string());
    }
    Ok("Restarted".to_string())
}

#[tauri::command]
pub fn restart_all_services() -> Result<String, String> {
    restart_all_services_logic()
}

#[tauri::command]
pub fn get_service_logs(name: String, lines: u32) -> Result<String, String> {
    let base_path = get_default_path();
    let log_path = if name == "nginx-error" {
        base_path.join("logs/nginx-error.log")
    } else if name == "nginx-access" {
        base_path.join("logs/nginx-access.log")
    } else if name.starts_with("php") {
        let version = name.replace("php", "");
        base_path.join(format!("logs/php{}-fpm.log", version))
    } else {
        base_path.join(format!("logs/{}.log", name))
    };

    if !log_path.exists() {
        return Ok(format!("Log file not found at: {}", log_path.display()));
    }

    let output = Command::new("tail")
        .arg("-n")
        .arg(lines.to_string())
        .arg(&log_path)
        .output()
        .map_err(|e| e.to_string())?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
