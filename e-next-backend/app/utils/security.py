import secrets
from base64 import b64encode
from datetime import UTC, datetime, timedelta
from typing import Any, Dict, Optional

from cryptography.fernet import Fernet
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.base.models import AuthenticationError
from app.core import settings

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class SecurityUtils:
    """Security utilities"""

    def __init__(self):
        """Initialize security utilities"""
        self.secret_key = settings.JWT_SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_minutes = settings.REFRESH_TOKEN_EXPIRE_MINUTES

    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against hash"""
        return pwd_context.verify(plain_password, hashed_password)

    def create_access_token(self, data: dict) -> str:
        """Create access token"""
        to_encode = data.copy()
        expire = datetime.now(UTC) + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire, "type": "access"})

        try:
            encoded_jwt = jwt.encode(
                to_encode, self.secret_key, algorithm=self.algorithm
            )
            return encoded_jwt
        except Exception as e:
            raise AuthenticationError(
                message="Could not create access token",
                error_code="TOKEN_CREATION_FAILED",
            )

    def create_refresh_token(self, data: dict) -> str:
        """Create refresh token"""
        to_encode = data.copy()
        expire = datetime.now(UTC) + timedelta(
            minutes=self.refresh_token_expire_minutes
        )
        to_encode.update({"exp": expire, "type": "refresh"})

        try:
            encoded_jwt = jwt.encode(
                to_encode, self.secret_key, algorithm=self.algorithm
            )
            return encoded_jwt
        except Exception as e:
            raise AuthenticationError(
                message="Could not create refresh token",
                error_code="TOKEN_CREATION_FAILED",
            )

    def decrypt_user_type(self, encrypted_user_type: str) -> str:
        """Decrypt user type"""
        try:
            key = b64encode(settings.JWT_SECRET_KEY.encode()[:32]).decode()
            f = Fernet(key.encode())

            decrypted_user_type = f.decrypt(encrypted_user_type.encode()).decode()
            return decrypted_user_type
        except Exception as e:
            raise AuthenticationError(
                message="Could not decrypt user type",
                error_code="USER_TYPE_DECRYPTION_FAILED",
            )

    def verify_token(self, token: str, token_type: str = "access") -> Dict[str, Any]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            if "ut" in payload:
                payload["ut"] = self.decrypt_user_type(payload["ut"])

            # Verify token type
            if payload.get("type") != token_type:
                raise AuthenticationError(
                    message="Invalid token type", error_code="INVALID_TOKEN_TYPE"
                )

            return payload

        except JWTError:
            raise AuthenticationError(
                message="Invalid token", error_code="INVALID_TOKEN"
            )

    def decode_jwt_token(
        self, token: str, verify_exp: bool = True, token_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Decode and validate JWT token

        Args:
            token: The JWT token to decode
            verify_exp: Whether to verify token expiration
            token_type: Expected token type ('access' or 'refresh')

        Returns:
            Dict containing the decoded token payload

        Raises:
            AuthenticationError: If token is invalid or expired
        """
        try:
            # Decode the token
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                options={"verify_exp": verify_exp},
            )

            # Verify token type if specified
            if token_type and payload.get("type") != token_type:
                raise AuthenticationError(
                    message=f"Invalid token type. Expected {token_type}",
                    error_code="INVALID_TOKEN_TYPE",
                    details={
                        "expected_type": token_type,
                        "received_type": payload.get("type"),
                    },
                )

            # Verify required claims
            required_claims = ["sub", "type", "exp"]
            missing_claims = [
                claim for claim in required_claims if claim not in payload
            ]
            if missing_claims:
                raise AuthenticationError(
                    message="Invalid token claims",
                    error_code="INVALID_TOKEN_CLAIMS",
                    details={"missing_claims": missing_claims},
                )

            # Check token expiration manually if verify_exp is False
            if not verify_exp and "exp" in payload:
                exp_datetime = datetime.fromtimestamp(payload["exp"], UTC)
                if exp_datetime < datetime.now(UTC):
                    raise AuthenticationError(
                        message="Token has expired",
                        error_code="TOKEN_EXPIRED",
                        details={"expired_at": exp_datetime.isoformat()},
                    )

            return payload

        except JWTError as e:
            raise AuthenticationError(
                message="Invalid token format",
                error_code="INVALID_TOKEN_FORMAT",
                details=str(e),
            )
        except Exception as e:
            raise AuthenticationError(
                message="Token validation failed",
                error_code="TOKEN_VALIDATION_FAILED",
                details=str(e),
            )


security = SecurityUtils()


def decode_jwt_token(
    token: str, verify_exp: bool = True, token_type: Optional[str] = None
) -> Dict[str, Any]:
    """Convenience function to decode JWT token"""
    return security.decode_jwt_token(token, verify_exp, token_type)


def decrypt_user_type(encrypted_user_type: str) -> str:
    """Decrypt user type"""
    return security.decrypt_user_type(encrypted_user_type)


def generate_api_key(prefix: str = "ak", length: int = 32) -> str:
    """Generate a secure API key
    
    Args:
        prefix: Prefix for the API key (e.g., 'ak', 'pk')
        length: Length of the random part (default 32)
    
    Returns:
        str: Generated API key in format prefix_random_string
    """
    random_part = secrets.token_urlsafe(length)
    return f"{prefix}_{random_part}"


def generate_secret_key(length: int = 64) -> str:
    """Generate a secure secret key
    
    Args:
        length: Length of the secret key (default 64)
    
    Returns:
        str: Generated secret key
    """
    return secrets.token_urlsafe(length)
