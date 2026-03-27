-- ==============================================================================
-- WSH Database Initialization Script
-- ==============================================================================
-- This script creates the initial database structure and default data
-- It runs automatically when the PostgreSQL container starts for the first time
-- ==============================================================================

-- Set timezone to UTC
SET TIME ZONE 'UTC';

-- ==============================================================================
-- Extensions
-- ==============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- Grant Permissions
-- ==============================================================================

-- Grant database permissions
GRANT ALL PRIVILEGES ON DATABASE wsh_db TO wsh;

-- Grant schema permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO wsh;
GRANT USAGE ON SCHEMA public TO wsh;

-- ==============================================================================
-- Core Tables
-- ==============================================================================
-- Note: Most tables are created automatically by Prisma migrations
-- Below are supplementary tables for system functionality

-- Audit Log Table
-- Tracks all system changes for security and debugging
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- System Configuration Table
-- Stores application-wide settings
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for system config
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

-- ==============================================================================
-- Default System Configuration
-- ==============================================================================

INSERT INTO system_config (key, value, description) VALUES
    ('app_version', '"1.0.0"', 'Application version'),
    ('installed_at', '"' || NOW()::TEXT || '"', 'Installation timestamp'),
    ('default_theme', '"dark"', 'Default UI theme'),
    ('max_upload_size', '10485760', 'Maximum file upload size in bytes (10MB)')
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- Grant Table Permissions
-- ==============================================================================

-- Grant permissions on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wsh;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wsh;

-- Grant permissions on all sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO wsh;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO wsh;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO wsh;

-- ==============================================================================
-- Audit Entry for Initialization
-- ==============================================================================

INSERT INTO audit_logs (action, entity_type, new_values)
VALUES (
    'SYSTEM_INIT',
    'database',
    jsonb_build_object(
        'initialized_at', NOW(),
        'version', '1.0.0',
        'extensions', array['uuid-ossp', 'pgcrypto']
    )
);

-- ==============================================================================
-- Optional: Create Read-Only User (Production Use)
-- ==============================================================================
-- Uncomment and customize for production deployments
-- This creates a restricted user for reporting/monitoring

-- CREATE USER wsh_readonly WITH PASSWORD 'your_readonly_password';
-- GRANT CONNECT ON DATABASE wsh_db TO wsh_readonly;
-- GRANT USAGE ON SCHEMA public TO wsh_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO wsh_readonly;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO wsh_readonly;

-- ==============================================================================
-- Optional: Connection Pooling Configuration
-- ==============================================================================
-- For production, consider configuring PgBouncer or similar

-- ==============================================================================
-- Initialization Complete
-- ==============================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'WSH Database initialization completed successfully';
END $$;
