import pandas as pd

# Create sample data with all required columns
data = {
    'Name': ['Business A', 'Business B', 'Business C'],
    'Status': ['tocall', 'called', 'callback'],
    'Number': ['123-456-7890', '098-765-4321', '555-123-4567'],
    'Address': ['123 Main St', '456 Oak Ave', '789 Pine St'],
    'Comments': ['New business', 'Spoke with manager', 'Call back next week']
}

# Create DataFrame
df = pd.DataFrame(data)

# Save to Excel
df.to_excel('places_to_call.xlsx', index=False)
print("Excel file created successfully with all required columns!") 