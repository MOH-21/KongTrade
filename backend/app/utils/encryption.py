from cryptography.fernet import Fernet
from app.config import get_settings
import base64
import hashlib

settings = get_settings()


def _get_fernet() -> Fernet:
    key = hashlib.sha256(settings.encryption_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_value(value: str) -> str:
    if not value:
        return ""
    f = _get_fernet()
    return f.encrypt(value.encode()).decode()


def decrypt_value(encrypted_value: str) -> str:
    if not encrypted_value:
        return ""
    f = _get_fernet()
    return f.decrypt(encrypted_value.encode()).decode()
