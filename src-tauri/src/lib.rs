// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn get_service_status(name: &str) -> String {
    println!("Checking status for {}", name);
    // Mock response for now
    "stopped".to_string()
}

#[tauri::command]
fn start_service(name: &str) -> bool {
    println!("Starting service {}", name);
    // Mock success
    true
}

#[tauri::command]
fn stop_service(name: &str) -> bool {
    println!("Stopping service {}", name);
    // Mock success
    true
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_service_status, start_service, stop_service])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
