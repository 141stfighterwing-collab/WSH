# WSH Change Codebase Tracking Document

**Purpose:** Track all code changes across versions for audit trail and maintenance

---

## Version 3.0.0 - Major Release (2026-03-28)

### Overview
This is a MAJOR version upgrade adding comprehensive admin features, user settings, and system management capabilities.

### Files Modified

#### 1. package.json
**Change:** Version bump from 2.5.0 to 3.0.0
```json
// OLD
"version": "2.5.0"

// NEW  
"version": "3.0.0"
```
**Reason:** Major feature release

---

#### 2. Dockerfile
**Changes:**
- Updated version label from 2.5.0 to 3.0.0
- Updated POWERSHELL_EXECUTOR_VERSION from 2.5.0 to 3.0.0

```dockerfile
// OLD
LABEL version="2.5.0"
ENV POWERSHELL_EXECUTOR_VERSION="2.5.0"

// NEW
LABEL version="3.0.0"
ENV POWERSHELL_EXECUTOR_VERSION="3.0.0"
```
**Reason:** Maintain version consistency across build artifacts

---

#### 3. scripts/start.ps1
**Changes:**
- Updated version display from v2.5.0 to v3.0.0

```powershell
# OLD
Write-Host "WSH - Weavenote Self Hosted v2.5.0"

# NEW
Write-Host "WSH - Weavenote Self Hosted v3.0.0"
```
**Reason:** Display correct version at startup

---

#### 4. src/app/page.tsx
**Changes:**

##### a) Version Display Update
```tsx
// OLD
<p className="text-2xl font-black text-red-500">v2.5.1</p>
<p className="text-3xl font-black text-purple-700 dark:text-purple-300">v2.5.1</p>

// NEW
<p className="text-2xl font-black text-red-500">v3.0.0</p>
<p className="text-3xl font-black text-purple-700 dark:text-purple-300">v3.0.0</p>
```

##### b) Version History Update
```tsx
// Added new version entry
{ version: '3.0.0', date: '2026-03-28', notes: 'MAJOR: Settings panel with gear icon, User management, Password reset, System logs, Diagnostics, ENV settings for AI (admin), Enhanced themes' },
{ version: '2.5.1', date: '2026-03-28', notes: 'Fixed Docker deployment, health checks, DB viewer with password reset' },
```

##### c) Settings Modal Sidebar - Added New Tabs
```tsx
// NEW TABS ADDED:
🎨 Themes         - All users (yellow, orange, red, green themes)
🛡️ My Security    - All users (password change)
🔍 Diagnostics    - All users (system health check)

// ADMIN ONLY TABS:
👥 User Base      - Admin only (user management)
📜 System Logs    - Admin only (audit trail)
🤖 ENV Settings   - Admin only (AI configuration)
```

**Reason:** Implement comprehensive settings management

---

#### 5. scripts/db-viewer.js
**Changes:** Added password reset functionality
```javascript
// NEW: Password reset feature
const PASSWORD_HASHES = {
    '123456': '$2a$10$...',
    'password': '$2a$10$...',
    'admin': '$2a$10$...',
    // ... more preset passwords
};

// NEW: Password change API endpoint
if (path === '/api/users/password' && req.method === 'POST') {
    // Handle password reset
}
```
**Reason:** Allow admins to reset user passwords via DB viewer

---

### New Features Added

#### 1. Settings Panel with Gear Icon (All Users)
- Location: Header, next to dark mode toggle
- Icon: ⚙️ (gear)
- Accessible by: All authenticated users

#### 2. Themes (All Users)
- Available themes:
  - default, ocean, forest, sunset, rose
  - midnight, coffee, neon, cyberpunk
  - nord, dracula, lavender, earth
  - **NEW:** yellow, orange, red, green, hyperblue

#### 3. My Security (All Users)
- Password change functionality
- Minimum 8 characters
- Secure bcrypt hashing

#### 4. Versioning Menu (Admin Only)
- Current version display
- Version history
- Patch notes

#### 5. User Base Management (Admin Only)
- View all users
- Role management (user/admin/super-admin)
- Status management (active/banned)
- Password reset trigger

#### 6. ENV Settings for AI (Admin Only)
- Environment variable management
- API key configuration
- Category-based organization
- Import/Export .env files
- **NOTE:** AI functionality not yet implemented

#### 7. System Logs (Admin Only)
- Audit trail
- User actions
- System events
- Timestamp tracking

#### 8. Diagnostics (All Users)
- Database connectivity test
- API health check
- System status indicators
- Latency measurement

---

### Database Schema Changes
None - v3.0.0 uses existing schema

---

### API Changes
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| /api/users/password | POST | Reset user password | Admin |
| /api/settings | GET | Get env variables | Admin |
| /api/settings | POST | Save env variable | Admin |
| /api/settings/:id | DELETE | Delete env variable | Admin |
| /api/settings/export | GET | Export .env file | Admin |
| /api/settings/import | POST | Import .env file | Admin |

---

### Configuration Changes
None - Uses existing configuration

---

### Breaking Changes
None - Backward compatible with v2.5.x

---

### Dependencies Added
None - Uses existing dependencies

---

### Testing Performed
1. ✅ Docker build successful
2. ✅ PostgreSQL connection working
3. ✅ User authentication working
4. ✅ Settings panel accessible
5. ✅ Admin features restricted to admin users
6. ✅ Password reset functional
7. ✅ Theme switching working
8. ✅ Version display correct

---

### Rollback Instructions
If issues occur, rollback to Version1 branch:
```bash
git checkout Version1
docker compose build --no-cache
docker compose up -d
```

---

## Version 2.5.1 - Patch Release (2026-03-28)

### Files Modified
1. `scripts/healthcheck.ps1` - Complete rewrite with proper exit codes
2. `scripts/db-viewer.js` - Added retry logic, degraded mode
3. `scripts/start.ps1` - Added error handling and retry logic
4. `installer/docker-compose.yml` - Changed to local build
5. `docker-compose.yml` - Fixed ADMIN_PASSWORD default
6. `tsconfig.json` - Added exclude patterns
7. `.dockerignore` - Fixed services exclusion

### Issues Fixed
1. Healthcheck always returning success
2. Database viewer crashes on startup
3. Startup script lacks error handling
4. GitHub Container Registry image missing
5. Admin password mismatch
6. TypeScript build failing (skills)
7. TypeScript build failing (WSH examples)
8. Services directory excluded from Docker build

---

## Version 2.5.0 - Initial Docker Release (2026-03-27)

### Initial Release
- Docker Compose setup
- PostgreSQL database
- Next.js 15.5.14 standalone
- PowerShell executor
- Prisma ORM

---

## Document Maintenance
- This document should be updated for EVERY code change
- Include: file path, old code, new code, reason
- Reference: issue tracker IDs when applicable
- Sign off: developer name and date

---

**Last Updated:** 2026-03-28
**Document Version:** 1.0
**Maintained By:** WSH Development Team
