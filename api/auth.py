from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
from typing import Optional
import logging
import uuid

logger = logging.getLogger(__name__)

security = HTTPBearer()

async def get_current_user(request: Request) -> str:
    """
    Extract user ID from request headers, cookies, or JWT token.
    For demo purposes, falls back to a demo user ID.
    """
    try:
        # Try to get user ID from headers
        user_id = request.headers.get("x-user-id")
        if user_id:
            return user_id
            
        # Try to get from cookies
        user_id = request.cookies.get("user_id")
        if user_id:
            return user_id
            
        # Try to get from Authorization header (JWT token)
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            # In a real implementation, you'd decode the JWT here
            # For now, just return a demo user ID
            return "demo-user-001"
            
        # Fallback to demo user for development
        return "demo-user-001"
        
    except Exception as e:
        print(f"Auth error: {e}")
        # Fallback to demo user
        return "demo-user-001"

async def get_current_user_optional(request: Request) -> Optional[str]:
    """
    Get current user but don't fail if not authenticated.
    Returns None if no user found.
    """
    try:
        return await get_current_user(request)
    except:
        return None 