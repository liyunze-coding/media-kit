use crate::state::AppState;
use axum::http::{HeaderMap, header};
use base64::Engine;

pub fn is_authorized(state: &AppState, headers: &HeaderMap) -> bool {
    let Some(value) = headers.get(header::AUTHORIZATION) else {
        return false;
    };

    let Ok(value) = value.to_str() else {
        return false;
    };

    let Some(encoded) = value.strip_prefix("Basic ") else {
        return false;
    };

    let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(encoded) else {
        return false;
    };

    let Ok(decoded) = String::from_utf8(bytes) else {
        return false;
    };

    let mut parts = decoded.splitn(2, ':');
    let user = parts.next().unwrap_or("");
    let pass = parts.next().unwrap_or("");

    user == state.admin_user && pass == state.admin_password
}
