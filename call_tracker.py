import pandas as pd
import os
import googlemaps
from tabulate import tabulate

# Replace this with your actual Google API Key
GOOGLE_API_KEY = "ADD YOUR OWN GOOGLE API KEY HERE"

EXCEL_FILE = "places_to_call.xlsx"

# Initialize Google Maps API client
gmaps = googlemaps.Client(key=GOOGLE_API_KEY)

def load_data(file_path):
    """Load Excel file into a pandas DataFrame and ensure required columns exist."""
    if not os.path.exists(file_path):
        print(f"Error: {file_path} does not exist.")
        return None

    df = pd.read_excel(file_path)

    # Standardize column names to remove hidden spaces
    df.columns = df.columns.str.strip()

    # Check if 'Name' column exists
    if 'Name' not in df.columns:
        print("❌ Error: The Excel file must contain a 'Name' column.")
        print("Detected columns:", df.columns)
        return None

    # Ensure required columns exist
    for col in ["Status", "Number", "Address", "Comments"]:
        if col not in df.columns:
            df[col] = ""  # Initialize missing columns

    # Set the default status to "To Call" where status is empty
    df['Status'] = df['Status'].replace("", "To Call")

    return df




def save_data(df, file_path):
    """Save the DataFrame back to Excel."""
    df.to_excel(file_path, index=False)
    print("✅ Data saved successfully.")

def get_business_details_online(place_name):
    """
    Searches for the business phone number and address using Google Places API.
    Returns (phone_number, address) if found, else (None, None).
    """
    try:
        # Search for the place (1st API call)
        result = gmaps.places(query=place_name)

        if result['status'] == 'OK' and result['results']:
            place_id = result['results'][0]['place_id']  # Get first match

            # Fetch phone number and address in the same request (2nd API call)
            details = gmaps.place(place_id=place_id, fields=['formatted_phone_number', 'formatted_address'])

            phone_number = details['result'].get('formatted_phone_number', None)
            address = details['result'].get('formatted_address', None)

            return phone_number, address

        return None, None  # No phone number or address found
    except Exception as e:
        print(f"⚠️ Error searching for {place_name}: {e}")
        return None, None

def mark_called(df, place_name):
    """
    Mark the place's status as 'Called'. If no phone number or address, attempt to find them online.
    """
    place_mask = df['Name'].str.lower().str.strip() == place_name.lower().strip()
    
    if not place_mask.any():
        print(f"No matching place found for '{place_name}'.")
        return df

    # Get the phone number & address if missing
    if df.loc[place_mask, 'Number'].str.strip().eq("").any() or df.loc[place_mask, 'Address'].str.strip().eq("").any():
        print(f"🔍 Searching online for {place_name}'s details...")
        phone_number, address = get_business_details_online(place_name)

        if phone_number:
            df.loc[place_mask, 'Number'] = phone_number
            print(f"✅ Found number: {phone_number}")
        else:
            print("❌ No phone number found online.")

        if address:
            df.loc[place_mask, 'Address'] = address
            print(f"✅ Found address: {address}")
        else:
            print("❌ No address found online.")

    df.loc[place_mask, 'Status'] = 'Called'
    print(f"✅ Updated: {place_name} is now marked as 'Called'.")
    return df


def mark_tocall(df, place_name):
    """
    Mark the place's status as 'To Call'.
    """
    place_mask = df['Name'].str.lower().str.strip() == place_name.lower().strip()
    
    if not place_mask.any():
        print(f"❌ No matching place found for '{place_name}'.")
        return df

    df.loc[place_mask, 'Status'] = "To Call"
    print(f"📞 Updated: {place_name} is now marked as 'To Call'.")
    return df


