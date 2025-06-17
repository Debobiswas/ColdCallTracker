from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pydantic import BaseModel
from typing import List, Optional
import call_tracker as ct
import os
import traceback
from datetime import datetime
from itertools import islice
from urllib.parse import unquote

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:3004"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Valid status values
VALID_STATUSES = ['tocall', 'called', 'callback', 'dont_call', 'client', 'lead']

class Business(BaseModel):
    name: str
    phone: str
    address: str
    website: str = ""
    status: str = "Not Called"
    comments: str = ""
    google_maps_url: str = ""
    region: str = ""
    hours: str = ""
    industry: str = "Restaurant"
    # Enhanced callback tracking fields
    callback_due_date: str = ""
    callback_due_time: str = ""
    callback_reason: str = ""
    callback_priority: str = "Medium"
    callback_count: int = 0
    lead_score: int = 5
    interest_level: str = "Unknown"
    best_time_to_call: str = ""
    decision_maker: str = ""
    next_action: str = ""

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    status: Optional[str] = None
    comments: Optional[str] = None
    region: Optional[str] = None
    hours: Optional[str] = None
    industry: Optional[str] = None
    # Enhanced callback tracking fields
    callback_due_date: Optional[str] = None
    callback_due_time: Optional[str] = None
    callback_reason: Optional[str] = None
    callback_priority: Optional[str] = None
    callback_count: Optional[int] = None
    lead_score: Optional[int] = None
    interest_level: Optional[str] = None
    best_time_to_call: Optional[str] = None
    decision_maker: Optional[str] = None
    next_action: Optional[str] = None

class NewBusiness(BaseModel):
    name: str
    phone: str
    address: str
    website: str = ""
    status: str = "Not Called"
    comments: str = ""
    google_maps_url: str = ""
    region: str = ""
    hours: str = ""
    industry: str = "Restaurant"

class BulkBusinessRequest(BaseModel):
    businesses: List[NewBusiness]

class Meeting(BaseModel):
    id: Optional[str] = None
    business_name: str
    date: str
    time: str
    notes: Optional[str] = None
    status: str = "scheduled"  # scheduled, completed, cancelled

class MeetingCreate(BaseModel):
    business_name: str
    date: str
    time: str
    notes: Optional[str] = None

class MeetingUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class Client(BaseModel):
    name: str
    address: str
    phone: str
    website: str
    price: str
    subscription: str
    date: str

class BusinessFilter(BaseModel):
    status: Optional[str] = None

CLIENTS_FILE = "clients.xlsx"
ENV_FILE = ".env"

def load_clients():
    if not os.path.exists(CLIENTS_FILE):
        df = pd.DataFrame(columns=["Name", "Address", "Phone", "Website", "Price", "Subscription", "Date"])
        df.to_excel(CLIENTS_FILE, index=False)
    return pd.read_excel(CLIENTS_FILE)

def save_clients(df):
    df.to_excel(CLIENTS_FILE, index=False)

def read_env_key():
    if not os.path.exists(ENV_FILE):
        return None
    with open(ENV_FILE, "r") as f:
        for line in f:
            if line.startswith("GOOGLE_API_KEY="):
                return line.strip().split("=", 1)[1]
    return None

def write_env_key(new_key):
    lines = []
    found = False
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r") as f:
            for line in f:
                if line.startswith("GOOGLE_API_KEY="):
                    lines.append(f"GOOGLE_API_KEY={new_key}\n")
                    found = True
                else:
                    lines.append(line)
    if not found:
        lines.append(f"GOOGLE_API_KEY={new_key}\n")
    with open(ENV_FILE, "w") as f:
        f.writelines(lines)

@app.get("/api/admin/google-api-key")
def get_env_api_key():
    key = read_env_key()
    if not key:
        return {"key": None}
    return {"key": key[:6] + "..." + key[-4:]}

@app.post("/api/admin/google-api-key")
def set_env_api_key(data: dict):
    key = data.get("key")
    if not key or not isinstance(key, str):
        raise HTTPException(status_code=400, detail="Invalid key")
    write_env_key(key)
    ct.initialize_gmaps()
    return {"message": "API key updated"}

