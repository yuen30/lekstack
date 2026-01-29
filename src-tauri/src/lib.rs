use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

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
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        let window = app.get_webview_window("main").unwrap();
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_install_path,
            init_environment,
            get_service_status,
            start_service,
            stop_service,
            list_installed_versions,
            get_active_version,
            install_runtime,
            uninstall_runtime,
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
            update_service_port,
            get_service_logs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
