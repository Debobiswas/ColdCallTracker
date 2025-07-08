from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pydantic import BaseModel
from typing import List, Optional
import os
import traceback
import json
from datetime import datetime
from itertools import islice
from urllib.parse import unquote
from mangum import Mangum
from fastapi.responses import JSONResponse
# Try-catch imports to handle missing dependencies gracefully
try:
    from .auth import get_current_user
    AUTH_AVAILABLE = True
except ImportError as e:
    print(f"Auth import failed: {e}")
    try:
        from auth import get_current_user
        AUTH_AVAILABLE = True
    except ImportError as e2:
        print(f"Auth import failed (both attempts): {e}, {e2}")
        AUTH_AVAILABLE = False

try:
    from .database import (
        get_all_businesses,
        get_businesses_by_status,
        update_business,
        create_business,
        get_all_meetings,
        create_meeting,
        update_meeting,
        get_all_clients,
        create_client,
        update_client,
        get_callbacks_due_today,
        get_overdue_callbacks
    )
    DATABASE_AVAILABLE = True
except ImportError as e:
    print(f"Database import failed: {e}")
    try:
        from database import (
            get_all_businesses,
            get_businesses_by_status,
            update_business,
            create_business,
            get_all_meetings,
            create_meeting,
            update_meeting,
            get_all_clients,
            create_client,
            update_client,
            get_callbacks_due_today,
            get_overdue_callbacks
        )
        DATABASE_AVAILABLE = True
    except ImportError as e2:
        print(f"Database import failed (both attempts): {e}, {e2}")
        DATABASE_AVAILABLE = False

try:
    from .models import Business, BusinessUpdate, NewBusiness, Meeting, Client
    MODELS_AVAILABLE = True
except ImportError as e:
    print(f"Models import failed: {e}")
    try:
        from models import Business, BusinessUpdate, NewBusiness, Meeting, Client
        MODELS_AVAILABLE = True
    except ImportError as e2:
        print(f"Models import failed (both attempts): {e}, {e2}")
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

@app.get("/api/businesses/{status}")
async def get_businesses_by_status_route(status: str, request: Request):
    try:
        if not AUTH_AVAILABLE or not DATABASE_AVAILABLE:
            return {"error": "Required modules not available"}
        user_id = await get_current_user(request)
        return await get_businesses_by_status(status, user_id)
    except Exception as e:
        return {"error": str(e), "status": "businesses status endpoint failed"}

@app.post("/api/businesses")
async def create_business_route(business: dict, request: Request):
    try:
        if not AUTH_AVAILABLE or not DATABASE_AVAILABLE:
            return {"error": "Required modules not available"}
        user_id = await get_current_user(request)
        return await create_business(business, user_id)
    except Exception as e:
        # If there's an error (e.g., database constraint), raise an HTTPException
        # The frontend is already set up to handle 400 errors and continue
        raise HTTPException(status_code=400, detail=f"Failed to add business: {str(e)}")

@app.put("/api/businesses/{business_id}")
async def update_business_route(business_id: int, business: dict, request: Request):
    try:
        if not AUTH_AVAILABLE or not DATABASE_AVAILABLE:
            return {"error": "Required modules not available"}
        user_id = await get_current_user(request)
        return await update_business(business_id, business, user_id)
    except Exception as e:
        return {"error": str(e), "status": "update business endpoint failed"}

@app.post("/api/businesses/upload")
async def upload_businesses_json(businesses: List[dict], request: Request):
    """
    Upload multiple businesses from JSON data (e.g., Google Places export)
    Expects an array of business objects with fields like title, phone, address, etc.
    """
    try:
        if not AUTH_AVAILABLE or not DATABASE_AVAILABLE:
            return {"error": "Required modules not available"}
        
        user_id = await get_current_user(request)
        
        if not businesses or not isinstance(businesses, list):
            raise HTTPException(status_code=400, detail="Invalid data format. Expected array of businesses.")
        
        # Filter and format businesses from JSON data
        valid_businesses = []
        for biz in businesses:
            # Must have a name and phone for cold calling
            if not biz.get('title') or not str(biz.get('title')).strip():
                continue
            if not biz.get('phone') and not biz.get('phoneUnformatted'):
                continue
            
            # Map Google Places JSON fields to our business model
            formatted_business = {
                'name': str(biz.get('title', '')).strip(),
                'phone': str(biz.get('phoneUnformatted', '') or biz.get('phone', '')).strip(),
                'address': str(biz.get('address', '')).strip(),
                'city': str(biz.get('city', '')).strip(),
                'state': str(biz.get('state', '')).strip(),
                'zip_code': str(biz.get('postalCode', '')).strip(),
                'industry': str(biz.get('categoryName', 'Business')).strip(),
                'website': str(biz.get('url', '')).strip(),
                'status': 'new',
                'notes': f"Imported from JSON. Rating: {biz.get('totalScore', 'N/A')}" + 
                        (f" | {biz.get('reviewsCount', 0)} reviews" if biz.get('reviewsCount') else ""),
                'user_id': user_id
            }
            
            # Add opening hours if available
            if biz.get('openingHours'):
                hours_list = []
                for hour in biz.get('openingHours', []):
                    if isinstance(hour, dict) and hour.get('day') and hour.get('hours'):
                        hours_list.append(f"{hour['day']}: {hour['hours']}")
                if hours_list:
                    formatted_business['notes'] += f" | Hours: {', '.join(hours_list)}"
            
            valid_businesses.append(formatted_business)
        
        if not valid_businesses:
            raise HTTPException(status_code=400, detail="No valid businesses found. Each business must have a name and phone number.")
        
        # Remove duplicates based on phone number
        unique_businesses = []
        seen_phones = set()
        for business in valid_businesses:
            phone = business['phone']
            if phone not in seen_phones:
                unique_businesses.append(business)
                seen_phones.add(phone)
        
        # Bulk insert businesses
        created_businesses = []
        failed_businesses = []
        
        for business in unique_businesses:
            try:
                result = await create_business(business, user_id)
                created_businesses.append(result)
            except Exception as e:
                failed_businesses.append({
                    'business': business['name'],
                    'error': str(e)
                })
        
        return {
            "message": f"Successfully uploaded {len(created_businesses)} businesses",
            "total_processed": len(businesses),
            "valid_businesses": len(valid_businesses),
            "unique_businesses": len(unique_businesses),
            "created_businesses": len(created_businesses),
            "failed_businesses": len(failed_businesses),
            "created": created_businesses,
            "failed": failed_businesses
        }
        
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload businesses: {str(e)}")