@app.get("/api/businesses", response_model=List[Business])
async def get_all_businesses():
    try:
        df = ct.load_data(ct.EXCEL_FILE)
        # Add missing columns if they don't exist
        if 'Hours' not in df.columns:
            df['Hours'] = ''
        if 'Industry' not in df.columns:
            df['Industry'] = 'Restaurant'
        businesses = []
        for _, row in df.iterrows():
            businesses.append(Business(
                name=str(row['Name']),
                phone=str(row['Number']) if not pd.isna(row['Number']) else "",
                address=str(row['Address']) if not pd.isna(row['Address']) else "",
                status=str(row['Status']) if not pd.isna(row['Status']) else "tocall",
                comments=str(row['Comments']) if not pd.isna(row['Comments']) else "",
                hours=str(row['Hours']) if not pd.isna(row['Hours']) else "",
                industry=str(row['Industry']) if not pd.isna(row['Industry']) else "Restaurant",
                # Enhanced callback tracking fields
                callback_due_date=str(row.get('CallbackDueDate', '')) if not pd.isna(row.get('CallbackDueDate', '')) else "",
                callback_due_time=str(row.get('CallbackDueTime', '')) if not pd.isna(row.get('CallbackDueTime', '')) else "",
                callback_reason=str(row.get('CallbackReason', '')) if not pd.isna(row.get('CallbackReason', '')) else "",
                callback_priority=str(row.get('CallbackPriority', 'Medium')) if not pd.isna(row.get('CallbackPriority', 'Medium')) else "Medium",
                callback_count=int(row.get('CallbackCount', 0)) if not pd.isna(row.get('CallbackCount', 0)) else 0,
                lead_score=int(row.get('LeadScore', 5)) if not pd.isna(row.get('LeadScore', 5)) else 5,
                interest_level=str(row.get('InterestLevel', 'Unknown')) if not pd.isna(row.get('InterestLevel', 'Unknown')) else "Unknown",
                best_time_to_call=str(row.get('BestTimeToCall', '')) if not pd.isna(row.get('BestTimeToCall', '')) else "",
                decision_maker=str(row.get('DecisionMaker', '')) if not pd.isna(row.get('DecisionMaker', '')) else "",
                next_action=str(row.get('NextAction', '')) if not pd.isna(row.get('NextAction', '')) else ""
            ))
        return businesses
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/businesses/status/{status}", response_model=List[Business])
async def get_businesses_by_status(status: str):
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")
    try:
        df = ct.load_data(ct.EXCEL_FILE)
        if 'Hours' not in df.columns:
            df['Hours'] = ''
        if 'Industry' not in df.columns:
            df['Industry'] = 'Restaurant'
        filtered_df = df[df['Status'].str.lower() == status.lower()]
        businesses = []
        for _, row in filtered_df.iterrows():
            businesses.append(Business(
                name=str(row['Name']),
                phone=str(row['Number']) if not pd.isna(row['Number']) else "",
                address=str(row['Address']) if not pd.isna(row['Address']) else "",
                status=str(row['Status']) if not pd.isna(row['Status']) else "tocall",
                comments=str(row['Comments']) if not pd.isna(row['Comments']) else "",
                hours=str(row['Hours']) if not pd.isna(row['Hours']) else "",
                industry=str(row['Industry']) if not pd.isna(row['Industry']) else "Restaurant"
            ))
        return businesses
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/businesses/filter", response_model=List[Business])
async def filter_businesses(
    status: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    industry: Optional[str] = Query(None)
):
    try:
        print("\n\n===== FILTER ENDPOINT HIT =====")
        print(f"Query parameters - status: {status}, region: {region}, industry: {industry}")
        df = ct.load_data(ct.EXCEL_FILE)
        if 'Hours' not in df.columns:
            df['Hours'] = ''
        if 'Industry' not in df.columns:
            df['Industry'] = 'Restaurant'
        print(f"Loaded {len(df)} businesses from Excel")
        
        if status and status.strip():
            status_lower = status.strip().lower()
            df['status_lower'] = df['Status'].astype(str).str.lower().str.strip()
            df = df[df['status_lower'] == status_lower]
            print(f"After status filter: {len(df)} businesses")
            
        if region and region.strip():
            def extract_city(address):
                if pd.isna(address):
                    return ''
                parts = str(address).split(',')
                if len(parts) >= 2:
                    return parts[1].strip()
                return ''
            df['city'] = df['Address'].apply(extract_city)
            region_lower = region.strip().lower()
            df = df[df['city'].str.lower() == region_lower]
            print(f"After region filter: {len(df)} businesses")
            
        if industry and industry.strip():
            industry_lower = industry.strip().lower()
            df['industry_lower'] = df['Industry'].astype(str).str.lower().str.strip()
            df = df[df['industry_lower'] == industry_lower]
            print(f"After industry filter: {len(df)} businesses")
        
        businesses = []
        for _, row in df.iterrows():
            businesses.append(Business(
                name=str(row['Name']),
                phone=str(row['Number']) if not pd.isna(row['Number']) else "",
                address=str(row['Address']) if not pd.isna(row['Address']) else "",
                status=str(row['Status']) if not pd.isna(row['Status']) else "tocall",
                comments=str(row['Comments']) if not pd.isna(row['Comments']) else "",
                hours=str(row['Hours']) if not pd.isna(row['Hours']) else "",
                industry=str(row['Industry']) if not pd.isna(row['Industry']) else "Restaurant"
            ))
        print(f"Returning {len(businesses)} businesses")
        print("===== END FILTER ENDPOINT =====\n\n")
        return businesses
    except Exception as e:
        print(f"ERROR in filter_businesses: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/businesses/{name}")
