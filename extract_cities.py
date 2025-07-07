import pandas as pd
import re

def extract_city(address):
    # List of province abbreviations and "Canada" to skip
    skip_words = {'BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU', 'Canada'}
    
    # Split the address by comma and clean each part
    parts = [p.strip() for p in address.split(',')]
    
    # Go through parts from right to left
    for part in reversed(parts):
        # Skip empty parts
        if not part:
            continue
            
        # Skip if it's a province abbreviation or "Canada"
        if part in skip_words:
            continue
            
        # Skip if it contains any numbers
        if re.search(r'\d', part):
            continue
            
        # If we get here and the part contains letters, it's likely our city
        if re.search(r'[a-zA-Z]', part):
            return part
    
    return ''

def main():
    try:
        # Read the Excel file
        print("Reading Excel file...")
        excel_file = 'places_to_call.xlsx'
        df = pd.read_excel(excel_file)
        
        # Extract city from Address column
        print("Extracting cities from addresses...")
        df['Region'] = df['Address'].apply(extract_city)
        
        # Save changes back to the original file
        print("Saving changes to original file...")
        df.to_excel(excel_file, index=False)
        
        # Print summary
        cities = df['Region'].value_counts()
        print("\nCities extracted:")
        for city, count in cities.items():
            if city:  # Only show non-empty cities
                print(f"{city}: {count} businesses")
            
        print("\nDone! The original file has been updated.")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main() 