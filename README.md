# Cold Call Tracker

A web application for managing and tracking cold calls to businesses.

## Security Notice

This application handles sensitive business data and API keys. Please follow these security guidelines:

1. Never commit sensitive data files (Excel, JSON) to the repository
2. Keep API keys and tokens in environment variables
3. Regularly backup your data files
4. Use HTTPS in production
5. Implement proper authentication for production use

## Setup Instructions

1. Clone the repository
2. Create a `.env` file with the following variables:
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   VAPI_TOKEN=your_vapi_token_here
   VAPI_AGENT_ID=your_vapi_agent_id_here
   VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id_here
   PORT=8000
   HOST=127.0.0.1
   ALLOWED_ORIGINS=http://localhost:3000
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Install Node.js dependencies:
   ```bash
   cd cold-call-frontend
   npm install
   ```

5. Start the backend server:
   ```bash
   python api.py
   ```

6. Start the frontend development server:
   ```bash
   cd cold-call-frontend
   npm start
   ```

## Data Management

- Business data is stored in Excel files
- **Real business data files (`places_to_call.xlsx`) are excluded from Git for privacy**
- A sample data file (`sample_places_to_call.xlsx`) with fake data is provided for demonstration
- Regular backups are recommended for your actual data files
- Use the provided backup scripts to maintain data integrity

### Setting Up Your Data File

1. Copy the sample file: `cp sample_places_to_call.xlsx places_to_call.xlsx`
2. Replace the sample data with your real business contacts
3. Your real data will be automatically excluded from Git commits

## API Documentation

The API provides endpoints for:
- Managing businesses
- Tracking callbacks
- Scheduling meetings
- Managing clients
- Google Places integration
- VAPI integration

## Development Guidelines

1. Use environment variables for configuration
2. Follow the existing code style
3. Add tests for new features
4. Document API changes
5. Keep sensitive data out of version control

## License

[MIT]

Cold Call Tracker is a tool designed to efficiently manage and track cold calls. It uses the Google Places API to fetch missing phone numbers and addresses, allowing users to categorize contacts under To Call, Called, Call Back, and Don't Call statuses. The tool also enables users to add comments, reset notes, and generate organized reports.

Features:

  1) Cold Call Management
    Automatically initializes businesses with the status "To Call" (unless another status is already assigned).
    Mark businesses as Called, Call Back, or Don't Call.

  2) Google API Integration
    Fetch missing phone numbers and addresses using Google Places API.

  3) Commenting and Notes:
    Add custom comments for businesses.
    Reset and replace existing comments.

  4) Detailed Listings
    View businesses categorized under:
      - To Call
      - Called
      - Call Back
      - Don't Call
      - Data Persistence and Export

( Stores call data in Excel (.xlsx) format for easy review and sharing.)
