"""
Enhanced Error Handling
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
import traceback

logger = logging.getLogger("api")


class StandardErrorResponse:
    """Standardized error response format"""
    
    @staticmethod
    def create(
        status_code: int,
        message: str,
        error_code: str = None,
        details: dict = None
    ) -> dict:
        """Create standardized error response"""
        response = {
            "success": False,
            "error": {
                "code": error_code or f"HTTP_{status_code}",
                "message": message,
                "status_code": status_code
            }
        }
        
        if details:
            response["error"]["details"] = details
        
        return response


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions"""
    logger.warning(
        f"HTTP Exception: {exc.status_code} - {exc.detail} "
        f"at {request.method} {request.url.path}"
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=StandardErrorResponse.create(
            status_code=exc.status_code,
            message=exc.detail or "An error occurred",
            error_code=f"HTTP_{exc.status_code}"
        )
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    logger.warning(
        f"Validation Error at {request.method} {request.url.path}: {exc.errors()}"
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=StandardErrorResponse.create(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message="Validation error",
            error_code="VALIDATION_ERROR",
            details={"errors": exc.errors()}
        )
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(
        f"Unhandled Exception at {request.method} {request.url.path}: {str(exc)}\n"
        f"{traceback.format_exc()}"
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=StandardErrorResponse.create(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Internal server error",
            error_code="INTERNAL_ERROR"
        )
    )

