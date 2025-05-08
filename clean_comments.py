import pandas as pd
import os
from datetime import datetime
import shutil

EXCEL_FILE = 'places_to_call.xlsx'

def clean_comments_thoroughly(file_path=EXCEL_FILE):
    """
    Completely clean all comments in the Excel file.
    Creates a backup before making changes.
    Completely rewrites the file to ensure no historical data remains.
    """
    # Create a backup first
    backup_file = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.path.basename(file_path)}"
    try:
        shutil.copy2(file_path, backup_file)
        print(f"Backup created: {backup_file}")
    except Exception as e:
        print(f"Warning: Could not create backup: {str(e)}")
    
    # Load the data
    try:
        df = pd.read_excel(file_path)
        original_row_count = len(df)
        print(f"Loaded {original_row_count} rows from {file_path}")
        
        # Check if Comments column exists
        if 'Comments' in df.columns:
            print("Found Comments column. Cleaning...")
            
            # Method 1: Replace with empty strings
            df['Comments'] = df['Comments'].apply(lambda x: 
                str(x).split('|')[-1].strip() 
                if pd.notna(x) and str(x).strip() != "" 
                else "")
            
            # Method 2: Complete overwrite by creating a new DataFrame
            cleaned_df = pd.DataFrame()
            for col in df.columns:
                if col == 'Comments':
                    # Already cleaned above, just copy
                    cleaned_df[col] = df[col]
                else:
                    cleaned_df[col] = df[col]
                    
            # Save the cleaned data with verification
            cleaned_df.to_excel(file_path, index=False)
            print(f"Comments cleaned and saved to {file_path}")
            
            # Verify the save
            verify_df = pd.read_excel(file_path)
            if len(verify_df) == original_row_count:
                print(f"Verification successful. {len(verify_df)} rows saved.")
                for i, row in verify_df.iterrows():
                    if 'Comments' in verify_df.columns and '|' in str(row.get('Comments', '')):
                        print(f"WARNING: Row {i} still has '|' in Comments: {row.get('Comments', '')}")
            else:
                print(f"WARNING: Row count mismatch. Original: {original_row_count}, Saved: {len(verify_df)}")
                
        else:
            print("No Comments column found in the Excel file.")
    
    except Exception as e:
        print(f"ERROR: {str(e)}")
        print("Restoring from backup...")
        try:
            if os.path.exists(backup_file):
                shutil.copy2(backup_file, file_path)
                print(f"Restored from backup: {backup_file}")
        except Exception as backup_error:
            print(f"Failed to restore from backup: {str(backup_error)}")

if __name__ == '__main__':
    clean_comments_thoroughly()
    print("Script completed.") 