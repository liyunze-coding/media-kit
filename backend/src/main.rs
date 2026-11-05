mod api;
mod auth;
mod cache;
mod db;
mod state;
mod twitch;
mod util;

use axum::{
    Router,
    routing::{get, put},
};
use state::AppState;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tower_http::services::ServeDir;

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let db_path = env_or("DATABASE_PATH", "data/media_kit.db");
    if let Some(parent) = std::path::Path::new(&db_path).parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).expect("failed to create database directory");
        }
    }

    let conn = rusqlite::Connection::open(&db_path).expect("failed to open database");
    db::init(&conn).expect("failed to initialize database");

    let app_state = AppState {
        db: Arc::new(Mutex::new(conn)),
        http: reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .expect("failed to create http client"),
        cache: cache::Cache::new(),
        twitch_client_id: env_or("TWITCH_CLIENT_ID", ""),
        twitch_client_secret: env_or("TWITCH_CLIENT_SECRET", ""),
        twitch_login: env_or("TWITCH_LOGIN", "rythondev"),
        admin_user: env_or("ADMIN_USER", "admin"),
        admin_password: env_or("ADMIN_PASSWORD", "change-me"),
    };

    let static_dir = env_or("STATIC_DIR", "frontend/dist");

    let app = Router::new()
        .route("/api/media-kit", get(api::get_media_kit))
        .route("/api/admin/verify", get(api::admin_verify))
        .route("/api/admin/state", get(api::admin_get_state))
        .route("/api/admin/content", put(api::admin_update_content))
        .route("/api/admin/platforms", put(api::admin_update_platforms))
        .fallback_service(ServeDir::new(&static_dir).append_index_html_on_directories(true))
        .with_state(app_state);

    let port = env_or("PORT", "3000");
    let addr = format!("0.0.0.0:{port}");
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|_| panic!("failed to bind to {addr}"));

    println!("RythonDev media kit listening on http://localhost:{port}");
    axum::serve(listener, app).await.expect("server error");
}
