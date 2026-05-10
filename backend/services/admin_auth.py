from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any, Dict

from fastapi import Depends, Header, HTTPException, status

from core.config import Settings, get_settings


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64url_decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + padding)


def create_access_token(username: str, settings: Settings) -> str:
    expires_at = int(time.time()) + settings.admin_token_expire_minutes * 60
    payload = {
        "sub": username,
        "exp": expires_at,
    }
    payload_segment = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(
        settings.admin_token_secret.encode("utf-8"),
        payload_segment.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    signature_segment = _b64url_encode(signature)
    return f"{payload_segment}.{signature_segment}"


def verify_access_token(token: str, settings: Settings) -> Dict[str, Any]:
    try:
        payload_segment, signature_segment = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    expected_signature = hmac.new(
        settings.admin_token_secret.encode("utf-8"),
        payload_segment.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    expected_signature_segment = _b64url_encode(expected_signature)
    if not hmac.compare_digest(signature_segment, expected_signature_segment):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")

    payload = json.loads(_b64url_decode(payload_segment).decode("utf-8"))
    if int(payload.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    return payload


def require_admin(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    return verify_access_token(token, settings)
