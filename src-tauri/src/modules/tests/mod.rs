#[cfg(test)]
mod tests {
    use crate::modules::common::{get_default_path, get_service_port_value, is_secured};
    use std::env;
    use std::path::PathBuf;

    #[test]
    fn test_get_default_path() {
        let path = get_default_path();
        assert!(path.is_absolute());
        assert!(path.to_string_lossy().contains(".lekstack"));
    }

    #[test]
    fn test_get_default_path_uses_home_env() {
        // Store original HOME value
        let original_home = env::var("HOME").ok();
        
        // Set custom HOME
        env::set_var("HOME", "/custom/home");
        let path = get_default_path();
        assert_eq!(path, PathBuf::from("/custom/home/.lekstack"));
        
        // Restore original HOME
        if let Some(home) = original_home {
            env::set_var("HOME", home);
        }
    }

    #[test]
    fn test_get_service_port_value_defaults() {
        assert_eq!(get_service_port_value("mariadb"), 3306);
        assert_eq!(get_service_port_value("postgresql"), 5432);
        assert_eq!(get_service_port_value("redis"), 6379);
        assert_eq!(get_service_port_value("unknown"), 0);
    }

    #[test]
    fn test_is_secured_returns_false_for_nonexistent_cert() {
        // For a site that definitely doesn't have a cert
        let result = is_secured("nonexistent-test-site-12345");
        assert!(!result);
    }
}