def list_tocall(df):
    """List all places marked as 'To Call'."""
    status_mask = df['Status'].str.lower().str.strip() == "to call"
    filtered = df[status_mask]

    if filtered.empty:
        print("✅ No places marked as 'To Call'.")
    else:
        print("\n📞 **To Call List:**")
        table_data = []
        for _, row in filtered.iterrows():
            name = row['Name'] if pd.notna(row['Name']) and row['Name'] else "No name available."
            phone_number = row['Number'] if row['Number'].strip() else "No phone number available."
            address = row['Address'] if row['Address'].strip() else "No address available."
            comments = row['Comments'] if row['Comments'].strip() else "No comments."

            table_data.append([name, phone_number, address, comments])

        print(tabulate(table_data, headers=["Restaurant Name", "Phone Number", "Address", "Comments"], tablefmt="grid"))




def get_all_numbers(df):
    """
    Get phone numbers and addresses for all restaurants that don't have them.
    Updates the Excel file after retrieving missing data.
    """
    # Ensure 'Number' and 'Address' columns are treated as strings and fill NaN values
    df['Number'] = df['Number'].astype(str).replace("nan", "").fillna("")
    df['Address'] = df['Address'].astype(str).replace("nan", "").fillna("")

    # Identify rows with missing numbers or addresses
    missing_data = df[(df['Number'].str.strip() == "") | (df['Address'].str.strip() == "")]

    if missing_data.empty:
        print("✅ All restaurants already have phone numbers and addresses.")
        return df

    print(f"🔍 Searching for phone numbers and addresses for {len(missing_data)} restaurants...")

    for _, row in missing_data.iterrows():
        place_name = row['Name']
        print(f"🔍 Searching for {place_name}...")
        phone_number, address = get_business_details_online(place_name)

        if phone_number:
            df.loc[df['Name'] == place_name, 'Number'] = phone_number
            print(f"✅ Found: {place_name} | 📞 {phone_number}")
        else:
            print(f"❌ No phone number found for {place_name}.")

        if address:
            df.loc[df['Name'] == place_name, 'Address'] = address
            print(f"✅ Found: {place_name} | 📍 {address}")
        else:
            print(f"❌ No address found for {place_name}.")

    print("✅ All available numbers and addresses retrieved and updated.")
    save_data(df, EXCEL_FILE)  # Save changes to Excel
    return df


def list_by_status(df, status):
    """List all places with the given status along with their phone numbers, addresses, and comments."""
    # Convert 'Status' column to string and handle NaN values
    df['Status'] = df['Status'].astype(str).replace("nan", "").fillna("")

    status_mask = df['Status'].str.lower().str.strip() == status.lower().strip()
    filtered = df[status_mask]

    if filtered.empty:
        print(f"❌ No places found with status '{status}'.")
        return

    # Ensure 'Number', 'Address', and 'Comments' columns are treated as strings
    for col in ["Number", "Address", "Comments"]:
        df[col] = df[col].astype(str).replace("nan", "").fillna("")

    table_data = []
    for _, row in filtered.iterrows():
        name = row['Name'] if pd.notna(row['Name']) and row['Name'] else "No name available."
        phone_number = row['Number'] if row['Number'].strip() else "No phone number available."
        address = row['Address'] if row['Address'].strip() else "No address available."
        comments = row['Comments'] if row['Comments'].strip() else "No comments."

        table_data.append([name, phone_number, address, comments])

    print(f"\n📋 Places with status '{status}':")
    print(tabulate(table_data, headers=["Restaurant Name", "Phone Number", "Address", "Comments"], tablefmt="grid"))



def mark_dont_call(df, place_name):
    """
    Mark the place's status as 'Don't Call'.
    """
    place_mask = df['Name'].str.lower().str.strip() == place_name.lower().strip()
    
    if not place_mask.any():
        print(f"❌ No matching place found for '{place_name}'.")
        return df

    df.loc[place_mask, 'Status'] = "Don't Call"
    print(f"🚫 Updated: {place_name} is now marked as 'Don't Call'.")
    return df



