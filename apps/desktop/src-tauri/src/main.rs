#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod offline;
use tauri::Manager;
fn app_context() -> tauri::Context<tauri::Wry> {
    tauri::generate_context!()
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let folder = app.path().app_data_dir()?;
            std::fs::create_dir_all(&folder)?;
            let connection = rusqlite::Connection::open(folder.join("offline.sqlite"))?;
            offline::initialize(&connection).map_err(std::io::Error::other)?;
            app.manage(offline::OfflineStore(std::sync::Mutex::new(connection)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            offline::offline_read,
            offline::offline_compare_swap
        ])
        .run(app_context())
        .expect("Failed to start the desktop shell");
}

#[cfg(test)]
mod tests {
    #[test]
    fn desktop_context_loads() {
        let context = super::app_context();
        assert_eq!(
            context.config().identifier,
            "com.inventoryfoundation.desktop"
        );
    }
}
