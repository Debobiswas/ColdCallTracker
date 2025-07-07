from supabase import create_client, Client
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL", ""),
    os.getenv("SUPABASE_KEY", "")
)

# Database table names
BUSINESSES_TABLE = "businesses"
MEETINGS_TABLE = "meetings"
CLIENTS_TABLE = "clients"
CALLBACKS_TABLE = "callbacks"

# Helper functions for database operations
async def get_all_businesses():
    response = supabase.table(BUSINESSES_TABLE).select("*").execute()
    return response.data

async def get_businesses_by_status(status: str):
    response = supabase.table(BUSINESSES_TABLE).select("*").eq("status", status).execute()
    return response.data

async def update_business(business_id: str, data: dict):
    response = supabase.table(BUSINESSES_TABLE).update(data).eq("id", business_id).execute()
    return response.data

async def create_business(data: dict):
    response = supabase.table(BUSINESSES_TABLE).insert(data).execute()
    return response.data

async def delete_business(business_id: str):
    response = supabase.table(BUSINESSES_TABLE).delete().eq("id", business_id).execute()
    return response.data

async def get_all_meetings():
    response = supabase.table(MEETINGS_TABLE).select("*").execute()
    return response.data

async def create_meeting(data: dict):
    response = supabase.table(MEETINGS_TABLE).insert(data).execute()
    return response.data

async def update_meeting(meeting_id: str, data: dict):
    response = supabase.table(MEETINGS_TABLE).update(data).eq("id", meeting_id).execute()
    return response.data

async def delete_meeting(meeting_id: str):
    response = supabase.table(MEETINGS_TABLE).delete().eq("id", meeting_id).execute()
    return response.data

async def get_all_clients():
    response = supabase.table(CLIENTS_TABLE).select("*").execute()
    return response.data

async def create_client(data: dict):
    response = supabase.table(CLIENTS_TABLE).insert(data).execute()
    return response.data

async def update_client(client_id: str, data: dict):
    response = supabase.table(CLIENTS_TABLE).update(data).eq("id", client_id).execute()
    return response.data

async def delete_client(client_id: str):
    response = supabase.table(CLIENTS_TABLE).delete().eq("id", client_id).execute()
    return response.data

async def get_callbacks_due_today():
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")
    response = supabase.table(BUSINESSES_TABLE)\
        .select("*")\
        .eq("status", "callback")\
        .eq("callback_due_date", today)\
        .execute()
    return response.data

async def get_overdue_callbacks():
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")
    response = supabase.table(BUSINESSES_TABLE)\
        .select("*")\
        .eq("status", "callback")\
        .lt("callback_due_date", today)\
        .execute()
    return response.data 