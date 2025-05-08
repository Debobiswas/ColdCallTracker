from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pydantic import BaseModel
from typing import List, Optional
import call_tracker as ct
import os
import traceback
from datetime import datetime

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
VALID_STATUSES = ['tocall', 'called', 'callback', 'dont_call', 'client']

class Business(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    status: str
    comment: Optional[str] = None
    last_called_date: Optional[str] = None
    last_callback_date: Optional[str] = None

class BusinessUpdate(BaseModel):
    status: Optional[str] = None
    comment: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class NewBusiness(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    status: str = "tocall"
    comment: Optional[str] = None

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

def load_clients():
    if not os.path.exists(CLIENTS_FILE):
        df = pd.DataFrame(columns=["Name", "Address", "Phone", "Website", "Price", "Subscription", "Date"])
        df.to_excel(CLIENTS_FILE, index=False)
    return pd.read_excel(CLIENTS_FILE)

def save_clients(df):
    df.to_excel(CLIENTS_FILE, index=False)

@app.get("/api/businesses", response_model=List[Business])
async def get_all_businesses():
    try:
        df = ct.load_data(ct.EXCEL_FILE)
        businesses = []
        for _, row in df.iterrows():
            businesses.append(Business(
                name=str(row['Name']),
                phone=None if pd.isna(row['Number']) else str(row['Number']),
                address=None if pd.isna(row['Address']) else str(row['Address']),
                status=str(row['Status']) if not pd.isna(row['Status']) else "tocall",
                comment=None if pd.isna(row['Comments']) else str(row['Comments']),
                last_called_date=None if pd.isna(row['LastCalledDate']) else str(row['LastCalledDate']),
                last_callback_date=None if pd.isna(row['LastCallbackDate']) else str(row['LastCallbackDate'])
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
        filtered_df = df[df['Status'].str.lower() == status.lower()]
        businesses = []
        for _, row in filtered_df.iterrows():
            businesses.append(Business(
                name=str(row['Name']),
                phone=None if pd.isna(row['Number']) else str(row['Number']),
                address=None if pd.isna(row['Address']) else str(row['Address']),
                status=str(row['Status']) if not pd.isna(row['Status']) else "tocall",
                comment=None if pd.isna(row['Comments']) else str(row['Comments']),
                last_called_date=None if pd.isna(row['LastCalledDate']) else str(row['LastCalledDate']),
                last_callback_date=None if pd.isna(row['LastCallbackDate']) else str(row['LastCallbackDate'])
            ))
        return businesses
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/businesses/filter", response_model=List[Business])
async def filter_businesses(status: Optional[str] = Query(None)):
    try:
        # Always print this to confirm the endpoint is being hit
        print("\n\n===== FILTER ENDPOINT HIT =====")
        print(f"Query parameter 'status': {status}")

        df = ct.load_data(ct.EXCEL_FILE)
        print(f"Loaded {len(df)} businesses from Excel")
        print(f"Status column values: {df['Status'].unique()}")
        
        # Skip validation for now - just do the filtering with very relaxed matching
        if status and status.strip():
            status_lower = status.strip().lower()
            print(f"Looking for businesses with status matching: '{status_lower}'")
            
            # Create a lowercase version of status for comparison
            df['status_lower'] = df['Status'].astype(str).str.lower().str.strip()
            
            # Print some rows for debugging
            print("First few rows of Excel data:")
            print(df[['Name', 'Status', 'status_lower']].head())
            
            # Filter with exact matching
            filtered_df = df[df['status_lower'] == status_lower]
            
            print(f"Found {len(filtered_df)} businesses matching '{status_lower}'")
        else:
            filtered_df = df
            print("No status filter applied, returning all businesses")
        
        # Prepare the response
        businesses = []
        for _, row in filtered_df.iterrows():
            businesses.append(Business(
                name=str(row['Name']),
                phone=None if pd.isna(row['Number']) else str(row['Number']),
                address=None if pd.isna(row['Address']) else str(row['Address']),
                status=str(row['Status']) if not pd.isna(row['Status']) else "tocall",
                comment=None if pd.isna(row['Comments']) else str(row['Comments']),
                last_called_date=None if pd.isna(row['LastCalledDate']) else str(row['LastCalledDate']),
                last_callback_date=None if pd.isna(row['LastCallbackDate']) else str(row['LastCallbackDate'])
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
        df = ct.load_data(ct.EXCEL_FILE)
        # Robust name matching: ignore case and whitespace
        name_clean = name.strip().lower()
        df['Name_clean'] = df['Name'].astype(str).str.strip().str.lower()
        if name_clean not in df['Name_clean'].values:
            raise HTTPException(status_code=404, detail="Business not found")
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

        if update.comment is not None:
            print("\n\n===== COMMENT UPDATE DEBUGGING =====")
            print(f"1. Business name: '{name}'")
            print(f"2. Comment from frontend: '{update.comment}'")
            
            # Ensure Comments column is properly set up
            if 'Comments' not in df.columns:
                print("WARNING: Comments column not found, creating it")
                df['Comments'] = ""
            
            # Get the original comment value
            original_comment = "Empty" 
            if row_mask.any():
                try:
                    original_comment = df.loc[row_mask, 'Comments'].values[0]
                    print(f"3. Original comment in Excel: '{original_comment}'")
                except Exception as e:
                    print(f"ERROR reading original comment: {str(e)}")
            else:
                print("3. No matching row found!")
            
            # Direct assignment of comment - NO TIMESTAMP, NO APPEND
            try:
                # Always use the EXACT comment value from the update, no transformations
                df.loc[row_mask, 'Comments'] = update.comment
                print(f"4. Set comment to: '{update.comment}'")
                
                # Verify the comment was set correctly
                if row_mask.any():
                    try:
                        new_comment = df.loc[row_mask, 'Comments'].values[0]
                        print(f"5. Updated comment in DataFrame: '{new_comment}'")
                    except Exception as e:
                        print(f"ERROR reading updated comment: {str(e)}")
            except Exception as e:
                print(f"ERROR setting comment: {str(e)}")
            
            print("===== END COMMENT DEBUGGING =====\n\n")

        if update.name is not None:
            df.loc[row_mask, 'Name'] = update.name

        if update.phone is not None:
            df.loc[row_mask, 'Phone'] = update.phone

        if update.address is not None:
            df.loc[row_mask, 'Address'] = update.address

        df = df.drop(columns=['Name_clean'])
        
        # Use the specialized direct save function for the API
        # This avoids all timestamp and appending logic in the original save_to_excel
        print("Using API direct save to avoid comment processing")
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
        
        # Check if business already exists
        if business.name in df['Name'].values:
            raise HTTPException(status_code=400, detail="Business already exists")
        
        # Add new business
        new_row = pd.DataFrame({
            'Name': [business.name],
            'Number': [business.phone],
            'Address': [business.address],
            'Status': [business.status],
            'Comments': [business.comment]
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

                # Check if business already exists
                if business.name in df['Name'].values:
                    errors.append(f"Business {business.name} already exists")
                    continue

                # Add new business
                new_row = pd.DataFrame({
                    'Name': [business.name],
                    'Number': [business.phone],
                    'Address': [business.address],
                    'Status': [business.status],
                    'Comments': [business.comment]
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
        phone, address = ct.get_business_details_online(name)
        return {"name": name, "phone": phone, "address": address}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/businesses/search")
async def search_businesses(
    query: str = Query(..., description="Search query for businesses"),
    limit: int = Query(15, le=30, description="Number of results to return (max 30)"),
    no_website: bool = Query(False, description="Only include results without a website"),
    initial_radius: int = Query(1000, description="Initial search radius in meters"),
    max_radius: int = Query(50000, description="Maximum search radius in meters")
):
    try:
        output = []
        current_radius = initial_radius
        seen_places = set()  # Track unique places by place_id
        page_token = None  # For pagination
        search_attempts = 0  # Track number of search attempts
        max_attempts = 5  # Maximum number of search attempts to prevent infinite loops

        while len(output) < limit and current_radius <= max_radius and search_attempts < max_attempts:
            # Use Google Places API to search for businesses with radius
            search_params = {
                'query': query,
                'radius': current_radius
            }
            if page_token:
                search_params['page_token'] = page_token

            results = ct.gmaps.places(**search_params)

            if results['status'] != 'OK' or not results.get('results'):
                # If no results found or reached end of results, increase radius and reset pagination
                current_radius *= 2
                page_token = None
                search_attempts += 1
                continue

            # Process results
            for place in results['results']:
                if len(output) >= limit:
                    break

                place_id = place['place_id']
                
                # Skip if we've already seen this place
                if place_id in seen_places:
                    continue
                seen_places.add(place_id)

                try:
                    details = ct.gmaps.place(
                        place_id=place_id, 
                        fields=['name', 'formatted_phone_number', 'formatted_address', 'website', 'opening_hours', 'url']
                    )
                    info = details.get('result', {})
                    
                    # If no_website is True, skip if website exists
                    if no_website and info.get('website'):
                        continue

                    output.append({
                        'name': info.get('name', place.get('name', '')),
                        'phone': info.get('formatted_phone_number', ''),
                        'address': info.get('formatted_address', ''),
                        'website': info.get('website', ''),
                        'opening_hours': info.get('opening_hours', {}).get('weekday_text', []),
                        'google_maps_url': info.get('url', ''),
                    })
                except Exception as detail_error:
                    print(f"Error fetching details for place {place_id}: {str(detail_error)}")
                    continue

            # Check if there are more results available
            page_token = results.get('next_page_token')
            if not page_token:
                # If no more pages, increase radius and reset pagination
                current_radius *= 2
                search_attempts += 1

            # Add a small delay if we have a next page token (required by Google Places API)
            if page_token:
                import time
                time.sleep(2)

        # Return the results we have (might be less than limit if we hit max_radius)
        return output[:min(limit, len(output))]
    except Exception as e:
        print(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 