from typing import Any, Optional

from fastapi import HTTPException, status


class BaseError(HTTPException):
    """Base class for all custom exceptions"""

    def __init__(
        self,
        status_code: int,
        message: str,
        error_code: str = None,
        details: Any = None,
    ):
        """Initialize the base error"""
        super().__init__(
            status_code=status_code,
            detail={
                "message": message,
                "error_code": error_code or "ERROR",
                "details": details,
            },
        )


class NotFoundError(BaseError):
    """Raised when a resource is not found"""

    def __init__(
        self,
        message: str = "Resource not found",
        error_code: str = "NOT_FOUND",
        details: Any = None,
    ):
        """Initialize the not found error"""
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=message,
            error_code=error_code,
            details=details,
        )


class ValidationError(BaseError):
    """Raised when validation fails"""

    def __init__(
        self,
        message: str = "Validation error",
        error_code: str = "VALIDATION_ERROR",
        details: Any = None,
    ):
        """Initialize the validation error"""
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message=message,
            error_code=error_code,
            details=details,
        )


class AuthenticationError(BaseError):
    """Raised when authentication fails"""

    def __init__(
        self,
        message: str = "Authentication failed",
        error_code: str = "AUTHENTICATION_ERROR",
        details: Any = None,
    ):
        """Initialize the authentication error"""
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            error_code=error_code,
            details=details,
        )


class AuthorizationError(BaseError):
    """Raised when user doesn't have required permissions"""

    def __init__(
        self,
        message: str = "Not authorized",
        error_code: str = "AUTHORIZATION_ERROR",
        details: Any = None,
    ):
        """Initialize the authorization error"""
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=message,
            error_code=error_code,
            details=details,
        )


class DatabaseError(BaseError):
    """Raised when database operations fail"""

    def __init__(
        self,
        message: str = "Database operation failed",
        error_code: str = "DATABASE_ERROR",
        details: Any = None,
    ):
        """Initialize the database error"""
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=message,
            error_code=error_code,
            details=details,
        )


class DuplicateError(BaseError):
    """
    Raised when attempting to create a resource that already exists
    or when unique constraints are violated.
    """

    def __init__(
        self,
        message: str = "Resource already exists",
        error_code: str = "DUPLICATE_ERROR",
        details: Any = None,
        field: Optional[str] = None,
        value: Optional[Any] = None,
    ):
        """Initialize the duplicate error"""
        # If field and value are provided, add them to details
        if field and value:
            details = details or {}
            if isinstance(details, dict):
                details.update({"field": field, "value": value, "constraint": "unique"})

        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            message=message,
            error_code=error_code,
            details=details,
        )


class InternalServerError(BaseError):
    """Raised when an internal server error occurs"""

    def __init__(
        self,
        message: str = "Internal server error",
        error_code: str = "INTERNAL_SERVER_ERROR",
        details: Any = None,
    ):
        """Initialize the internal server error"""
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=message,
            error_code=error_code,
            details=details,
        )
