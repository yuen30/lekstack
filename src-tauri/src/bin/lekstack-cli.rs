use lekstack_lib::{
    add_parked_path_logic, init_project_logic, link_site_logic, remove_parked_path_logic,
    restart_all_services_logic, unlink_site_logic,
};
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        print_help();
        return;
    }

    let command = &args[1];
    match command.as_str() {
        "link" => handle_link(),
        "unlink" => handle_unlink(),
        "park" => handle_park(),
        "unpark" => handle_unpark(),
        "restart" => handle_restart(),
        "init" => handle_init(),
        _ => print_help(),
    }
}

fn print_help() {
    println!("LekStack CLI v0.1.0");
    println!("Usage:");
    println!("  lekstack link [name]    Link current directory as a site");
    println!("  lekstack unlink [name]  Unlink site");
    println!("  lekstack park [path]    Park current or specified directory");
    println!("  lekstack unpark [path]  Unpark current or specified directory");
    println!("  lekstack restart        Restart all services");
    println!("  lekstack init           Initialize a new project");
}

fn handle_link() {
    let cwd = env::current_dir().expect("Failed to get current directory");
    let name = if let Some(arg) = env::args().nth(2) {
        arg
    } else {
        cwd.file_name().unwrap().to_string_lossy().to_string()
    };

    match link_site_logic(cwd.to_string_lossy().to_string(), name.clone()) {
        Ok(_) => println!("Linked http://{}.test -> {}", name, cwd.to_string_lossy()),
        Err(e) => eprintln!("Error: {}", e),
    }
}

fn handle_unlink() {
    let cwd = env::current_dir().expect("Failed to get cwd");
    let name = if let Some(arg) = env::args().nth(2) {
        arg
    } else {
        cwd.file_name().unwrap().to_string_lossy().to_string()
    };

    match unlink_site_logic(name.clone()) {
        Ok(_) => println!("Unlinked {}.test", name),
        Err(e) => eprintln!("Error: {}", e),
    }
}

fn handle_park() {
    let path = if let Some(arg) = env::args().nth(2) {
        arg
    } else {
        env::current_dir().unwrap().to_string_lossy().to_string()
    };

    let abs_path = std::fs::canonicalize(&path).unwrap_or_else(|_| std::path::PathBuf::from(&path));

    add_parked_path_logic(abs_path.to_string_lossy().to_string());
    println!("Parked: {}", abs_path.to_string_lossy());
}

fn handle_unpark() {
    let path = if let Some(arg) = env::args().nth(2) {
        arg
    } else {
        env::current_dir().unwrap().to_string_lossy().to_string()
    };
    remove_parked_path_logic(path.clone());
    println!("Unparked: {}", path);
}

fn handle_restart() {
    match restart_all_services_logic() {
        Ok(_) => println!("All services restarted."),
        Err(e) => eprintln!("Error restarting services: {}", e),
    }
}

fn handle_init() {
    let cwd = env::current_dir().unwrap();
    match init_project_logic(cwd.to_string_lossy().to_string()) {
        Ok(_) => println!("Initialized LekStack project in {}", cwd.to_string_lossy()),
        Err(e) => eprintln!("Error: {}", e),
    }
}
