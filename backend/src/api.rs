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
use crate::db::{
    self, AudienceAgeGenderInput, AudienceGenderInput, CollabInput, PlatformInput,
    TwitchLocationInput,
};
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

    let (audience_genders, audience_age_genders) = {
        let conn = state.db.lock().unwrap();
        (
            db::get_audience_genders(&conn).map_err(internal_error)?,
            db::get_audience_age_genders(&conn).map_err(internal_error)?,
        )
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
        "audience_genders": audience_genders,
        "audience_age_genders": audience_age_genders,
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
    let audience_genders = db::get_audience_genders(&conn).map_err(internal_error)?;
    let audience_age_genders = db::get_audience_age_genders(&conn).map_err(internal_error)?;

    Ok(Json(json!({
        "content": content,
        "platforms": platforms,
        "collabs": collabs,
        "twitch_locations": twitch_locations,
        "audience_genders": audience_genders,
        "audience_age_genders": audience_age_genders,
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

fn validate_percent(percent: f64) -> Result<(), ApiError> {
    if !percent.is_finite() || !(0.0..=100.0).contains(&percent) {
        return Err(bad_request("Percentages must be between 0 and 100"));
    }
    Ok(())
}

fn validate_total(total: f64) -> Result<(), ApiError> {
    if total > 100.0 + 1e-6 {
        return Err(bad_request("Percentages add up to more than 100"));
    }
    Ok(())
}

pub async fn admin_update_audience_genders(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(genders): Json<Vec<AudienceGenderInput>>,
) -> Result<Json<Value>, ApiError> {
    require_admin(&state, &headers)?;

    let mut cleaned = Vec::with_capacity(genders.len());
    for entry in genders {
        let gender = entry.gender.trim().to_string();
        let color = entry
            .color
            .map(|color| color.trim().to_string())
            .filter(|color| !color.is_empty());

        if gender.is_empty() && entry.percent == 0.0 {
            continue;
        }
        if gender.is_empty() {
            return Err(bad_request("Each gender row needs a name"));
        }
        validate_percent(entry.percent)?;

        cleaned.push(AudienceGenderInput {
            gender,
            percent: entry.percent,
            color,
        });
    }
    validate_total(cleaned.iter().map(|entry| entry.percent).sum())?;

    {
        let mut conn = state.db.lock().unwrap();
        db::replace_audience_genders(&mut conn, &cleaned).map_err(internal_error)?;
    }

    state.cache.invalidate(MEDIA_KIT_CACHE_KEY);

    let conn = state.db.lock().unwrap();
    let saved = db::get_audience_genders(&conn).map_err(internal_error)?;

    Ok(Json(json!({ "audience_genders": saved })))
}

pub async fn admin_update_audience_age_genders(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(rows): Json<Vec<AudienceAgeGenderInput>>,
) -> Result<Json<Value>, ApiError> {
    require_admin(&state, &headers)?;

    let mut cleaned = Vec::with_capacity(rows.len());
    for row in rows {
        let age_range = row.age_range.trim().to_string();
        let gender = row.gender.trim().to_string();

        if age_range.is_empty() && gender.is_empty() && row.percent == 0.0 {
            continue;
        }
        if age_range.is_empty() || gender.is_empty() {
            return Err(bad_request("Each age row needs an age range and gender"));
        }
        validate_percent(row.percent)?;

        cleaned.push(AudienceAgeGenderInput {
            age_range,
            gender,
            percent: row.percent,
        });
    }
    validate_total(cleaned.iter().map(|row| row.percent).sum())?;

    {
        let mut conn = state.db.lock().unwrap();
        db::replace_audience_age_genders(&mut conn, &cleaned).map_err(internal_error)?;
    }

    state.cache.invalidate(MEDIA_KIT_CACHE_KEY);

    let conn = state.db.lock().unwrap();
    let saved = db::get_audience_age_genders(&conn).map_err(internal_error)?;

    Ok(Json(json!({ "audience_age_genders": saved })))
}