async def update_business(name: str, update: BusinessUpdate):
    try:
        # Properly decode URL-encoded business name
        decoded_name = unquote(name)
        print(f"PUT request for business: '{name}' -> decoded: '{decoded_name}'")
        
        df = ct.load_data(ct.EXCEL_FILE)
        # Robust name matching: ignore case and whitespace
        name_clean = decoded_name.strip().lower()
        df['Name_clean'] = df['Name'].astype(str).str.strip().str.lower()
        
        print(f"Looking for name_clean: '{name_clean}'")
        print(f"Available names: {df['Name_clean'].tolist()[:10]}...")  # Show first 10 for debugging
        
        if name_clean not in df['Name_clean'].values:
            raise HTTPException(status_code=404, detail=f"Business not found: '{decoded_name}'")
        row_mask = df['Name_clean'] == name_clean

        # Ensure date columns exist
        df = ct.ensure_date_columns(df)
        today_str = datetime.now().strftime('%Y-%m-%d')

        if update.status:
            if update.status not in VALID_STATUSES:
                raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")
            # Use robust mask for status changes
            if update.status == "called":
                df.loc[row_mask, 'Status'] = 'called'
                df.loc[row_mask, 'LastCalledDate'] = today_str
            elif update.status == "callback":
                df.loc[row_mask, 'Status'] = 'callback'
                df.loc[row_mask, 'LastCallbackDate'] = today_str
            elif update.status == "dont_call":
                df.loc[row_mask, 'Status'] = 'dont_call'
            elif update.status == "tocall":
                df.loc[row_mask, 'Status'] = 'tocall'
            elif update.status == "client":
                df.loc[row_mask, 'Status'] = 'client'
            elif update.status == "lead":
                df.loc[row_mask, 'Status'] = 'lead'

        if update.comments is not None:
            df.loc[row_mask, 'Comments'] = update.comments

        if update.name is not None:
            df.loc[row_mask, 'Name'] = update.name

        if update.phone is not None:
            df.loc[row_mask, 'Number'] = update.phone

        if update.address is not None:
            df.loc[row_mask, 'Address'] = update.address

        if update.hours is not None:
            df.loc[row_mask, 'Hours'] = update.hours

        if update.industry is not None:
            # Ensure Industry column exists
            if 'Industry' not in df.columns:
                df['Industry'] = 'Restaurant'
            df.loc[row_mask, 'Industry'] = update.industry

        # Handle enhanced callback tracking fields
        if update.callback_due_date is not None:
            df.loc[row_mask, 'CallbackDueDate'] = update.callback_due_date
        
        if update.callback_due_time is not None:
            df.loc[row_mask, 'CallbackDueTime'] = update.callback_due_time
        
        if update.callback_reason is not None:
            df.loc[row_mask, 'CallbackReason'] = update.callback_reason
        
        if update.callback_priority is not None:
            if update.callback_priority not in ['High', 'Medium', 'Low']:
                raise HTTPException(status_code=400, detail="Priority must be High, Medium, or Low")
            df.loc[row_mask, 'CallbackPriority'] = update.callback_priority
        
        if update.callback_count is not None:
            df.loc[row_mask, 'CallbackCount'] = update.callback_count
        
        if update.lead_score is not None:
            if not (1 <= update.lead_score <= 10):
                raise HTTPException(status_code=400, detail="Lead score must be between 1 and 10")
            df.loc[row_mask, 'LeadScore'] = update.lead_score
        
        if update.interest_level is not None:
            if update.interest_level not in ['High', 'Medium', 'Low', 'Unknown']:
                raise HTTPException(status_code=400, detail="Interest level must be High, Medium, Low, or Unknown")
            df.loc[row_mask, 'InterestLevel'] = update.interest_level
        
        if update.best_time_to_call is not None:
            df.loc[row_mask, 'BestTimeToCall'] = update.best_time_to_call
        
        if update.decision_maker is not None:
            df.loc[row_mask, 'DecisionMaker'] = update.decision_maker
        
        if update.next_action is not None:
            df.loc[row_mask, 'NextAction'] = update.next_action

        df = df.drop(columns=['Name_clean'])
        ct.api_direct_save(df)
            
        return {"message": "Business updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/businesses")
