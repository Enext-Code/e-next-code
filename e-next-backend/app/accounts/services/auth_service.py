from base64 import b64encode
from datetime import UTC, datetime, timedelta
from typing import Dict

from bson import ObjectId
from cryptography.fernet import Fernet
from jose import ExpiredSignatureError, JWTError, jwt

from app.base.models import AuthenticationError
from app.core import settings
from app.utils import security

from ..models import User
from ..schemas import TokenData


class AuthService:
    """Authentication service"""

    @staticmethod
    async def authenticate_user(username: str, password: str) -> User:
        """Authenticate user and update last login
        
        Accepts both username and email as the username parameter.
        """
        try:
            # Find user by username or email
            user = await User.find_one({
                "$or": [
                    {"username": username},
                    {"email": username}
                ]
            })
            if not user:
                raise AuthenticationError(
                    message="Invalid credentials", error_code="INVALID_CREDENTIALS"
                )

            # Verify password
            if not user.hashed_password or not security.verify_password(
                password, user.hashed_password
            ):
                raise AuthenticationError(
                    message="Invalid credentials", error_code="INVALID_CREDENTIALS"
                )

            # Get active profile
            profile = await user.get_active_profile()
            if not profile:
                raise AuthenticationError(
                    message="User has no active profile", error_code="NO_ACTIVE_PROFILE"
                )

            user.profile = profile

            # Update last login separately
            try:
                now = datetime.now(UTC)
                await User.get_collection().update_one(
                    {"_id": ObjectId(user.id)}, {"$set": {"last_login": now}}
                )
                user.last_login = now
            except Exception as e:
                # Log error but don't fail authentication
                print(f"Failed to update last_login: {str(e)}")

            return user

        except AuthenticationError:
            raise
        except Exception as e:
            raise AuthenticationError(
                message="Invalid credentials", error_code="INVALID_CREDENTIALS"
            )

    @staticmethod
    async def create_tokens(
        user_id: str, user_type: str, profile_id: str, organisation_id: str
    ) -> Dict[str, str]:
        """Create access and refresh tokens"""
        key = b64encode(settings.JWT_SECRET_KEY.encode()[:32]).decode()
        f = Fernet(key.encode())
        encrypted_user_type = f.encrypt(user_type.encode()).decode()
        token_data = {
            "sub": user_id,
            "ut": encrypted_user_type,
            "pid": profile_id,
            "oid": organisation_id,
        }

        return {
            "access_token": security.create_access_token(token_data),
            "refresh_token": security.create_refresh_token(token_data),
            "token_type": "bearer",
        }

    @staticmethod
    async def create_user(username: str, password: str) -> User:
        """Create a new user with hashed password"""
        hashed_password = security.get_password_hash(password)
        user = await User.create(username=username, hashed_password=hashed_password)
        return user

    @staticmethod
    async def generate_otp_for_user(user_id: str) -> str:
        """Generate and store OTP for user"""
        otp = security.generate_otp()
        # Store OTP in Redis or database with expiration
        return otp

    @staticmethod
    def generate_api_key_for_partner() -> str:
        """Generate API key for partner"""
        return security.generate_api_key(prefix="pk")

    @staticmethod
    async def verify_refresh_token(refresh_token: str) -> TokenData:
        """
        Verify refresh token and return token data

        Args:
            refresh_token: JWT refresh token string

        Returns:
            TokenData containing user information

        Raises:
            AuthenticationError: If token is invalid, expired, or wrong type
        """
        try:
            payload = jwt.decode(
                refresh_token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )

            # Verify this is a refresh token
            if payload.get("type") != "refresh":
                raise AuthenticationError(
                    message="Invalid token type", error_code="INVALID_TOKEN_TYPE"
                )

            # Verify required fields exist
            user_id = payload.get("sub")
            if not user_id:
                raise AuthenticationError(
                    message="Invalid token payload", error_code="INVALID_TOKEN_PAYLOAD"
                )

            user = await User.find_one({"_id": ObjectId(user_id)})
            if not user:
                raise AuthenticationError(
                    message="User profile not found",
                    error_code="USER_PROFILE_NOT_FOUND",
                )

            profile = await user.get_active_profile()
            if not profile:
                raise AuthenticationError(
                    message="User profile not found",
                    error_code="USER_PROFILE_NOT_FOUND",
                )

            token_data = TokenData(
                user_id=user_id,
                user_type=profile.user_type,
                profile_id=str(profile.id),
                current_organisation_id=str(user.current_organisation_id),
            )

            return token_data

        except ExpiredSignatureError:
            raise AuthenticationError(
                message="Refresh token has expired", error_code="TOKEN_EXPIRED"
            )
        except JWTError:
            raise AuthenticationError(
                message="Invalid refresh token", error_code="INVALID_REFRESH_TOKEN"
            )

    @staticmethod
    async def logout(token: str) -> None:
        """
        Logout user by forcing token expiration

        Args:
            token: Current access token
        """
        try:

            payload = jwt.decode(
                token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
            )

            exp = payload.get("exp")
            if not exp:
                raise AuthenticationError(
                    message="Invalid token format", error_code="INVALID_TOKEN"
                )

            exp_datetime = datetime.fromtimestamp(exp, UTC)
            ttl = (exp_datetime - datetime.now(UTC)).total_seconds()

            if ttl <= 0:
                raise AuthenticationError(
                    message="Token has already expired", error_code="TOKEN_EXPIRED"
                )

            # Token blacklisting functionality removed (cache was used for this)
            # Note: Token blacklisting is now disabled. Tokens will remain valid until expiration.

        except Exception as e:
            raise AuthenticationError(
                message="Failed to logout", error_code="LOGOUT_FAILED"
            )

    @staticmethod
    async def is_token_blacklisted(token: str) -> bool:
        """
        Check if a token is blacklisted

        Args:
            token: Token to check

        Returns:
            bool: True if token is blacklisted
        """
        # Token blacklisting functionality removed (cache was used for this)
        # Note: Token blacklisting is now disabled. All tokens are considered valid until expiration.
        return False
