import types
import bcrypt
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


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the stored bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt scheme."""
    return pwd_context.hash(password)