async def add_business(business: NewBusiness):
    try:
        if business.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")
        df = ct.load_data(ct.EXCEL_FILE)
        if business.name in df['Name'].values:
            raise HTTPException(status_code=400, detail="Business already exists")
        # Add new business
        new_row = pd.DataFrame({
            'Name': [business.name],
            'Number': [business.phone],
            'Address': [business.address],
            'Status': [business.status],
            'Comments': [business.comments],
            'Hours': [business.hours],
            'Industry': [business.industry if business.industry else 'Restaurant']
        })
        df = pd.concat([df, new_row], ignore_index=True)
        ct.api_direct_save(df)
        return {"message": "Business added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/businesses/bulk")
async def add_businesses_bulk(request: BulkBusinessRequest):
    try:
        df = ct.load_data(ct.EXCEL_FILE)
        added_count = 0
        errors = []
        for business in request.businesses:
            try:
                if business.status not in VALID_STATUSES:
                    errors.append(f"Invalid status for {business.name}. Must be one of: {', '.join(VALID_STATUSES)}")
                    continue
                if business.name in df['Name'].values:
                    errors.append(f"Business {business.name} already exists")
                    continue
                new_row = pd.DataFrame({
                    'Name': [business.name],
                    'Number': [business.phone],
                    'Address': [business.address],
                    'Status': [business.status],
                    'Comments': [business.comments],
                    'Hours': [business.hours],
                    'Industry': [business.industry if business.industry else 'Restaurant']
                })
                df = pd.concat([df, new_row], ignore_index=True)
                added_count += 1
            except Exception as e:
                errors.append(f"Error adding {business.name}: {str(e)}")
        if added_count > 0:
            ct.api_direct_save(df)
        return {
            "message": f"Added {added_count} businesses successfully",
            "added_count": added_count,
            "errors": errors
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/businesses/clean")
async def clean_businesses():
    try:
        df = ct.load_data(ct.EXCEL_FILE)
        # Remove businesses with no phone number
        df = df[df['Number'].notna() & (df['Number'].str.strip() != '')]
        ct.api_direct_save(df)
        return {"message": "Successfully cleaned businesses without phone numbers"}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/businesses/{name}")
async def delete_business(name: str):
    try:
        df = ct.load_data(ct.EXCEL_FILE)
        if name not in df['Name'].values:
            raise HTTPException(status_code=404, detail="Business not found")
        
        # Remove the business
        df = df[df['Name'] != name]
        ct.api_direct_save(df)
        
        return {"message": "Business deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Meeting endpoints
@app.get("/api/meetings", response_model=List[Meeting])
async def get_all_meetings():
    try:
        df = pd.read_excel("meetings.xlsx") if os.path.exists("meetings.xlsx") else pd.DataFrame(columns=['id', 'business_name', 'date', 'time', 'notes', 'status'])
        meetings = []
        for _, row in df.iterrows():
            meetings.append(Meeting(
                id=str(row['id']),
                business_name=str(row['business_name']),
                date=str(row['date']),
                time=str(row['time']),
                notes=None if pd.isna(row['notes']) else str(row['notes']),
                status=str(row['status'])
            ))
        return meetings
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/meetings", response_model=Meeting)
async def create_meeting(meeting: MeetingCreate):
    try:
        df = pd.read_excel("meetings.xlsx") if os.path.exists("meetings.xlsx") else pd.DataFrame(columns=['id', 'business_name', 'date', 'time', 'notes', 'status'])
        
        # Generate a unique ID
        new_id = str(len(df) + 1)
        
        # Add new meeting
        new_row = pd.DataFrame({
            'id': [new_id],
            'business_name': [meeting.business_name],
            'date': [meeting.date],
            'time': [meeting.time],
            'notes': [meeting.notes],
            'status': ['scheduled']
        })
        
        df = pd.concat([df, new_row], ignore_index=True)
        df.to_excel("meetings.xlsx", index=False)
        
        return Meeting(
            id=new_id,
            business_name=meeting.business_name,
            date=meeting.date,
            time=meeting.time,
            notes=meeting.notes,
            status='scheduled'
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/meetings/{meeting_id}")
async def update_meeting(meeting_id: str, update: MeetingUpdate):
    try:
        if not os.path.exists("meetings.xlsx"):
            raise HTTPException(status_code=404, detail="No meetings found")
        
        df = pd.read_excel("meetings.xlsx")
        if meeting_id not in df['id'].astype(str).values:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Update meeting details
        if update.date:
            df.loc[df['id'].astype(str) == meeting_id, 'date'] = update.date
        if update.time:
            df.loc[df['id'].astype(str) == meeting_id, 'time'] = update.time
        if update.notes:
            df.loc[df['id'].astype(str) == meeting_id, 'notes'] = update.notes
        if update.status:
            df.loc[df['id'].astype(str) == meeting_id, 'status'] = update.status
        
        df.to_excel("meetings.xlsx", index=False)
        return {"message": "Meeting updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str):
    try:
        if not os.path.exists("meetings.xlsx"):
            raise HTTPException(status_code=404, detail="No meetings found")
        
        df = pd.read_excel("meetings.xlsx")
        if meeting_id not in df['id'].astype(str).values:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Remove the meeting
        df = df[df['id'].astype(str) != meeting_id]
        df.to_excel("meetings.xlsx", index=False)
        
        return {"message": "Meeting deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/clients", response_model=List[Client])
async def get_clients():
    df = load_clients()
    return [
        Client(
            name=row["Name"] if not pd.isna(row["Name"]) else "",
            address=row["Address"] if not pd.isna(row["Address"]) else "",
            phone=row["Phone"] if not pd.isna(row["Phone"]) else "",
            website=row["Website"] if not pd.isna(row["Website"]) else "",
            price=str(row["Price"]) if not pd.isna(row["Price"]) else "0",
            subscription=str(row["Subscription"]) if not pd.isna(row["Subscription"]) else "0",
            date=str(row["Date"]) if not pd.isna(row["Date"]) else "",
        )
        for _, row in df.iterrows()
    ]

@app.post("/api/clients")
async def add_client(client: Client):
    df = load_clients()
    if client.name in df["Name"].values:
        raise HTTPException(status_code=400, detail="Client already exists")
    new_row = pd.DataFrame({
        "Name": [client.name],
        "Address": [client.address],
        "Phone": [client.phone],
        "Website": [client.website],
        "Price": [client.price],
        "Subscription": [client.subscription],
        "Date": [client.date],
    })
    df = pd.concat([df, new_row], ignore_index=True)
    save_clients(df)
    return {"message": "Client added successfully"}

@app.put("/api/clients/{name}")
async def update_client(name: str, client: Client):
    df = load_clients()
    if name not in df["Name"].values:
        raise HTTPException(status_code=404, detail="Client not found")
    df.loc[df["Name"] == name, ["Name", "Address", "Phone", "Website", "Price", "Subscription", "Date"]] = [
        client.name, client.address, client.phone, client.website, client.price, client.subscription, client.date
    ]
    save_clients(df)
    return {"message": "Client updated successfully"}

@app.delete("/api/clients/{name}")
async def delete_client(name: str):
    df = load_clients()
    if name not in df["Name"].values:
        raise HTTPException(status_code=404, detail="Client not found")
    df = df[df["Name"] != name]
    save_clients(df)
    return {"message": "Client deleted successfully"}

@app.get("/api/businesses/lookup")
async def lookup_business(name: str = Query(..., description="Business name to look up")):
    try:
        # Get basic details
        phone, address = ct.get_business_details_online(name)
        
        # Get hours from Google Places API
        try:
            print(f"\n🔍 Making Places API call for business lookup: {name}")
            results = ct.gmaps.places(
                query=name,
                type='business'
            )
            
            hours = ""
            if results['status'] == 'OK' and results.get('results'):
                place_id = results['results'][0]['place_id']
                details = ct.gmaps.place(
                    place_id=place_id,
                    fields=['opening_hours']
                )
                
                if 'opening_hours' in details.get('result', {}) and 'weekday_text' in details['result']['opening_hours']:
                    hours = ' | '.join(details['result']['opening_hours']['weekday_text'])
            
            return {
                "name": name,
                "phone": phone,
                "address": address,
                "hours": hours
            }
        except Exception as e:
            print(f"Error fetching hours: {str(e)}")
            return {
                "name": name,
                "phone": phone,
                "address": address,
                "hours": ""
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/callbacks/due-today", response_model=List[Business])
async def get_callbacks_due_today():
    """Get all callbacks that are due today."""
    try:
        df = ct.load_data(ct.EXCEL_FILE)
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')
        
        status_mask = df['Status'].str.lower().str.strip() == "callback"
        due_today_mask = df['CallbackDueDate'] == today
        filtered_df = df[status_mask & due_today_mask]
        
        businesses = []
        for _, row in filtered_df.iterrows():
            businesses.append(Business(
                name=str(row['Name']),
                phone=str(row['Number']) if not pd.isna(row['Number']) else "",
                address=str(row['Address']) if not pd.isna(row['Address']) else "",
                status=str(row['Status']) if not pd.isna(row['Status']) else "callback",
                comments=str(row['Comments']) if not pd.isna(row['Comments']) else "",
                hours=str(row['Hours']) if not pd.isna(row['Hours']) else "",
                industry=str(row['Industry']) if not pd.isna(row['Industry']) else "Restaurant",
                callback_due_date=str(row.get('CallbackDueDate', '')) if not pd.isna(row.get('CallbackDueDate', '')) else "",
                callback_due_time=str(row.get('CallbackDueTime', '')) if not pd.isna(row.get('CallbackDueTime', '')) else "",
                callback_reason=str(row.get('CallbackReason', '')) if not pd.isna(row.get('CallbackReason', '')) else "",
                callback_priority=str(row.get('CallbackPriority', 'Medium')) if not pd.isna(row.get('CallbackPriority', 'Medium')) else "Medium",
                callback_count=int(row.get('CallbackCount', 0)) if not pd.isna(row.get('CallbackCount', 0)) else 0,
                lead_score=int(row.get('LeadScore', 5)) if not pd.isna(row.get('LeadScore', 5)) else 5,
                interest_level=str(row.get('InterestLevel', 'Unknown')) if not pd.isna(row.get('InterestLevel', 'Unknown')) else "Unknown",
                best_time_to_call=str(row.get('BestTimeToCall', '')) if not pd.isna(row.get('BestTimeToCall', '')) else "",
                decision_maker=str(row.get('DecisionMaker', '')) if not pd.isna(row.get('DecisionMaker', '')) else "",
                next_action=str(row.get('NextAction', '')) if not pd.isna(row.get('NextAction', '')) else ""
            ))
        
        # Sort by priority and time
        priority_order = {'High': 1, 'Medium': 2, 'Low': 3}
        businesses.sort(key=lambda x: (priority_order.get(x.callback_priority, 2), x.callback_due_time))
        
        return businesses
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/callbacks/overdue", response_model=List[Business])
async def get_overdue_callbacks():
    """Get all callbacks that are overdue."""
    try:
        df = ct.load_data(ct.EXCEL_FILE)
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')
        
        status_mask = df['Status'].str.lower().str.strip() == "callback"
        overdue_mask = (df['CallbackDueDate'] != '') & (df['CallbackDueDate'] < today)
        filtered_df = df[status_mask & overdue_mask]
        
        businesses = []
        for _, row in filtered_df.iterrows():
            businesses.append(Business(
                name=str(row['Name']),
                phone=str(row['Number']) if not pd.isna(row['Number']) else "",
                address=str(row['Address']) if not pd.isna(row['Address']) else "",
                status=str(row['Status']) if not pd.isna(row['Status']) else "callback",
                comments=str(row['Comments']) if not pd.isna(row['Comments']) else "",
                hours=str(row['Hours']) if not pd.isna(row['Hours']) else "",
                industry=str(row['Industry']) if not pd.isna(row['Industry']) else "Restaurant",
                callback_due_date=str(row.get('CallbackDueDate', '')) if not pd.isna(row.get('CallbackDueDate', '')) else "",
                callback_due_time=str(row.get('CallbackDueTime', '')) if not pd.isna(row.get('CallbackDueTime', '')) else "",
                callback_reason=str(row.get('CallbackReason', '')) if not pd.isna(row.get('CallbackReason', '')) else "",
                callback_priority=str(row.get('CallbackPriority', 'Medium')) if not pd.isna(row.get('CallbackPriority', 'Medium')) else "Medium",
                callback_count=int(row.get('CallbackCount', 0)) if not pd.isna(row.get('CallbackCount', 0)) else 0,
                lead_score=int(row.get('LeadScore', 5)) if not pd.isna(row.get('LeadScore', 5)) else 5,
                interest_level=str(row.get('InterestLevel', 'Unknown')) if not pd.isna(row.get('InterestLevel', 'Unknown')) else "Unknown",
                best_time_to_call=str(row.get('BestTimeToCall', '')) if not pd.isna(row.get('BestTimeToCall', '')) else "",
                decision_maker=str(row.get('DecisionMaker', '')) if not pd.isna(row.get('DecisionMaker', '')) else "",
                next_action=str(row.get('NextAction', '')) if not pd.isna(row.get('NextAction', '')) else ""
            ))
        
        return businesses
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/callbacks/priority/{priority}", response_model=List[Business])
async def get_callbacks_by_priority(priority: str):
    """Get callbacks by priority level (High, Medium, Low)."""
    if priority not in ['High', 'Medium', 'Low']:
        raise HTTPException(status_code=400, detail="Priority must be High, Medium, or Low")
    
    try:
        df = ct.load_data(ct.EXCEL_FILE)
        status_mask = df['Status'].str.lower().str.strip() == "callback"
        priority_mask = df['CallbackPriority'].str.lower() == priority.lower()
        filtered_df = df[status_mask & priority_mask]
        
        businesses = []
        for _, row in filtered_df.iterrows():
            businesses.append(Business(
                name=str(row['Name']),
                phone=str(row['Number']) if not pd.isna(row['Number']) else "",
                address=str(row['Address']) if not pd.isna(row['Address']) else "",
                status=str(row['Status']) if not pd.isna(row['Status']) else "callback",
                comments=str(row['Comments']) if not pd.isna(row['Comments']) else "",
                hours=str(row['Hours']) if not pd.isna(row['Hours']) else "",
                industry=str(row['Industry']) if not pd.isna(row['Industry']) else "Restaurant",
                callback_due_date=str(row.get('CallbackDueDate', '')) if not pd.isna(row.get('CallbackDueDate', '')) else "",
                callback_due_time=str(row.get('CallbackDueTime', '')) if not pd.isna(row.get('CallbackDueTime', '')) else "",
                callback_reason=str(row.get('CallbackReason', '')) if not pd.isna(row.get('CallbackReason', '')) else "",
                callback_priority=str(row.get('CallbackPriority', 'Medium')) if not pd.isna(row.get('CallbackPriority', 'Medium')) else "Medium",
                callback_count=int(row.get('CallbackCount', 0)) if not pd.isna(row.get('CallbackCount', 0)) else 0,
                lead_score=int(row.get('LeadScore', 5)) if not pd.isna(row.get('LeadScore', 5)) else 5,
                interest_level=str(row.get('InterestLevel', 'Unknown')) if not pd.isna(row.get('InterestLevel', 'Unknown')) else "Unknown",
                best_time_to_call=str(row.get('BestTimeToCall', '')) if not pd.isna(row.get('BestTimeToCall', '')) else "",
                decision_maker=str(row.get('DecisionMaker', '')) if not pd.isna(row.get('DecisionMaker', '')) else "",
                next_action=str(row.get('NextAction', '')) if not pd.isna(row.get('NextAction', '')) else ""
            ))
        
        return businesses
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/businesses/search")
async def search_businesses(
    query: str = Query(..., description="Search query for businesses"),
    limit: int = Query(60, gt=0, description="Number of results to return"),
    no_website: bool = Query(False, description="Only include results without a website"),
    initial_radius: int = Query(1000, description="Initial search radius in meters"),
    max_radius: int = Query(50000, description="Maximum search radius in meters"),
    keywords: Optional[str] = Query(None, description="Comma-separated list of keywords to prepend to the query (e.g. 'restaurant,cafe,bar')")
):
    try:
        # Prepare keywords
        if keywords:
            keyword_list = [k.strip() for k in keywords.split(',') if k.strip()]
        else:
            keyword_list = ['restaurant', 'cafe', 'Tavern', 'coffee', 'bistro', 'diner']

        all_results = []
        seen = set()
        for keyword in keyword_list:
            search_query = f"{keyword} {query}".strip()
            page_token = None
            while len(all_results) < limit:
                try:
                    print(f"\n🔍 Making Places API call for search: {search_query} (page_token: {page_token})")
                    results = ct.gmaps.places(
                        query=search_query,
                        type='business',
                        page_token=page_token
                    )
                    if results['status'] != 'OK' or not results.get('results'):
                        break
                    for place in results.get('results', []):
                        place_id = place['place_id']
                        try:
                            print(f"🔍 Making Place Details API call for: {place.get('name', '')}")
                            details = ct.gmaps.place(
                                place_id=place_id, 
                                fields=['name', 'formatted_phone_number', 'formatted_address', 'website', 'url', 'opening_hours']
                            )
                            info = details.get('result', {})
                            # If no_website is True, skip if website exists
                            if no_website and info.get('website'):
                                continue
                            # Format hours into a single string
                            hours = []
                            if 'opening_hours' in info and 'weekday_text' in info['opening_hours']:
                                hours = info['opening_hours']['weekday_text']
                            hours_str = ' | '.join(hours) if hours else ''
                            key = (info.get('name', place.get('name', '')).strip().lower(), info.get('formatted_address', '').strip().lower())
                            if key not in seen:
                                seen.add(key)
                                all_results.append({
                                    'name': info.get('name', place.get('name', '')),
                                    'phone': info.get('formatted_phone_number', ''),
                                    'address': info.get('formatted_address', ''),
                                    'website': info.get('website', ''),
                                    'google_maps_url': info.get('url', ''),
                                    'hours': hours_str
                                })
                                if len(all_results) >= limit:
                                    break
                        except Exception as detail_error:
                            print(f"Error fetching details for place {place_id}: {str(detail_error)}")
                            continue
                    if len(all_results) >= limit:
                        break
                    page_token = results.get('next_page_token')
                    if not page_token:
                        break
                    import time
                    time.sleep(2)
                except Exception as search_error:
                    print(f"Error in search attempt: {str(search_error)}")
                    break
            if len(all_results) >= limit:
                break
        return all_results[:limit]
    except Exception as e:
        print(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vapi/send-listings")
async def send_listings_to_vapi(data: dict):
    """Send selected business listings to VAPI agent for calling"""
    try:
        # Get the configuration
        vapi_token = data.get("vapi_token")
        vapi_agent_id = data.get("vapi_agent_id") 
        vapi_phone_number_id = data.get("vapi_phone_number_id")
        business_names = data.get("business_names", [])
        
        if not vapi_token or not vapi_agent_id or not vapi_phone_number_id:
            raise HTTPException(status_code=400, detail="VAPI token, agent ID, and phone number ID are required")
        
        if not business_names:
            raise HTTPException(status_code=400, detail="No businesses selected")
        
        # Load current businesses
        df = ct.load_data(ct.EXCEL_FILE)
        
        # Function to format phone number for VAPI (+1 country code)
        def format_phone_for_vapi(phone_str):
            if not phone_str:
                return ""
            
            # Remove all non-digit characters
            digits_only = ''.join(filter(str.isdigit, str(phone_str)))
            
            # If it's already 11 digits starting with 1, format as +1XXXXXXXXXX
            if len(digits_only) == 11 and digits_only.startswith('1'):
                return f"+{digits_only}"
            
            # If it's 10 digits, add +1 prefix
            elif len(digits_only) == 10:
                return f"+1{digits_only}"
            
            # If it's other format, try to extract 10 digits and add +1
            elif len(digits_only) >= 10:
                # Take the last 10 digits
                return f"+1{digits_only[-10:]}"
            
            # If less than 10 digits, return as is (might be invalid)
            else:
                return f"+1{digits_only}" if digits_only else ""

        # Filter businesses that are selected and have phone numbers
        selected_businesses = []
        for _, row in df.iterrows():
            business_name = str(row['Name'])
            if business_name in business_names and not pd.isna(row['Number']):
                formatted_phone = format_phone_for_vapi(row['Number'])
                selected_businesses.append({
                    "name": business_name,
                    "phone": formatted_phone,
                    "address": str(row['Address']) if not pd.isna(row['Address']) else "",
                    "status": str(row['Status']) if not pd.isna(row['Status']) else "tocall",
                    "comments": str(row['Comments']) if not pd.isna(row['Comments']) else "",
                    "industry": str(row.get('Industry', 'Restaurant')) if not pd.isna(row.get('Industry', 'Restaurant')) else "Restaurant"
                })
        
        if not selected_businesses:
            raise HTTPException(status_code=400, detail="No businesses found with phone numbers")
        
        # Send to VAPI
        import requests
        
        vapi_url = "https://api.vapi.ai/call"
        headers = {
            "Authorization": f"Bearer {vapi_token}",
            "Content-Type": "application/json"
        }
        
        calls_initiated = []
        failed_calls = []
        
        for business in selected_businesses:
            payload = {
                "assistantId": vapi_agent_id,
                "phoneNumberId": vapi_phone_number_id,
                "customer": {
                    "number": business["phone"],
                    "name": business["name"]
                },
                "assistantOverrides": {
                    "variableValues": {
                        "businessName": business["name"],
                        "businessAddress": business["address"],
                        "businessIndustry": business["industry"],
                        "businessComments": business["comments"],
                        "businessStatus": business["status"]
                    }
                }
            }
            
            try:
                response = requests.post(vapi_url, headers=headers, json=payload, timeout=30)
                if response.status_code == 201:
                    call_data = response.json()
                    calls_initiated.append({
                        "business": business["name"],
                        "phone": business["phone"],
                        "call_id": call_data.get("id"),
                        "status": "initiated"
                    })
                else:
                    failed_calls.append({
                        "business": business["name"],
                        "phone": business["phone"],
                        "error": f"HTTP {response.status_code}: {response.text}"
                    })
            except requests.RequestException as e:
                failed_calls.append({
                    "business": business["name"],
                    "phone": business["phone"],
                    "error": str(e)
                })
        
        return {
            "message": f"VAPI integration completed",
            "calls_initiated": len(calls_initiated),
            "calls_failed": len(failed_calls),
            "successful_calls": calls_initiated,
            "failed_calls": failed_calls,
            "total_businesses": len(selected_businesses)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send to VAPI: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 