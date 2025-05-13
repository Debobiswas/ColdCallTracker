import pandas as pd
import os

def set_all_businesses_to_restaurant():
    """
    Update all businesses in the Excel file to have the Restaurant industry.
    """
    try:
        # Excel file path
        excel_file = "places_to_call.xlsx"
        
        # Check if file exists
        if not os.path.exists(excel_file):
            print(f"Error: File {excel_file} does not exist")
            return
        
        # Load the Excel file
        print(f"Loading data from {excel_file}...")
        df = pd.read_excel(excel_file)
        
        # Count businesses before update
        business_count = len(df)
        print(f"Found {business_count} businesses")
        
        # Ensure Industry column exists
        if 'Industry' not in df.columns:
            print("Adding Industry column...")
            df['Industry'] = None
        
        # Set all businesses to Restaurant industry
        print("Setting all businesses to Restaurant industry...")
        df['Industry'] = "Restaurant"
        
        # Save the updated data
        print("Saving updated data...")
        df.to_excel(excel_file, index=False)
        
        print(f"Success: Updated {business_count} businesses to have industry: Restaurant")
    
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    print("Updating all businesses to have Restaurant industry...")
    set_all_businesses_to_restaurant()
    print("Done!") 