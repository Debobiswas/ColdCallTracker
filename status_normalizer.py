import pandas as pd
import os

# Define the valid statuses (must match the ones in api.py)
VALID_STATUSES = ['tocall', 'called', 'callback', 'dont_call', 'client', 'lead']

def normalize_status(status):
    """Normalize a status value to one of the valid statuses."""
    if pd.isna(status):
        return 'tocall'  # Default status for empty values
    
    # Convert to string, lowercase and strip whitespace
    clean_status = str(status).strip().lower()
    
    # Direct match
    if clean_status in VALID_STATUSES:
        return clean_status
    
    # Check for partial matches
    for valid_status in VALID_STATUSES:
        if valid_status in clean_status or clean_status in valid_status:
            print(f"Normalizing '{status}' to '{valid_status}'")
            return valid_status
    
    # If no match, default to 'tocall'
    print(f"WARNING: No match found for '{status}', defaulting to 'tocall'")
    return 'tocall'

def main():
    # Path to Excel file
    excel_file = "places_to_call.xlsx"
    
    # Backup the original file
    backup_file = "places_to_call_backup.xlsx"
    if os.path.exists(excel_file):
        print(f"Creating backup at {backup_file}")
        df_original = pd.read_excel(excel_file)
        df_original.to_excel(backup_file, index=False)
    else:
        print(f"Error: {excel_file} not found")
        return
    
    # Load data
    df = pd.read_excel(excel_file)
    
    # Print original status values
    original_statuses = df['Status'].unique()
    print(f"Original unique status values: {original_statuses}")
    
    # Normalize status values
    print("\nNormalizing status values...")
    df['Status'] = df['Status'].apply(normalize_status)
    
    # Print new status values
    new_statuses = df['Status'].unique()
    print(f"\nNew unique status values: {new_statuses}")
    
    # Save the updated file
    df.to_excel(excel_file, index=False)
    print(f"\nSaved normalized statuses to {excel_file}")
    print(f"Original file backed up to {backup_file}")

if __name__ == "__main__":
    main() 