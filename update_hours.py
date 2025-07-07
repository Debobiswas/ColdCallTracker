import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

def update_hours():
    """
    Reads business data from an Excel file and updates the 'hours' column
    for corresponding entries in the Supabase 'businesses' table.
    """
    load_dotenv()

    # --- Configuration ---
    # Assumes the Excel file is in the same directory as the script.
    excel_file_path = 'places_to_call.xlsx'
    # The name of the sheet in the Excel file to read from.
    sheet_name = 'Sheet1' 
    # The column in your Excel file that contains the business names.
    business_name_column = 'Name'
    # The column in your Excel file that contains the hours.
    hours_column = 'Hours'

    # --- Supabase Connection ---
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        print("Error: Supabase URL or Service Key is not set.")
        print("Please check your .env file.")
        return

    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        print("Successfully connected to Supabase.")
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        return

    # --- Read Excel Data ---
    try:
        df = pd.read_excel(excel_file_path, sheet_name=sheet_name)
        print(f"Successfully read {len(df)} rows from {excel_file_path}.")
    except FileNotFoundError:
        print(f"Error: The file {excel_file_path} was not found.")
        return
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return

    # --- Update Database ---
    update_count = 0
    not_found_count = 0

    for index, row in df.iterrows():
        business_name = row[business_name_column]
        hours = row[hours_column]

        # Skip rows without a business name
        if pd.isna(business_name) or not str(business_name).strip():
            continue

        business_name_str = str(business_name).strip()
        
        # If hours data is empty or whitespace, set it to None to clear the DB field.
        # Otherwise, use the value from the Excel file.
        if pd.isna(hours) or not str(hours).strip():
            update_payload = {'hours': None}
        else:
            update_payload = {'hours': str(hours)}
        
        try:
            # First, find the business by name to get its unique ID.
            # This is safer than updating by name directly.
            find_response = supabase.table('businesses').select('id, name').ilike('name', f'%{business_name_str}%').execute()

            if find_response.data:
                if len(find_response.data) > 1:
                    print(f"Warning: Found multiple ({len(find_response.data)}) businesses matching '{business_name_str}'. Updating the first one: '{find_response.data[0]['name']}'")
                
                business_id = find_response.data[0]['id']
                
                # Now, update the business record using its specific ID.
                update_response = supabase.table('businesses').update(update_payload).eq('id', business_id).execute()

                # If the code reaches here, the update command was successful.
                if update_payload['hours'] is None:
                    print(f"Cleared hours for '{business_name_str}' (ID: {business_id})")
                else:
                    print(f"Updated hours for '{business_name_str}' (ID: {business_id}) to '{update_payload['hours']}'")
                update_count += 1
            
            else:
                print(f"Warning: Business '{business_name_str}' not found in the database.")
                not_found_count += 1

        except Exception as e:
            print(f"An error occurred while processing '{business_name_str}': {e}")
    
    print("\n--- Update Summary ---")
    print(f"Successfully processed {update_count} businesses.")
    print(f"{not_found_count} businesses from the Excel file were not found in the database.")
    print("----------------------")


if __name__ == "__main__":
    update_hours() 