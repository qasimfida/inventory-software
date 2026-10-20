use rusqlite::{params, Connection};
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

pub struct OfflineStore(pub Mutex<Connection>);
#[derive(Serialize)]
pub struct VaultRecord {
    revision: i64,
    envelope: String,
}
pub fn initialize(connection: &Connection) -> Result<(), String> {
    let version: i64 = connection
        .query_row("PRAGMA user_version", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if version > 1 {
        return Err("Incompatible offline SQLite schema; preserve database".into());
    }
    connection.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; BEGIN IMMEDIATE; CREATE TABLE IF NOT EXISTS vaults(key TEXT PRIMARY KEY,revision INTEGER NOT NULL,envelope TEXT NOT NULL); PRAGMA user_version=1; COMMIT;").map_err(|e| e.to_string())
}
fn validate(key: &str) -> Result<(), String> {
    if key.is_empty()
        || key.len() > 128
        || !key
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
    {
        Err("Invalid vault name".into())
    } else {
        Ok(())
    }
}
#[tauri::command]
pub fn offline_read(
    key: String,
    state: State<'_, OfflineStore>,
) -> Result<Option<VaultRecord>, String> {
    validate(&key)?;
    let db = state.0.lock().map_err(|_| "Offline database locked")?;
    use rusqlite::OptionalExtension;
    db.query_row(
        "SELECT revision,envelope FROM vaults WHERE key=?1",
        [&key],
        |r| {
            Ok(VaultRecord {
                revision: r.get(0)?,
                envelope: r.get(1)?,
            })
        },
    )
    .optional()
    .map_err(|_| "Offline database read failed".into())
}
#[tauri::command]
pub fn offline_compare_swap(
    key: String,
    expected: Option<i64>,
    envelope: String,
    state: State<'_, OfflineStore>,
) -> Result<bool, String> {
    validate(&key)?;
    if envelope.len() > 24000000 {
        return Err("Vault capacity exceeded".into());
    }
    let db = state.0.lock().map_err(|_| "Offline database locked")?;
    let changed = match expected {
        None => db.execute(
            "INSERT OR IGNORE INTO vaults(key,revision,envelope) VALUES(?1,1,?2)",
            params![key, envelope],
        ),
        Some(revision) => db.execute(
            "UPDATE vaults SET revision=revision+1,envelope=?1 WHERE key=?2 AND revision=?3",
            params![envelope, key, revision],
        ),
    }
    .map_err(|_| "Atomic offline write failed")?;
    Ok(changed == 1)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn migration_and_atomic_revision_survive_reopen() {
        let path =
            std::env::temp_dir().join(format!("inventory-offline-{}.db", std::process::id()));
        {
            let db = Connection::open(&path).unwrap();
            initialize(&db).unwrap();
            db.execute("INSERT INTO vaults VALUES('test',1,'ciphertext')", [])
                .unwrap();
            assert_eq!(
                db.execute(
                    "UPDATE vaults SET revision=2 WHERE key='test' AND revision=0",
                    []
                )
                .unwrap(),
                0
            );
        }
        {
            let db = Connection::open(&path).unwrap();
            initialize(&db).unwrap();
            let revision: i64 = db
                .query_row("SELECT revision FROM vaults", [], |r| r.get(0))
                .unwrap();
            assert_eq!(revision, 1);
            db.execute_batch("PRAGMA user_version=99").unwrap();
            assert!(initialize(&db).is_err());
        }
        let _ = std::fs::remove_file(path);
    }
}
