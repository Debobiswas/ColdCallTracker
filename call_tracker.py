import pandas as pd
import os
import googlemaps
from tabulate import tabulate
from dotenv import load_dotenv

#Voice recognition
import speech_recognition as sr
import pyttsx3


#GUI
import tkinter as tk
from tkinter import ttk, messagebox, simpledialog


# Load environment variables
load_dotenv()

# Get Google API Key from environment variable
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

EXCEL_FILE = "places_to_call.xlsx"

engine = pyttsx3.init()

valid_commands = [
    "list all",
    "get all numbers",

    "save",
    "exit",
    "called",
    "list called",
    "comment",
    "reset comment",
    "list dont call",
    "dont call",
    "callback",
    "list callback",
    "tocall",
    "list tocall",
    "help",
]




#---------------------------------Voice Recognition---------------------------------#
mic = sr.Microphone()
recognizer = sr.Recognizer()

def listen_for_command():
    with mic as source:
        speak("Listening for command")
        print("Listening for command...")
        recognizer.adjust_for_ambient_noise(source)
        audio = recognizer.listen(source)

    try:
        command = recognizer.recognize_google(audio).lower().strip()
        print(f"✅ You said: {command}")

        # Check if command is valid
        for valid in valid_commands:
            if command.startswith(valid):
                return command
        
        # If command is not recognized
        speak("I'm sorry, please give a valid command.")
        return None

    except sr.UnknownValueError:
        speak("I couldn't understand that. Please try again.")
        return None
    except sr.RequestError:
        speak("Speech recognition service is unavailable.")
        return None

#---------------------------------Speaking---------------------------------#
def speak(text):
    print(f"🗣️ Speaking: {text}")
    engine.say(text)
    engine.runAndWait()










#---------------------------------Functions---------------------------------#

# Initialize Google Maps API client
gmaps = googlemaps.Client(key=GOOGLE_API_KEY)

gmaps = None

def initialize_gmaps():
    global gmaps
    key = os.getenv('GOOGLE_API_KEY')
    if key:
        gmaps = googlemaps.Client(key=key)
    else:
        gmaps = None

# Initialize on startup
initialize_gmaps()

def create_empty_excel():
    """Create an empty Excel file with the required columns if it doesn't exist."""
    if not os.path.exists(EXCEL_FILE):
        df = pd.DataFrame(columns=['Name', 'Number', 'Address', 'Status', 'Comments'])
        save_to_excel(df)

def load_data(file_path=EXCEL_FILE):
    """Load data from Excel file, create if doesn't exist."""
    if not os.path.exists(file_path):
        create_empty_excel()
    return pd.read_excel(file_path)

def save_to_excel(df, file_path=EXCEL_FILE):
    """
    Save DataFrame to Excel with verification.
    Ensures file is properly closed after saving.
    """
    try:
        print(f"Saving to Excel: {file_path}")
        df.to_excel(file_path, index=False)
        
        # Verify the save worked by reloading
        try:
            verification_df = pd.read_excel(file_path)
            print(f"Save verified: {file_path} - {len(verification_df)} rows saved.")
            return True
        except Exception as e:
            print(f"ERROR verifying save: {str(e)}")
            return False
    except Exception as e:
        print(f"ERROR saving to Excel: {str(e)}")
        return False

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
    save_to_excel(df)  # Save changes to Excel
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



#---------------------------------Add Comment---------------------------------#
def add_comment(df, place_name, comment):
    """
    Add a comment to a business in the Excel file.
    If a comment already exists, append the new comment with a timestamp.
    """
    place_mask = df['Name'].str.lower().str.strip() == place_name.lower().strip()

    if not place_mask.any():
        print(f"❌ No matching place found for '{place_name}'.")
        return df

    # Ensure 'Comments' column exists and is a string
    df['Comments'] = df['Comments'].astype(str).replace("nan", "").fillna("")

    # Append new comment with timestamp
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    new_comment = f"{timestamp}: {comment}"

    if df.loc[place_mask, 'Comments'].str.strip().eq("").any():
        df.loc[place_mask, 'Comments'] = new_comment
    else:
        df.loc[place_mask, 'Comments'] += " | " + new_comment

    print(f"✅ Comment added for {place_name}: {new_comment}")
    return df