def mark_callback(df, place_name):
    """
    Mark the place's status as 'Call Back'.
    """
    place_mask = df['Name'].str.lower().str.strip() == place_name.lower().strip()
    
    if not place_mask.any():
        print(f"❌ No matching place found for '{place_name}'.")
        return df

    df.loc[place_mask, 'Status'] = "Call Back"
    print(f"📞 Updated: {place_name} is now marked as 'Call Back'.")
    return df



def list_callback(df):
    """List all places marked as 'Call Back'."""
    status_mask = df['Status'].str.lower().str.strip() == "call back"
    filtered = df[status_mask]

    if filtered.empty:
        print("✅ No places marked as 'Call Back'.")
    else:
        print("\n📞 **Call Back List:**")
        table_data = []
        for _, row in filtered.iterrows():
            name = row['Name'] if pd.notna(row['Name']) and row['Name'] else "No name available."
            phone_number = row['Number'] if row['Number'].strip() else "No phone number available."
            address = row['Address'] if row['Address'].strip() else "No address available."
            comments = row['Comments'] if row['Comments'].strip() else "No comments."

            table_data.append([name, phone_number, address, comments])

        print(tabulate(table_data, headers=["Restaurant Name", "Phone Number", "Address", "Comments"], tablefmt="grid"))






def save_to_excel(df):
    """
    Saves the current DataFrame to the Excel file.
    Ensures that the data is properly written and confirms success.
    """
    try:
        df.to_excel(EXCEL_FILE, index=False)
        print(f"✅ Data successfully saved to {EXCEL_FILE}")
    except Exception as e:
        print(f"❌ Error saving to Excel: {e}")


def help():
    """Displays all available commands and their usage."""
    print("\n📖 Cold Call Tracker - Help Guide")
    print("--------------------------------------------------")
    print("✅ **Basic Commands:**")
    print("   - `List All` → Show all businesses with their phone number, address, and comments.")
    print("   - `Get All Numbers` → Fetch missing phone numbers and addresses using Google API.")
    print("   - `Save` → Manually save the Excel file.")
    print("   - `Exit` → Save and exit the application.")
    print("--------------------------------------------------")
    print("✅ **Marking Calls:**")
    print("   - `Called BusinessName` → Mark a business as 'Called'.")
    print("   - Example: `Called McDonalds`")
    print("   - `List Called` → Show only businesses that have been marked as 'Called'.")
    print("--------------------------------------------------")
    print("✅ **Managing the To Call List:**")
    print("   - `ToCall BusinessName` → Mark a business as 'To Call'.")
    print("   - Example: `ToCall Starbucks`")
    print("   - `List ToCall` → Show all businesses that are in the 'To Call' list.")
    print("--------------------------------------------------")
    print("✅ **Managing the Do Not Call List:**")
    print("   - `Dont Call BusinessName` → Mark a business as 'Don't Call'.")
    print("   - Example: `Dont Call Pizza Hut`")
    print("   - `List Dont Call` → Show all businesses that have been marked as 'Don't Call'.")
    print("--------------------------------------------------")
    print("✅ **Managing Callbacks:**")
    print("   - `Callback BusinessName` → Mark a business as 'Call Back'.")
    print("   - Example: `Callback Apple Store`")
    print("   - `List Callback` → Show all businesses marked as 'Call Back'.")
    print("--------------------------------------------------")
    print("✅ **Adding & Resetting Comments:**")
    print("   - `Comment BusinessName - Your Comment` → Add a note to a business.")
    print("   - Example: `Comment Walmart - Follow up next week`")
    print("   - `Reset Comment BusinessName - New Comment` → Reset the comment for a business.")
    print("   - Example: `Reset Comment BestBuy - Spoke with manager`")
    print("--------------------------------------------------")
    print("🚀 Now you know how to use everything! Enjoy your cold calling! 🚀")