@app.get("/api/meetings")
async def get_meetings():
    try:
        if not DATABASE_AVAILABLE:
            return {"error": "Database module not available"}
        return await get_all_meetings()
    except Exception as e:
        return {"error": str(e), "status": "meetings endpoint failed"}

@app.post("/api/meetings")
async def create_meeting_route(meeting: dict):
    try:
        if not DATABASE_AVAILABLE:
            return {"error": "Database module not available"}
        return await create_meeting(meeting)
    except Exception as e:
        return {"error": str(e), "status": "create meeting endpoint failed"}

@app.put("/api/meetings/{meeting_id}")
async def update_meeting_route(meeting_id: int, meeting: dict):
    try:
        if not DATABASE_AVAILABLE:
            return {"error": "Database module not available"}
        return await update_meeting(meeting_id, meeting)
    except Exception as e:
        return {"error": str(e), "status": "update meeting endpoint failed"}

@app.get("/api/clients")
async def get_clients():
    try:
        if not DATABASE_AVAILABLE:
            return {"error": "Database module not available"}
        return await get_all_clients()
    except Exception as e:
        return {"error": str(e), "status": "clients endpoint failed"}

@app.post("/api/clients")
async def create_client_route(client: dict):
    try:
        if not DATABASE_AVAILABLE:
            return {"error": "Database module not available"}
        return await create_client(client)
    except Exception as e:
        return {"error": str(e), "status": "create client endpoint failed"}

@app.put("/api/clients/{client_id}")
async def update_client_route(client_id: int, client: dict):
    try:
        if not DATABASE_AVAILABLE:
            return {"error": "Database module not available"}
        return await update_client(client_id, client)
    except Exception as e:
        return {"error": str(e), "status": "update client endpoint failed"}

@app.get("/api/callbacks/today")
async def get_today_callbacks(request: Request):
    try:
        if not AUTH_AVAILABLE or not DATABASE_AVAILABLE:
            return {"error": "Required modules not available"}
        user_id = await get_current_user(request)
        return await get_callbacks_due_today(user_id)
    except Exception as e:
        return {"error": str(e), "status": "callbacks today endpoint failed"}

@app.get("/api/callbacks/overdue")
async def get_overdue_callbacks_route(request: Request):
    try:
        if not AUTH_AVAILABLE or not DATABASE_AVAILABLE:
            return {"error": "Required modules not available"}
        user_id = await get_current_user(request)
        return await get_overdue_callbacks(user_id)
    except Exception as e:
        return {"error": str(e), "status": "callbacks overdue endpoint failed"}

@app.get("/api/calls")
async def get_calls(request: Request):
    """Get all businesses for calling purposes - alias for businesses endpoint"""
    try:
        if not AUTH_AVAILABLE or not DATABASE_AVAILABLE:
            return {"error": "Required modules not available"}
        user_id = await get_current_user(request)
        return await get_all_businesses(user_id)
    except Exception as e:
        return {"error": str(e), "status": "calls endpoint failed"}

@app.get("/api/calls/{status}")
async def get_calls_by_status(status: str, request: Request):
    """Get businesses by status for calling purposes"""
    try:
        if not AUTH_AVAILABLE or not DATABASE_AVAILABLE:
            return {"error": "Required modules not available"}
        user_id = await get_current_user(request)
        return await get_businesses_by_status(status, user_id)
    except Exception as e:
        return {"error": str(e), "status": "calls by status endpoint failed"}

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
handler = Mangum(app) 