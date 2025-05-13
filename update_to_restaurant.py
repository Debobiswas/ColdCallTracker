import requests

def update_all_businesses_to_restaurant():
    """
    Update all businesses in the database to have the Restaurant industry.
    """
    try:
        # Call the API endpoint to set all businesses to Restaurant industry
        response = requests.get("http://localhost:8001/api/businesses/set-all-to-restaurant")
        
        # Check if the request was successful
        if response.status_code == 200:
            result = response.json()
            print(f"Success: {result['message']}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    print("Updating all businesses to have Restaurant industry...")
    update_all_businesses_to_restaurant()
    print("Done!") 