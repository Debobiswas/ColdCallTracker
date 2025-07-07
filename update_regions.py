import pandas as pd
from supabase import create_client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

def main():
    try:
        # Read Excel file
        print("Reading Excel file...")
        df = pd.read_excel('places_to_call.xlsx')
        
        # Create a mapping of business name to region
        name_to_region = {}
        for _, row in df.iterrows():
            if pd.notna(row['Region']):  # Only include if Region is not NaN
                name_to_region[row['Name']] = row['Region']
        
        print(f"Found {len(name_to_region)} businesses with regions in Excel")
        
        # Get all businesses from Supabase
        print("Fetching businesses from Supabase...")
        response = supabase.table('businesses').select('id', 'name', 'region').execute()
        businesses = response.data
        
        # Update regions
        print("Updating regions in Supabase...")
        updates = 0
        for business in businesses:
            if business['name'] in name_to_region:
                new_region = name_to_region[business['name']]
                if new_region != business.get('region'):
                    print(f"Updating {business['name']} with region: {new_region}")
                    supabase.table('businesses').update(
                        {'region': new_region}
                    ).eq('id', business['id']).execute()
                    updates += 1
        
        print(f"\nComplete! Updated {updates} businesses with their regions.")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main() 