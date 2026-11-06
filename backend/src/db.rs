use crate::util::now_secs;
use rusqlite::{Connection, params};
use serde::Deserialize;
use serde_json::{Value, json};

#[derive(Debug, Deserialize)]
pub struct PlatformInput {
    pub name: String,
    pub handle: String,
    pub url: String,
    pub followers: i64,
}

#[derive(Debug, Deserialize)]
pub struct CollabInput {
    pub name: String,
    pub image: String,
    pub url: String,
}

pub fn init(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS content (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS platforms (
            name TEXT PRIMARY KEY,
            handle TEXT NOT NULL DEFAULT '',
            url TEXT NOT NULL DEFAULT '',
            followers INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS collabs (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            image TEXT NOT NULL DEFAULT '',
            url TEXT NOT NULL DEFAULT '',
            sort_order INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL
        );

        "#,
    )?;
    seed(conn)
}

fn seed(conn: &Connection) -> rusqlite::Result<()> {
    let now = now_secs();
    let content_defaults = [
        ("brand_name", "RythonDev"),
        ("tagline", "Game developer & live streamer"),
        ("about", "I build games and stream the process on Twitch."),
        ("email", "hello@rython.dev"),
        ("profile_image_url", "/images/pfp_new_medium.webp"),
        (
            "services",
            "Sponsored content\nProduct reviews\nLivestream integrations\nSocial media campaigns\nBrand partnerships\nEvent appearances",
        ),
    ];

    for (key, value) in content_defaults {
        conn.execute(
            "INSERT OR IGNORE INTO content (key, value, updated_at) VALUES (?1, ?2, ?3)",
            params![key, value, now],
        )?;
    }

    let platform_defaults = [
        ("youtube", "@rythondev", "https://youtube.com/@rythondev", 0),
        ("tiktok", "@rythondev", "https://tiktok.com/@rythondev", 0),
        (
            "instagram",
            "@rythondev",
            "https://instagram.com/rythondev",
            0,
        ),
    ];

    for (name, handle, url, followers) in platform_defaults {
        conn.execute(
            "INSERT OR IGNORE INTO platforms (name, handle, url, followers, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![name, handle, url, followers, now],
        )?;
    }

    let collab_count: i64 = conn.query_row("SELECT COUNT(*) FROM collabs", [], |row| row.get(0))?;
    if collab_count == 0 {
        let collab_defaults = [
            (
                "ProtonPass",
                "/images/collaborations/proton-pass.webp",
                "https://proton.me/pass",
            ),
            (
                "ProtonVPN",
                "/images/collaborations/proton-vpn.webp",
                "https://protonvpn.com/",
            ),
            ("Brick", "/images/collaborations/brick.webp", "https://getbrick.com/"),
            (
                "Focumon",
                "/images/collaborations/focumon.webp",
                "https://www.focumon.com/landing",
            ),
        ];

        for (index, (name, image, url)) in collab_defaults.iter().enumerate() {
            conn.execute(
                "INSERT INTO collabs (name, image, url, sort_order, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![name, image, url, index as i64, now],
            )?;
        }
    }

    Ok(())
}

pub fn get_content(conn: &Connection) -> rusqlite::Result<Value> {
    let mut stmt = conn.prepare("SELECT key, value FROM content ORDER BY key")?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;

    let mut map = serde_json::Map::new();
    for row in rows {
        let (key, value) = row?;
        map.insert(key, Value::String(value));
    }

    Ok(Value::Object(map))
}

pub fn get_platforms(conn: &Connection) -> rusqlite::Result<Vec<Value>> {
    let mut stmt =
        conn.prepare("SELECT name, handle, url, followers FROM platforms ORDER BY name")?;

    let rows = stmt.query_map([], |row| {
        Ok(json!({
            "name": row.get::<_, String>(0)?,
            "handle": row.get::<_, String>(1)?,
            "url": row.get::<_, String>(2)?,
            "followers": row.get::<_, i64>(3)?,
        }))
    })?;

    rows.collect()
}

pub fn upsert_content(conn: &Connection, entries: &[(String, String)]) -> rusqlite::Result<()> {
    let now = now_secs();
    let mut stmt = conn.prepare(
        "INSERT INTO content (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )?;

    for (key, value) in entries {
        stmt.execute(params![key, value, now])?;
    }

    Ok(())
}

pub fn get_collabs(conn: &Connection) -> rusqlite::Result<Vec<Value>> {
    let mut stmt =
        conn.prepare("SELECT id, name, image, url FROM collabs ORDER BY sort_order, id")?;

    let rows = stmt.query_map([], |row| {
        Ok(json!({
            "id": row.get::<_, i64>(0)?,
            "name": row.get::<_, String>(1)?,
            "image": row.get::<_, String>(2)?,
            "url": row.get::<_, String>(3)?,
        }))
    })?;

    rows.collect()
}

pub fn replace_collabs(conn: &mut Connection, collabs: &[CollabInput]) -> rusqlite::Result<()> {
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM collabs", [])?;

    let now = now_secs();
    {
        let mut stmt = tx.prepare(
            "INSERT INTO collabs (name, image, url, sort_order, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        )?;

        for (index, collab) in collabs.iter().enumerate() {
            stmt.execute(params![
                collab.name,
                collab.image,
                collab.url,
                index as i64,
                now
            ])?;
        }
    }

    tx.commit()?;
    Ok(())
}

pub fn upsert_platforms(conn: &Connection, platforms: &[PlatformInput]) -> rusqlite::Result<()> {
    let now = now_secs();
    let mut stmt = conn.prepare(
        "INSERT INTO platforms (name, handle, url, followers, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(name) DO UPDATE SET
             handle = excluded.handle,
             url = excluded.url,
             followers = excluded.followers,
             updated_at = excluded.updated_at",
    )?;

    for platform in platforms {
        stmt.execute(params![
            platform.name,
            platform.handle,
            platform.url,
            platform.followers,
            now
        ])?;
    }

    Ok(())
}

