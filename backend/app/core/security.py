import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import types
import bcrypt
from jose import jwt
from passlib.context import CryptContext

# Compatibility shim for passlib with bcrypt >= 4.0
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = types.SimpleNamespace(__version__=getattr(bcrypt, "__version__", "4.0.0"))

_orig_hashpw = bcrypt.hashpw


def _safe_hashpw(password, salt):
    if isinstance(password, str):
        password = password.encode("utf-8")
    if len(password) > 72:
        password = password[:72]
    return _orig_hashpw(password, salt)


bcrypt.hashpw = _safe_hashpw

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def get_secret_key() -> str:
    """Read secret key from environment variable SECRET_KEY."""
    return os.getenv("SECRET_KEY", "insecure-dev-secret-key-change-in-production")


def get_access_token_expire_minutes() -> int:
    """Read token expiry in minutes from ACCESS_TOKEN_EXPIRE_MINUTES, defaulting to 30."""
    return int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the stored bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt scheme."""
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token with expiration."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=get_access_token_expire_minutes())
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, get_secret_key(), algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT access token."""
    return jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])

