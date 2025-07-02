# Cold Call Tracker

A comprehensive solution for managing cold calls, tracking callbacks, and maintaining client relationships.

## Security Notice

This application handles sensitive business data and API keys. Please follow these security guidelines:

1. Never commit sensitive data files (Excel, JSON) to the repository
2. Keep API keys and tokens in environment variables
3. Regularly backup your data files
4. Use HTTPS in production
5. Implement proper authentication for production use

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/Debobiswas/ColdCallTracker.git
   cd ColdCallTracker
   ```

2. Set up Supabase:
   - Create a new project at [Supabase](https://supabase.com)
   - Create the following tables in your Supabase database:
     - `businesses`: For storing business contact information and status
     - `meetings`: For tracking scheduled meetings
     - `clients`: For managing converted clients
     - `callbacks`: For managing callback schedules
   - Copy your project URL and API keys from the Supabase dashboard

3. Create a `.env` file with the following variables:
   ```
   PORT=3002
   HOST=127.0.0.1
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_service_role_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GOOGLE_API_KEY=your_google_api_key
   VAPI_TOKEN=your_vapi_token
   VAPI_AGENT_ID=your_vapi_agent_id
   VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id
   ```

4. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Install frontend dependencies:
   ```bash
   cd cold-call-frontend
   npm install
   ```

6. Migrate Excel data to Supabase (if you have existing data):
   ```bash
   python backend/migrate_excel_to_supabase.py
   ```

7. Start the servers:
   - Backend API (Port 3002):
     ```bash
     python -m uvicorn api:app --reload --port 3002 --host 0.0.0.0
     ```
   - Phone Server (Port 3003):
     ```bash
     node phone-server.js
     ```
   - Frontend (Port 3004):
     ```bash
     cd cold-call-frontend
     npm run dev
     ```

## Features

- Real-time business contact management
- Callback scheduling and tracking
- Meeting management
- Client relationship tracking
- Google Maps integration
- Phone system integration
- Modern, responsive UI

## Database Schema

### Businesses Table
- id (uuid, primary key)
- name (text, required)
- phone (text, required)
- address (text, required)
- website (text)
- status (text, default: 'new')
- comments (text)
- google_maps_url (text)
- region (text)
- hours (text)
- industry (text)
- callback_due_date (date)
- callback_due_time (time)
- callback_reason (text)
- callback_priority (text)
- callback_count (integer)
- lead_score (float)
- interest_level (text)
- best_time_to_call (text)
- decision_maker (text)
- next_action (text)
- created_at (timestamp)
- updated_at (timestamp)

### Meetings Table
- id (uuid, primary key)
- business_name (text, required)
- date (date, required)
- time (time, required)
- notes (text)
- status (text, default: 'scheduled')
- created_at (timestamp)
- updated_at (timestamp)

### Clients Table
- id (uuid, primary key)
- name (text, required)
- address (text, required)
- phone (text, required)
- website (text)
- price (text)
- subscription (text)
- date (date)
- created_at (timestamp)
- updated_at (timestamp)

## API Documentation

The API documentation is available at http://localhost:3002/docs when the backend server is running.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

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
