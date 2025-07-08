from supabase import create_client, Client
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Global variable to hold the client
_supabase_client = None

def get_supabase_client():
    """Get or create the Supabase client instance"""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_KEY", "")
        )
    return _supabase_client

# Database table names
BUSINESSES_TABLE = "businesses"
MEETINGS_TABLE = "meetings"
CLIENTS_TABLE = "clients"
CALLBACKS_TABLE = "callbacks"

# Helper functions for database operations
async def get_all_businesses(user_id: str = None):
    supabase = get_supabase_client()
    query = supabase.table(BUSINESSES_TABLE).select("*")
    if user_id:
        query = query.eq("user_id", user_id)
    response = query.execute()
    return response.data

async def get_businesses_by_status(status: str, user_id: str = None):
    supabase = get_supabase_client()
    query = supabase.table(BUSINESSES_TABLE).select("*").eq("status", status)
    if user_id:
        query = query.eq("user_id", user_id)
    response = query.execute()
    return response.data

async def update_business(business_id: str, data: dict, user_id: str = None):
    supabase = get_supabase_client()
    query = supabase.table(BUSINESSES_TABLE).update(data).eq("id", business_id)
    if user_id:
        query = query.eq("user_id", user_id)
    response = query.execute()
    return response.data

async def create_business(data: dict, user_id: str = None):
    supabase = get_supabase_client()
    if user_id and 'user_id' not in data:
        data['user_id'] = user_id
    response = supabase.table(BUSINESSES_TABLE).insert(data).execute()
    return response.data

async def get_all_meetings():
    supabase = get_supabase_client()
    response = supabase.table(MEETINGS_TABLE).select("*").execute()
    return response.data

async def create_meeting(data: dict):
    supabase = get_supabase_client()
    response = supabase.table(MEETINGS_TABLE).insert(data).execute()
    return response.data

async def update_meeting(meeting_id: str, data: dict):
    supabase = get_supabase_client()
    response = supabase.table(MEETINGS_TABLE).update(data).eq("id", meeting_id).execute()
    return response.data

async def get_all_clients():
    supabase = get_supabase_client()
    response = supabase.table(CLIENTS_TABLE).select("*").execute()
    return response.data

async def create_client(data: dict):
    supabase = get_supabase_client()
    response = supabase.table(CLIENTS_TABLE).insert(data).execute()
    return response.data

async def update_client(client_id: str, data: dict):
    supabase = get_supabase_client()
    response = supabase.table(CLIENTS_TABLE).update(data).eq("id", client_id).execute()
    return response.data

async def get_callbacks_due_today(user_id: str = None):
    from datetime import datetime
    supabase = get_supabase_client()
    today = datetime.now().strftime("%Y-%m-%d")
    query = supabase.table(BUSINESSES_TABLE)\
        .select("*")\
        .eq("status", "callback")\
        .eq("callback_due_date", today)
    if user_id:
        query = query.eq("user_id", user_id)
    response = query.execute()
    return response.data

async def get_overdue_callbacks(user_id: str = None):
    from datetime import datetime
    supabase = get_supabase_client()
    today = datetime.now().strftime("%Y-%m-%d")
    query = supabase.table(BUSINESSES_TABLE)\
        .select("*")\
        .eq("status", "callback")\
        .lt("callback_due_date", today)
    if user_id:
        query = query.eq("user_id", user_id)
    response = query.execute()
    return response.data 