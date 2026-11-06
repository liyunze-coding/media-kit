use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode},
};
use serde_json::{Value, json};
use std::collections::HashMap;

use crate::auth::is_authorized;
use crate::db::{self, CollabInput, PlatformInput};
use crate::state::AppState;
use crate::twitch;

const MEDIA_KIT_CACHE_KEY: &str = "media_kit";
const TTL_SECS: u64 = 300;

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

    Ok(Json(json!({
        "content": content,
        "platforms": platforms,
        "collabs": collabs,
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

