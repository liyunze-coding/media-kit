use crate::cache::Cache;
use reqwest::Client;
use rusqlite::Connection;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub http: Client,
    pub cache: Cache,
    pub twitch_client_id: String,
    pub twitch_client_secret: String,
    pub twitch_login: String,
    pub admin_user: String,
    pub admin_password: String,
}