#--------------------------------- GUI ---------------------------------#
def launch_gui(df):

    from tkinter import font
    style = ttk.Style()
    style.theme_use('clam')  # or try 'alt', 'default', 'vista'
    style.configure("Treeview.Heading", font=('Segoe UI', 11, 'bold'))
    style.configure("Treeview", font=('Segoe UI', 10))


    def refresh_table():
        # Clear existing rows
        for row in tree.get_children():
            tree.delete(row)

        # Insert updated data
        for _, row in df.iterrows():
            tree.insert("", "end", values=(
                row["Name"],
                row["Number"],
                row["Address"],
                row["Status"],
                row["Comments"]
            ))

    def mark_called_gui():
        selected = tree.focus()
        if not selected:
            messagebox.showwarning("No Selection", "Please select a business.")
            return
        place_name = tree.item(selected)['values'][0]
        nonlocal df
        df = mark_called(df, place_name)
        refresh_table()

    def add_comment_gui():
        selected = tree.focus()
        if not selected:
            messagebox.showwarning("No Selection", "Please select a business.")
            return
        place_name = tree.item(selected)['values'][0]
        comment = simpledialog.askstring("Add Comment", f"Add comment for {place_name}:")
        if comment:
            nonlocal df
            df = add_comment(df, place_name, comment)
            refresh_table()

    def save_changes():
        save_to_excel(df)
        messagebox.showinfo("Saved", "Changes saved to Excel.")

    # --- TK Window Setup ---
    root = tk.Tk()
    root.title("Cold Call Tracker")
    root.geometry("1000x500")

    # --- Table (Treeview) ---
    columns = ("Name", "Number", "Address", "Status", "Comments")
    tree = ttk.Treeview(root, columns=columns, show="headings")
    for col in columns:
        tree.heading(col, text=col)
        if col == "Comments":
            tree.column(col, anchor=tk.W, width=300)
        else:
            tree.column(col, anchor=tk.W, width=150)


    tree.pack(expand=True, fill=tk.BOTH)

    # --- Buttons ---
    button_frame = tk.Frame(root)
    button_frame.pack(fill=tk.X)

    def styled_btn(text, cmd):
        return tk.Button(button_frame, text=text, command=cmd, font=('Segoe UI', 10, 'bold'), bg="#2e86de", fg="white", padx=10, pady=5)

    styled_btn("Mark Called", mark_called_gui).pack(side=tk.LEFT, padx=5, pady=5)
    styled_btn("Add Comment", add_comment_gui).pack(side=tk.LEFT, padx=5, pady=5)
    styled_btn("Save", save_changes).pack(side=tk.LEFT, padx=5, pady=5)
    styled_btn("Exit", root.quit).pack(side=tk.RIGHT, padx=5, pady=5)


    refresh_table()
    root.mainloop()




#---------------------------------Main Function---------------------------------#

def main():

    speak("Welcome to the Cold Call Tracker!")

    df = load_data()
    if df is None:
        return

    print("\n📞 Welcome to the Cold Call Tracker!")
    print("✅ Type `Help` to see all available commands.")
    print("✅ Type `Exit` to quit.")

    voice_mode = False  # Voice control is OFF initially
    firstLoop = True

    while True:
        if not voice_mode:
            print("\nEnter command or type 'voice' to activate voice control : ")
            speak("Enter command or type voice to activate voice control")
            user_input = input(" ").strip().lower()

            if user_input == 'voice':
                speak("Voice control activated")
                voice_mode = True
                continue  # Restart loop to start voice input


            elif user_input == "gui":
                launch_gui(df)
                continue

        if voice_mode:
            print("\nListening for command...")
            user_input = listen_for_command()
            if user_input is None:
                continue  # Try again if speech wasn't understood

        if user_input == 'exit':
            save_to_excel(df)
            print("All changes saved. Goodbye!")
            break

        elif user_input == 'help':
            help()

        elif user_input == "list all":
            list_all(df)

        elif user_input and user_input.startswith("called "):
            place_name = user_input[7:].strip()
            df = mark_called(df, place_name)
            save_to_excel(df)

        elif user_input == "list called":
            list_by_status(df, "Called")

        elif user_input == "get all numbers":
            df = get_all_numbers(df)

        elif user_input and user_input.startswith("comment "):
            parts = user_input[8:].split(" - ")
            if len(parts) == 2:
                place_name, comment = parts[0].strip(), parts[1].strip()
                df = add_comment(df, place_name, comment)
                save_to_excel(df)
            else:
                print("❌ Use format: 'Comment BusinessName - Your Comment'")

        elif user_input == "save":
            save_to_excel(df)

        elif user_input and user_input.startswith("reset comment "):
            parts = user_input[14:].split(" - ")
            if len(parts) == 2:
                place_name, new_comment = parts[0].strip(), parts[1].strip()
                df = reset_comment(df, place_name, new_comment)
                save_to_excel(df)
            else:
                print("❌ Use format: 'Reset Comment BusinessName - New Comment'")

        elif user_input == "list dont call":
            list_by_status(df, "Don't Call")

        elif user_input and user_input.startswith("dont call "):
            place_name = user_input[len("dont call "):].strip()
            df = mark_dont_call(df, place_name)
            save_to_excel(df)

        elif user_input and user_input.startswith("callback "):
            place_name = user_input[len("callback "):].strip()
            df = mark_callback(df, place_name)
            save_to_excel(df)

        elif user_input == "list callback":
            list_callback(df)

        elif user_input and user_input.startswith("tocall "):
            place_name = user_input[len("tocall "):].strip()
            df = mark_tocall(df, place_name)
            save_to_excel(df)

        elif user_input == "list tocall":
            list_tocall(df)

        else:
            print("❌ Unrecognized command. Type `Help` to see available commands.")

def api_direct_save(df, file_path=EXCEL_FILE):
    """
    Save DataFrame to Excel directly without any comment processing.
    This is used by the API to ensure comments are not appended with timestamps.
    """
    print(f"API DIRECT SAVE to {file_path} - NO COMMENT PROCESSING")
    try:
        # Make a clean copy to avoid side effects
        save_df = df.copy()
        # Direct save with no processing
        save_df.to_excel(file_path, index=False)
        print(f"API direct save completed successfully to {file_path}")
        return True
    except Exception as e:
        print(f"ERROR in api_direct_save: {str(e)}")
        return False

def ensure_date_columns(df):
    if 'LastCalledDate' not in df.columns:
        df['LastCalledDate'] = ''
    if 'LastCallbackDate' not in df.columns:
        df['LastCallbackDate'] = ''
    return df

if __name__ == "__main__":
    main()