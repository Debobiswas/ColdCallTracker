# JSON Upload Guide

## Overview
The JSON upload feature allows users to upload Google Places business data directly to their ColdCall Tracker account. The system processes the JSON data and converts it into business listings for cold calling.

## How It Works

### 1. Upload Process
1. **Click "Upload JSON"** - Text link at the bottom of the sidebar
2. **Select JSON File** - Choose your Google Places JSON file
3. **Configure Settings** (Optional) - Set region, industry, and minimum reviews
4. **Automatic Processing** - System converts and uploads all businesses

### 2. Region & Industry Settings (Optional)
- **Region**: If specified, ALL businesses will be assigned this region/city (overrides JSON data)
- **Industry**: If specified, ALL businesses will be assigned this industry (overrides JSON data)
- **Minimum Reviews**: Filters out businesses with fewer than the specified number of reviews

### 3. Setting Behavior
- **Empty Fields**: Uses data from the JSON file (city, industry, category, etc.)
- **Filled Fields**: Overrides ALL businesses with the specified values
- **Example**: Setting region to "Montreal" will assign "Montreal" to all businesses regardless of their original location data

## Supported JSON Structure

The system supports Google Places JSON data with the following fields:

```json
{
  "name": "Business Name",
  "address": "Full Address",
  "phone": "+1234567890",
  "website": "https://example.com",
  "email": "contact@example.com",
  "rating": 4.5,
  "reviews_count": 150,
  "category": "Restaurant",
  "city": "New York",
  "state": "NY",
  "zip": "10001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "hours": "Mon-Fri 9AM-5PM",
  "description": "Business description"
}
```

## Data Mapping

The system intelligently maps JSON fields to database columns:

| Database Field | JSON Sources (in order of priority) |
|---------------|--------------------------------------|
| name | name, business_name, title, place_name |
| phone | phone, phone_number, contact_phone, phoneUnformatted |
| address | address, full_address, location, formatted_address |
| region | region (if set), city, location |
| industry | industry (if set), category, categoryName, business_type, types[0] |
| hours | hours, openingHours, opening_hours, business_hours |
| comments | description, about, summary |

## Features

### High-Speed Bulk Processing
- **Server-Side Processing**: Handles thousands of businesses in seconds
- **Bulk Database Operations**: Single transaction for maximum efficiency
- **Automatic Deduplication**: Removes duplicate businesses based on phone numbers
- **Progress Tracking**: Real-time upload status with detailed statistics

### Smart Data Handling
- **Flexible Field Mapping**: Automatically maps various JSON field names
- **Data Validation**: Ensures phone numbers and other fields are properly formatted
- **Fallback Values**: Uses alternative fields when primary fields are missing
- **User Privacy**: All data is private to the authenticated user

### Upload Statistics
After upload completion, you'll see:
- **Original businesses**: Total count in JSON file
- **Filtered businesses**: After applying minimum reviews filter
- **Businesses processed**: Successfully processed by server
- **Unique businesses**: After deduplication
- **New businesses added**: Actually inserted into database

## Error Handling

The system provides detailed error messages for common issues:

- **Authentication Errors**: Must be logged in to upload
- **File Format Errors**: Invalid JSON structure
- **Data Validation Errors**: Missing required fields
- **Server Errors**: Database or processing issues

## Best Practices

1. **Data Quality**: Ensure your JSON contains clean, properly formatted data
2. **File Size**: Large files (10,000+ businesses) may take a few seconds to process
3. **Duplicates**: The system automatically removes duplicates, but clean data is preferred
4. **Region/Industry**: Use these settings to standardize your data across uploads
5. **Reviews Filter**: Use minimum reviews to focus on established businesses

## Technical Details

### API Endpoint
- **URL**: `/api/businesses`
- **Method**: POST
- **Authentication**: Bearer token required
- **Content-Type**: application/json

### Processing Flow
1. File selection triggers options modal
2. User configures optional settings
3. JSON data is processed in browser
4. Bulk API call with all businesses
5. Server-side deduplication and insertion
6. Real-time progress updates

### Performance
- **Speed**: Processes 1000+ businesses in under 10 seconds
- **Memory**: Efficient streaming for large files
- **Reliability**: Transactional operations with rollback on errors

## Troubleshooting

### Common Issues

1. **"Must be logged in" Error**
   - Ensure you're authenticated in the application
   - Refresh the page and try again

2. **"Invalid JSON" Error**
   - Verify your file is valid JSON format
   - Check for syntax errors in the file

3. **"No businesses found" Error**
   - Ensure your JSON contains an array of business objects
   - Check that business objects have required fields

4. **Upload Timeout**
   - Large files may take time to process
   - Wait for the process to complete
   - Check your internet connection

### Support
For additional help, check the console logs in your browser's developer tools for detailed error messages. 