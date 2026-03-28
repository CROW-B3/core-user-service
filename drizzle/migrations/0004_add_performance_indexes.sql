-- Performance indexes for user table
-- Index on organizationId for org-scoped user listing
CREATE INDEX IF NOT EXISTS idx_user_organization_id ON user(organizationId);

-- Index on email for email-based lookups
CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);

-- Index on status for status-based filtering
CREATE INDEX IF NOT EXISTS idx_user_status ON user(status);

-- Composite index for org + status (active users in an org)
CREATE INDEX IF NOT EXISTS idx_user_org_status ON user(organizationId, status);

-- Composite index for org + role (role-based user listing)
CREATE INDEX IF NOT EXISTS idx_user_org_role ON user(organizationId, role);
