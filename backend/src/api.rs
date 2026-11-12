use axum::{
    Json,
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode, header::CONTENT_TYPE},
};
use serde_json::{Value, json};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::auth::is_authorized;
use crate::db::{self, CollabInput, PlatformInput, TwitchLocationInput};
use crate::state::AppState;
use crate::twitch;

const MEDIA_KIT_CACHE_KEY: &str = "media_kit";
const TTL_SECS: u64 = 300;
pub const MAX_UPLOAD_BYTES: usize = 5 * 1024 * 1024;

type ApiError = (StatusCode, Json<Value>);

fn internal_error(message: impl ToString) -> ApiError {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({ "error": message.to_string() })),
    )
}

fn unauthorized() -> ApiError {
    (
        StatusCode::UNAUTHORIZED,
        Json(json!({ "error": "unauthorized" })),
    )
}

fn bad_request(message: &str) -> ApiError {
    (StatusCode::BAD_REQUEST, Json(json!({ "error": message })))
}

fn require_admin(state: &AppState, headers: &HeaderMap) -> Result<(), ApiError> {
    if is_authorized(state, headers) {
        Ok(())
    } else {
        Err(unauthorized())
    }
}

pub async fn get_media_kit(State(state): State<AppState>) -> Result<Json<Value>, ApiError> {
    if let Some(cached) = state.cache.get(MEDIA_KIT_CACHE_KEY) {
        return Ok(Json(cached));
    }

    let content = {
        let conn = state.db.lock().unwrap();
        db::get_content(&conn).map_err(internal_error)?
    };

    let platforms = {
        let conn = state.db.lock().unwrap();
        db::get_platforms(&conn).map_err(internal_error)?
    };

    let collabs = {
        let conn = state.db.lock().unwrap();
        db::get_collabs(&conn).map_err(internal_error)?
    };

    let twitch_locations = {
        let conn = state.db.lock().unwrap();
        db::get_twitch_locations(&conn).map_err(internal_error)?
    };

    let twitch = match twitch::get_twitch(&state).await {
        Ok(value) => value,
        Err(message) => json!({
            "configured": true,
            "found": false,
            "login": state.twitch_login,
            "message": message,
        }),
    };

    let payload = json!({
        "content": content,
        "platforms": platforms,
        "collabs": collabs,
        "twitch": twitch,
        "twitch_locations": twitch_locations,
    });

    state
        .cache
        .set(MEDIA_KIT_CACHE_KEY, payload.clone(), TTL_SECS);

    Ok(Json(payload))
}

pub async fn admin_verify(State(state): State<AppState>, headers: HeaderMap) -> StatusCode {
    if is_authorized(&state, &headers) {
        StatusCode::OK
    } else {
        StatusCode::UNAUTHORIZED
    }
}

pub async fn admin_get_state(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Value>, ApiError> {
    require_admin(&state, &headers)?;

    let conn = state.db.lock().unwrap();
    let content = db::get_content(&conn).map_err(internal_error)?;
    let platforms = db::get_platforms(&conn).map_err(internal_error)?;
    let collabs = db::get_collabs(&conn).map_err(internal_error)?;
    let twitch_locations = db::get_twitch_locations(&conn).map_err(internal_error)?;

    Ok(Json(json!({
        "content": content,
        "platforms": platforms,
        "collabs": collabs,
        "twitch_locations": twitch_locations,
    })))
}

pub async fn admin_update_content(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(entries): Json<HashMap<String, String>>,
) -> Result<Json<Value>, ApiError> {
    require_admin(&state, &headers)?;

    let entries: Vec<(String, String)> = entries.into_iter().collect();

    {
        let conn = state.db.lock().unwrap();
        db::upsert_content(&conn, &entries).map_err(internal_error)?;
    }

    state.cache.invalidate(MEDIA_KIT_CACHE_KEY);

    let conn = state.db.lock().unwrap();
    let content = db::get_content(&conn).map_err(internal_error)?;

    Ok(Json(json!({ "content": content })))
}

pub async fn admin_update_platforms(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(platforms): Json<Vec<PlatformInput>>,
) -> Result<Json<Value>, ApiError> {
    require_admin(&state, &headers)?;

    {
        let conn = state.db.lock().unwrap();
        db::upsert_platforms(&conn, &platforms).map_err(internal_error)?;
    }

    state.cache.invalidate(MEDIA_KIT_CACHE_KEY);

    let conn = state.db.lock().unwrap();
    let saved = db::get_platforms(&conn).map_err(internal_error)?;

    Ok(Json(json!({ "platforms": saved })))
}

pub async fn admin_update_collabs(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(collabs): Json<Vec<CollabInput>>,
) -> Result<Json<Value>, ApiError> {
    require_admin(&state, &headers)?;

    let mut cleaned = Vec::with_capacity(collabs.len());
    for collab in collabs {
        let name = collab.name.trim().to_string();
        let image = collab.image.trim().to_string();
        let url = collab.url.trim().to_string();

        if name.is_empty() && image.is_empty() && url.is_empty() {
            continue;
        }
        if name.is_empty() {
            return Err(bad_request("Each collaboration needs a name"));
        }

        cleaned.push(CollabInput { name, image, url });
    }

    {
        let mut conn = state.db.lock().unwrap();
        db::replace_collabs(&mut conn, &cleaned).map_err(internal_error)?;
    }

    state.cache.invalidate(MEDIA_KIT_CACHE_KEY);

    let conn = state.db.lock().unwrap();
    let saved = db::get_collabs(&conn).map_err(internal_error)?;

    Ok(Json(json!({ "collabs": saved })))
}

pub async fn admin_upload_image(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Json<Value>, ApiError> {
    require_admin(&state, &headers)?;

    let content_type = headers
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let extension = match content_type {
        "image/png" => "png",
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        "image/avif" => "avif",
        _ => return Err(bad_request("Image must be PNG, JPEG, WebP, GIF, or AVIF")),
    };
    if body.is_empty() {
        return Err(bad_request("Image is empty"));
    }

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(internal_error)?
        .as_nanos();
    let filename = format!("{stamp}.{extension}");

    tokio::fs::write(state.uploads_dir.join(&filename), &body)
        .await
        .map_err(internal_error)?;

    Ok(Json(json!({ "url": format!("/uploads/{filename}") })))
}

pub async fn admin_update_twitch_locations(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(locations): Json<Vec<TwitchLocationInput>>,
) -> Result<Json<Value>, ApiError> {
    require_admin(&state, &headers)?;

    let mut cleaned = Vec::with_capacity(locations.len());
    for location in locations {
        let country = location.country.trim().to_string();

        if country.is_empty() && location.percent == 0.0 {
            continue;
        }
        if country.is_empty() {
            return Err(bad_request("Each location needs a country"));
        }
        if !location.percent.is_finite() || !(0.0..=100.0).contains(&location.percent) {
            return Err(bad_request("Percentages must be between 0 and 100"));
        }

        cleaned.push(TwitchLocationInput {
            country,
            percent: location.percent,
        });
    }

    let total: f64 = cleaned.iter().map(|location| location.percent).sum();
    if total > 100.0 + 1e-6 {
        return Err(bad_request("Percentages add up to more than 100"));
    }

    {
        let mut conn = state.db.lock().unwrap();
        db::replace_twitch_locations(&mut conn, &cleaned).map_err(internal_error)?;
    }

    state.cache.invalidate(MEDIA_KIT_CACHE_KEY);

    let conn = state.db.lock().unwrap();
    let saved = db::get_twitch_locations(&conn).map_err(internal_error)?;

    Ok(Json(json!({ "twitch_locations": saved })))
}

