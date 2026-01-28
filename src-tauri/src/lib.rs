pub mod modules;

pub use modules::common::*;
pub use modules::database::*;
pub use modules::runtime::*;
pub use modules::service::*;
pub use modules::site::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_install_path,
            init_environment,
            get_service_status,
            start_service,
            stop_service,
            list_installed_versions,
            install_runtime,
            get_parked_paths,
            add_parked_path,
            remove_parked_path,
            link_site,
            unlink_site,
            scan_sites,
            refresh_routes,
            isolate_site,
            get_php_ini,
            update_php_ini,
            restart_all_services,
            update_global_shims,
            secure_site,
            unsecure_site,
            init_project,
            get_db_users,
            create_db_user,
            delete_db_user,
            change_db_password,
            get_service_port,
            update_service_port
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