def list_all(df):
    """List all restaurants with their name, address, phone number, and comments in columns."""
    if df.empty:
        print("❌ No data available in the Excel file.")
        return

    # Ensure 'Number', 'Address', and 'Comments' columns are treated as strings
    for col in ["Number", "Address", "Comments"]:
        df[col] = df[col].astype(str).replace("nan", "").fillna("")

    table_data = []
    for _, row in df.iterrows():
        name = row['Name'] if pd.notna(row['Name']) and row['Name'] else "No name available."
        phone_number = row['Number'] if row['Number'].strip() else "No phone number available."
        address = row['Address'] if row['Address'].strip() else "No address available."
        comments = row['Comments'] if row['Comments'].strip() else "No comments."

        table_data.append([name, phone_number, address, comments])

    print("\n📋 All Restaurants:")
    print(tabulate(table_data, headers=["Restaurant Name", "Phone Number", "Address", "Comments"], tablefmt="grid"))


def reset_comment(df, place_name, new_comment):
    """
    Reset the comment for a business in the Excel file.
    This will replace the existing comment with a new one.
    """
    place_mask = df['Name'].str.lower().str.strip() == place_name.lower().strip()

    if not place_mask.any():
        print(f"❌ No matching place found for '{place_name}'.")
        return df

    # Ensure 'Comments' column exists and is a string
    df['Comments'] = df['Comments'].astype(str).replace("nan", "").fillna("")

    # Reset and add the new comment
    df.loc[place_mask, 'Comments'] = new_comment
    print(f"✅ Comment reset for {place_name}: {new_comment}")

    return df



def main():
    df = load_data(EXCEL_FILE)
    if df is None:
        return

    print("\n📞 Welcome to the Cold Call Tracker!")
    print("✅ Type `Help` to see all available commands.")
    print("✅ Type `Exit` to quit.")

    while True:
        user_input = input("\nEnter command: ").strip().lower()

        if user_input == 'exit':
            save_data(df, EXCEL_FILE)
            print("All changes saved. Goodbye!")
            break

        elif user_input == 'help':
            help()

        elif user_input == "list all":
            list_all(df)

        elif user_input.startswith("called "):
            place_name = user_input[7:].strip()
            df = mark_called(df, place_name)
            save_data(df, EXCEL_FILE)

        elif user_input == "list called":
            list_by_status(df, "Called")

        elif user_input == "get all numbers":
            df = get_all_numbers(df)

        elif user_input.startswith("comment "):
            parts = user_input[8:].split(" - ")
            if len(parts) == 2:
                place_name, comment = parts[0].strip(), parts[1].strip()
                df = add_comment(df, place_name, comment)
                save_data(df, EXCEL_FILE)
            else:
                print("❌ Use format: 'Comment BusinessName - Your Comment'")

        elif user_input == "save":
            save_data(df, EXCEL_FILE)

            
        elif user_input.startswith("reset comment "):
            parts = user_input[14:].split(" - ")
            if len(parts) == 2:
                place_name, new_comment = parts[0].strip(), parts[1].strip()
                df = reset_comment(df, place_name, new_comment)
                save_to_excel(df)
            else:
                print("❌ Use format: 'Reset Comment BusinessName - New Comment'")


        elif user_input == "list dont call":
            list_by_status(df, "Don't Call")

        elif user_input.startswith("dont call "): 
            place_name = user_input[len("dont call "):].strip()  # Correct slicing
            df = mark_dont_call(df, place_name)
            save_data(df, EXCEL_FILE)


        elif user_input.startswith("callback "): 
            place_name = user_input[len("callback "):].strip()  # Correct string slicing
            df = mark_callback(df, place_name)
            save_data(df, EXCEL_FILE)

        elif user_input == "list callback":
            list_callback(df)


        elif user_input.startswith("tocall "): 
            place_name = user_input[len("tocall "):].strip()  # Extract business name
            df = mark_tocall(df, place_name)
            save_data(df, EXCEL_FILE)

        elif user_input == "list tocall":
            list_tocall(df)


        else:
            print("❌ Unrecognized command. Type `Help` to see available commands.")

if __name__ == "__main__":
    main()

