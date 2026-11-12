use crate::state::AppState;
use crate::util::now_secs;
use serde_json::{Value, json};

const TWITCH_CACHE_KEY: &str = "twitch";
const TOKEN_CACHE_KEY: &str = "twitch_token";
const TTL_SECS: u64 = 300;

pub async fn get_twitch(state: &AppState) -> Result<Value, String> {
    if let Some(cached) = state.cache.get(TWITCH_CACHE_KEY) {
        return Ok(cached);
    }

    let data = fetch_twitch(state).await?;
    state.cache.set(TWITCH_CACHE_KEY, data.clone(), TTL_SECS);
    Ok(data)
}

async fn fetch_twitch(state: &AppState) -> Result<Value, String> {
    if state.twitch_client_id.is_empty() || state.twitch_client_secret.is_empty() {
        return Ok(json!({
            "configured": false,
            "login": state.twitch_login,
            "message": "Twitch credentials are not configured",
        }));
    }

    let token = get_token(state).await?;
    let login = state.twitch_login.clone();

    let users = helix_get(state, &token, "https://api.twitch.tv/helix/users", &[("login", login.as_str())]).await?;

    let user = users
        .get("data")
        .and_then(|data| data.get(0))
        .cloned()
        .unwrap_or(Value::Null);

    if user.is_null() {
        return Ok(json!({
            "configured": true,
            "found": false,
            "login": login,
            "message": "Twitch channel not found",
        }));
    }

    let user_id = user
        .get("id")
        .and_then(|id| id.as_str())
        .ok_or_else(|| "Twitch user id missing from response".to_string())?
        .to_string();

    let stream_query = [("user_id", user_id.as_str())];
    let (followers, streams, last_stream) = tokio::join!(
        get_follower_count(state, &token, &user_id),
        helix_get(
            state,
            &token,
            "https://api.twitch.tv/helix/streams",
            &stream_query,
        ),
        get_last_stream(state, &token, &user_id),
    );

    let stream = streams
        .ok()
        .and_then(|body| body.get("data").and_then(|data| data.get(0)).cloned())
        .unwrap_or(Value::Null);

    let live = !stream.is_null();

    Ok(json!({
        "configured": true,
        "found": true,
        "login": user.get("login").cloned().unwrap_or(Value::String(login)),
        "display_name": user.get("display_name").cloned().unwrap_or(Value::Null),
        "profile_image_url": user.get("profile_image_url").cloned().unwrap_or(Value::Null),
        "followers": followers,
        "live": live,
        "title": stream.get("title").cloned().unwrap_or(Value::Null),
        "game_name": stream.get("game_name").cloned().unwrap_or(Value::Null),
        "viewer_count": stream.get("viewer_count").cloned().unwrap_or(Value::Null),
        "started_at": stream.get("started_at").cloned().unwrap_or(Value::Null),
        "last_stream": last_stream,
        "updated_at": now_secs(),
    }))
}

async fn get_last_stream(state: &AppState, token: &str, user_id: &str) -> Value {
    let video_query = [("user_id", user_id), ("type", "archive"), ("first", "1")];
    let channel_query = [("broadcaster_id", user_id)];
    let (videos, channels) = tokio::join!(
        helix_get(
            state,
            token,
            "https://api.twitch.tv/helix/videos",
            &video_query,
        ),
        helix_get(
            state,
            token,
            "https://api.twitch.tv/helix/channels",
            &channel_query,
        ),
    );

    let first = |body: Result<Value, String>| {
        body.ok()
            .and_then(|body| body.get("data").and_then(|data| data.get(0)).cloned())
            .unwrap_or(Value::Null)
    };
    let video = first(videos);
    let channel = first(channels);

    if video.is_null() && channel.is_null() {
        return Value::Null;
    }

    // VODs carry no category, so the channel's current category stands in for it.
    let field = |source: &Value, key: &str| source.get(key).cloned().unwrap_or(Value::Null);
    let title = match field(&video, "title") {
        Value::Null => field(&channel, "title"),
        title => title,
    };

    json!({
        "title": title,
        "game_name": field(&channel, "game_name"),
        "started_at": field(&video, "created_at"),
        "duration": field(&video, "duration"),
        "view_count": field(&video, "view_count"),
        "url": field(&video, "url"),
    })
}

async fn get_follower_count(state: &AppState, token: &str, user_id: &str) -> i64 {
    // Get Users Follows was removed (410 Gone). Channel Followers returns `total`
    // for app access tokens; the follower list itself requires a user token.
    match helix_get(
        state,
        token,
        "https://api.twitch.tv/helix/channels/followers",
        &[("broadcaster_id", user_id), ("first", "1")],
    )
    .await
    {
        Ok(body) => body
            .get("total")
            .and_then(|total| total.as_i64())
            .unwrap_or(0),
        Err(_) => 0,
    }
}

async fn helix_get(
    state: &AppState,
    token: &str,
    url: &str,
    query: &[(&str, &str)],
) -> Result<Value, String> {
    state
        .http
        .get(url)
        .query(query)
        .header("Client-Id", &state.twitch_client_id)
        .header("Authorization", format!("Bearer {token}"))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())
}

async fn get_token(state: &AppState) -> Result<String, String> {
    if let Some(cached) = state.cache.get(TOKEN_CACHE_KEY) {
        if let Some(token) = cached.get("access_token").and_then(|t| t.as_str()) {
            return Ok(token.to_string());
        }
    }

    let response: Value = state
        .http
        .post("https://id.twitch.tv/oauth2/token")
        .query(&[
            ("client_id", state.twitch_client_id.as_str()),
            ("client_secret", state.twitch_client_secret.as_str()),
            ("grant_type", "client_credentials"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let token = response
        .get("access_token")
        .and_then(|t| t.as_str())
        .ok_or_else(|| "Twitch token missing access_token".to_string())?
        .to_string();

    let expires_in = response
        .get("expires_in")
        .and_then(|t| t.as_u64())
        .unwrap_or(3600);

    let ttl = expires_in.saturating_sub(60).max(60);
    state
        .cache
        .set(TOKEN_CACHE_KEY, json!({ "access_token": token }), ttl);

    Ok(token)
}
