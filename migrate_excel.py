import pandas as pd
import os
from dotenv import load_dotenv
import json
import requests

print("Starting migration script...")

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing required environment variables.")
    print("Please set SUPABASE_URL and SUPABASE_KEY in your .env file.")
    exit(1)

# Initialize headers
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def clean_record(record):
    """Clean and format a record for Supabase."""
    cleaned = {}
    
    # Map Excel columns to database columns - match exact schema
    column_mapping = {
        'name': 'name',
        'number': 'phone',  # Map Number column to phone field
        'address': 'address',
        'status': 'status',
        'comments': 'comments',
        'industry': 'industry',
        'region': 'region',
        'callback_due_date': 'callback_due_date',
        'callback_due_time': 'callback_due_time',
        'callback_reason': 'callback_reason',
        'callback_priority': 'callback_priority',
        'callback_count': 'callback_count',
        'lead_score': 'lead_score',
        'interest_level': 'interest_level',
        'best_time_to_call': 'best_time_to_call',
        'decision_maker': 'decision_maker',
        'next_action': 'next_action'
    }
    
    for k, v in record.items():
        # Get the mapped column name
        clean_key = str(k).lower().strip().replace(' ', '_')
        db_column = column_mapping.get(clean_key)
        
        if not db_column:
            continue
            
        # Handle NaN values
        if pd.isna(v):
            if db_column == 'phone':  # Changed from number to phone
                cleaned[db_column] = ''  # Empty string for missing phone numbers
            elif db_column in ['callback_count', 'lead_score']:
                cleaned[db_column] = 0  # Default to 0 for numeric fields
            else:
                cleaned[db_column] = ''  # Empty string for other fields
            continue
            
        # Clean and format the value
        if isinstance(v, (int, float)):
            if db_column in ['callback_count', 'lead_score']:
                cleaned[db_column] = int(v)  # Convert float to int for these fields
            else:
                cleaned[db_column] = v
        else:
            cleaned[db_column] = str(v).strip()
    
    # Set default values for required fields
    if 'status' not in cleaned:
        cleaned['status'] = 'tocall'
    if 'industry' not in cleaned:
        cleaned['industry'] = 'Restaurant'
    if 'region' not in cleaned:
        cleaned['region'] = ''
    if 'phone' not in cleaned:  # Changed from number to phone
        cleaned['phone'] = ''
    if 'callback_count' not in cleaned:
        cleaned['callback_count'] = 0
    if 'lead_score' not in cleaned:
        cleaned['lead_score'] = 5
    
    return cleaned

def migrate_excel_to_supabase():
    try:
        print("Starting migration process...")
        
        # Deletion functionality removed - migration will append/update records instead
        print("Skipping deletion of existing records (deletion functionality removed)...")
        
        # Read the Excel file
        print("\nReading Excel file...")
        try:
            df = pd.read_excel('places_to_call.xlsx')
            print(f"Successfully read Excel file. Found {len(df)} records")
            print("Column names:", df.columns.tolist())
        except Exception as e:
            print(f"Error reading Excel file: {e}")
            return
        
        # Convert DataFrame to list of dictionaries
        records = df.to_dict('records')
        success_count = 0
        fail_count = 0
        
        print("\nStarting record migration...")
        for i, record in enumerate(records):
            try:
                cleaned_record = clean_record(record)
                print(f"\nProcessing record {i+1}/{len(records)}:")
                print(f"Original record: {record}")
                print(f"Cleaned record: {cleaned_record}")
                
                response = requests.post(
                    f'{SUPABASE_URL}/rest/v1/businesses',
                    headers=headers,
                    json=cleaned_record
                )
                
                if response.status_code == 201:
                    success_count += 1
                    print(f"Successfully added record {i+1}")
                else:
                    fail_count += 1
                    print(f"Failed to add record {i+1}")
                    print(f"Status code: {response.status_code}")
                    print(f"Response: {response.text}")
                    
            except Exception as e:
                fail_count += 1
                print(f"Error processing record {i+1}: {str(e)}")
        
        print(f"\nMigration complete!")
        print(f"Total records processed: {len(records)}")
        print(f"Successful: {success_count}")
        print(f"Failed: {fail_count}")
        
    except Exception as e:
        print(f"Migration error: {str(e)}")

if __name__ == "__main__":
    migrate_excel_to_supabase() 