-- ========================================
-- SAFE COLD CALL TRACKER DATABASE SETUP
-- ========================================
-- This script can be run multiple times safely
-- It handles existing tables, columns, and constraints

-- ========================================
-- 1. CREATE TABLES
-- ========================================

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'tocall',
    comments TEXT,
    hours TEXT,
    industry TEXT DEFAULT 'Restaurant',
    region TEXT,
    callback_count INTEGER DEFAULT 0,
    lead_score INTEGER DEFAULT 5,
    last_called_date TIMESTAMP,
    last_callback_date TIMESTAMP,
    callback_due_date DATE,
    callback_due_time TIME,
    callback_reason TEXT,
    callback_priority TEXT DEFAULT 'Medium',
    interest_level TEXT DEFAULT 'Unknown',
    best_time_to_call TEXT,
    decision_maker TEXT,
    next_action TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    business_id INTEGER,
    business_name TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    business_id INTEGER,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    status TEXT DEFAULT 'prospect',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 2. ADD COLUMNS (IF NOT EXISTS)
-- ========================================

-- Add user_id columns if they don't exist
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add timestamp columns if they don't exist
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ========================================
-- 3. ADD FOREIGN KEY CONSTRAINTS
-- ========================================

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Businesses table constraints
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'businesses_user_id_fkey'
    ) THEN
        ALTER TABLE businesses ADD CONSTRAINT businesses_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Meetings table constraints
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'meetings_user_id_fkey'
    ) THEN
        ALTER TABLE meetings ADD CONSTRAINT meetings_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'meetings_business_id_fkey'
    ) THEN
        ALTER TABLE meetings ADD CONSTRAINT meetings_business_id_fkey 
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
    
    -- Clients table constraints
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clients_user_id_fkey'
    ) THEN
        ALTER TABLE clients ADD CONSTRAINT clients_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clients_business_id_fkey'
    ) THEN
        ALTER TABLE clients ADD CONSTRAINT clients_business_id_fkey 
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ========================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. CREATE/REPLACE RLS POLICIES
-- ========================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can insert their own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can update their own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can delete their own businesses" ON businesses;

DROP POLICY IF EXISTS "Users can view their own meetings" ON meetings;
DROP POLICY IF EXISTS "Users can insert their own meetings" ON meetings;
DROP POLICY IF EXISTS "Users can update their own meetings" ON meetings;
DROP POLICY IF EXISTS "Users can delete their own meetings" ON meetings;

DROP POLICY IF EXISTS "Users can view their own clients" ON clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON clients;

-- Create new policies
-- Businesses policies
CREATE POLICY "Users can view their own businesses" ON businesses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own businesses" ON businesses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own businesses" ON businesses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own businesses" ON businesses
    FOR DELETE USING (auth.uid() = user_id);

-- Meetings policies
CREATE POLICY "Users can view their own meetings" ON meetings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meetings" ON meetings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meetings" ON meetings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meetings" ON meetings
    FOR DELETE USING (auth.uid() = user_id);

-- Clients policies
CREATE POLICY "Users can view their own clients" ON clients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients" ON clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" ON clients
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" ON clients
    FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 6. CREATE/REPLACE INDEXES
-- ========================================

-- Drop existing indexes first
DROP INDEX IF EXISTS idx_businesses_user_id;
DROP INDEX IF EXISTS idx_businesses_status;
DROP INDEX IF EXISTS idx_businesses_callback_due_date;
DROP INDEX IF EXISTS idx_meetings_user_id;
DROP INDEX IF EXISTS idx_meetings_business_id;
DROP INDEX IF EXISTS idx_clients_user_id;
DROP INDEX IF EXISTS idx_clients_business_id;

-- Create new indexes
CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_callback_due_date ON businesses(callback_due_date);
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_business_id ON meetings(business_id);
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_business_id ON clients(business_id);

-- ========================================
-- 7. CREATE/REPLACE TRIGGER FUNCTION
-- ========================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ========================================
-- 8. CREATE/REPLACE TRIGGERS
-- ========================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
DROP TRIGGER IF EXISTS update_meetings_updated_at ON meetings;
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;

-- Create new triggers
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 9. COMPLETION MESSAGE
-- ========================================

-- This will show up in the SQL editor output
SELECT 'Database setup completed successfully! 🎉' AS status; 