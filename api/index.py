from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pydantic import BaseModel
from typing import List, Optional
import os
import traceback
from datetime import datetime
from itertools import islice
from urllib.parse import unquote
from mangum import Mangum
from fastapi.responses import JSONResponse
# Try-catch imports to handle missing dependencies gracefully
try:
    from auth import get_current_user
    AUTH_AVAILABLE = True
except ImportError as e:
    print(f"Auth import failed: {e}")
    AUTH_AVAILABLE = False

try:
    from backend.database import (
        get_all_businesses,
        get_businesses_by_status,
        update_business,
        create_business,
        delete_business,
        get_all_meetings,
        create_meeting,
        update_meeting,
        delete_meeting,
        get_all_clients,
        create_client,
        update_client,
        delete_client,
        get_callbacks_due_today,
        get_overdue_callbacks
    )
    DATABASE_AVAILABLE = True
except ImportError as e:
    print(f"Database import failed: {e}")
    DATABASE_AVAILABLE = False

try:
    from models import Business, BusinessUpdate, NewBusiness, Meeting, Client
    MODELS_AVAILABLE = True
except ImportError as e:
    print(f"Models import failed: {e}")
    MODELS_AVAILABLE = False

app = FastAPI()

# Enable CORS - update with your Vercel frontend URL when deployed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this with your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    try:
        return {"status": "ok", "message": "API is running", "timestamp": str(datetime.now())}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/debug")
async def debug_info():
    """Debug endpoint to check environment configuration"""
    try:
        import os
        return {
            "supabase_url_set": bool(os.getenv("SUPABASE_URL")),
            "supabase_key_set": bool(os.getenv("SUPABASE_KEY")),
            "environment_variables": list(os.environ.keys()),
            "imports": {
                "auth_available": AUTH_AVAILABLE,
                "database_available": DATABASE_AVAILABLE,
                "models_available": MODELS_AVAILABLE
            },
            "api_status": "debug endpoint working"
        }
    except Exception as e:
        return {"error": str(e), "status": "debug failed"}

@app.get("/api/test")
async def test_endpoint():
    """Simple test endpoint to verify API is accessible"""
    try:
        return {
            "message": "API is accessible", 
            "timestamp": str(datetime.now()),
            "status": "working"
        }
    except Exception as e:
        return {"error": str(e), "status": "failed"}

@app.get("/api/simple")
async def simple_test():
    """Ultra simple test without any imports"""
    return {"message": "Simple endpoint working", "status": "ok"}

@app.get("/api/businesses")
async def get_businesses(request: Request):
    try:
        if not AUTH_AVAILABLE or not DATABASE_AVAILABLE or not MODELS_AVAILABLE:
            return {"error": "Required modules not available", "missing": {
                "auth": not AUTH_AVAILABLE,
                "database": not DATABASE_AVAILABLE, 
                "models": not MODELS_AVAILABLE
            }}
        user_id = await get_current_user(request)
        return await get_all_businesses(user_id)
    except Exception as e:
        return {"error": str(e), "status": "businesses endpoint failed"}

@app.get("/api/businesses/{status}", response_model=List[Business])
async def get_businesses_by_status_route(status: str, request: Request):
    user_id = await get_current_user(request)
    return await get_businesses_by_status(status, user_id)

@app.post("/api/businesses", response_model=Business)
async def create_business_route(business: NewBusiness, request: Request):
    try:
        user_id = await get_current_user(request)
        return await create_business(business, user_id)
    except Exception as e:
        # If there's an error (e.g., database constraint), raise an HTTPException
        # The frontend is already set up to handle 400 errors and continue
        raise HTTPException(status_code=400, detail=f"Failed to add business: {str(e)}")

@app.put("/api/businesses/{business_id}", response_model=Business)
async def update_business_route(business_id: int, business: BusinessUpdate, request: Request):
    user_id = await get_current_user(request)
    return await update_business(business_id, business, user_id)

@app.delete("/api/businesses/{business_id}")
async def delete_business_route(business_id: int, request: Request):
    user_id = await get_current_user(request)
    return await delete_business(business_id, user_id)

@app.post("/api/businesses/upload", response_model=List[Business])
async def upload_businesses_route(businesses: List[NewBusiness], request: Request):
    user_id = await get_current_user(request)
    print(f"Received request to upload {len(businesses)} businesses for user {user_id}.")
    created_businesses = []
    failed_businesses = []
    for i, business in enumerate(businesses):
        try:
            print(f"Processing business #{i+1}: {business.name}")
            created_business = await create_business(business, user_id)
            created_businesses.append(created_business)
            print(f"Successfully created business #{i+1}: {business.name}")
        except Exception as e:
            # Continue processing other businesses even if one fails
            error_message = f"Failed to create business {business.name}: {e}"
            print(error_message)
            # Optionally, you can collect failed businesses and report them
            failed_businesses.append({"name": business.name, "error": str(e)})

    print(f"Upload complete. Successfully created: {len(created_businesses)}, Failed: {len(failed_businesses)}")
    if failed_businesses:
        # You could raise an exception here or return a mixed response
        # For now, just returning successfully created ones
        print("Failed businesses:", failed_businesses)

    return created_businesses

@app.get("/api/meetings", response_model=List[Meeting])
async def get_meetings():
    return await get_all_meetings()

@app.post("/api/meetings", response_model=Meeting)
async def create_meeting_route(meeting: Meeting):
    return await create_meeting(meeting)

@app.put("/api/meetings/{meeting_id}", response_model=Meeting)
async def update_meeting_route(meeting_id: int, meeting: Meeting):
    return await update_meeting(meeting_id, meeting)

@app.delete("/api/meetings/{meeting_id}")
async def delete_meeting_route(meeting_id: int):
    return await delete_meeting(meeting_id)

@app.get("/api/clients", response_model=List[Client])
async def get_clients():
    return await get_all_clients()

@app.post("/api/clients", response_model=Client)
async def create_client_route(client: Client):
    return await create_client(client)

@app.put("/api/clients/{client_id}", response_model=Client)
async def update_client_route(client_id: int, client: Client):
    return await update_client(client_id, client)

@app.delete("/api/clients/{client_id}")
async def delete_client_route(client_id: int):
    return await delete_client(client_id)

@app.get("/api/callbacks/today", response_model=List[Business])
async def get_today_callbacks(request: Request):
    user_id = await get_current_user(request)
    return await get_callbacks_due_today(user_id)

@app.get("/api/callbacks/overdue", response_model=List[Business])
async def get_overdue_callbacks_route(request: Request):
    user_id = await get_current_user(request)
    return await get_overdue_callbacks(user_id)

@app.get("/api/calls", response_model=List[Business])
async def get_calls(request: Request):
    """Get all businesses for calling purposes - alias for businesses endpoint"""
    user_id = await get_current_user(request)
    return await get_all_businesses(user_id)

@app.get("/api/calls/{status}", response_model=List[Business])
async def get_calls_by_status(status: str, request: Request):
    """Get businesses by status for calling purposes"""
    user_id = await get_current_user(request)
    return await get_businesses_by_status(status, user_id)

# Add error handling middleware
@app.middleware("http")
async def error_handling_middleware(request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        print(f"Middleware error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": str(e), "traceback": traceback.format_exc()}
        )

# Vercel serverless handler
handler = Mangum(app, lifespan="off") 