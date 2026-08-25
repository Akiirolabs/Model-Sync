use std::fs;
use std::path::{Component, PathBuf};

/// Resolve a relative path under the repo `data/` root only — no traversal, no absolute paths.
fn resolve_under_data(relative_path: &str) -> Result<PathBuf, String> {
    if relative_path.trim().is_empty() {
        return Err("Path is empty".into());
    }
    if relative_path.contains('\0') {
        return Err("Invalid path".into());
    }

    let candidate = PathBuf::from(relative_path);
    if candidate.is_absolute() {
        return Err("Absolute paths are not allowed".into());
    }
    for c in candidate.components() {
        match c {
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err("Path traversal is not allowed".into());
            }
            _ => {}
        }
    }

    // cwd when running via tauri is typically apps/desktop/src-tauri
    let data_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../data")
        .canonicalize()
        .map_err(|e| format!("data root missing: {e}"))?;

    let full = data_root.join(&candidate);
    let canon = full
        .canonicalize()
        .map_err(|_| "File not found under data root".to_string())?;

    if !canon.starts_with(&data_root) {
        return Err("Resolved path escaped data root".into());
    }
    Ok(canon)
}

#[tauri::command]
fn read_metrics_file(relative_path: String) -> Result<String, String> {
    // Strip leading ../data/ or data/ prefixes users may paste from docs
    let cleaned = relative_path
        .replace('\\', "/")
        .trim_start_matches("../")
        .trim_start_matches("./")
        .trim_start_matches("data/")
        .to_string();

    let path = resolve_under_data(&cleaned)?;
    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.len() > 5_242_880 {
        return Err("File exceeds 5MB limit".into());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![read_metrics_file])
        .run(tauri::generate_context!())
        .expect("error while running Model Sync desktop");
}
