# API Key Permissions Explained

## 📋 Current State

When you create an API key, here's what happens and what permissions it has:

---

## 🔑 What Happens When You Create an API Key

### Default Permissions on Creation

When you create an API key, it gets:

1. **Unique API Key Identifier**
   - Format: `ak_<random_string>` (e.g., `ak_dGhpc2lzYXBpa2V5MTIzNDU2Nzg5MA`)
   - Public identifier (can be shared)

2. **Secret Key**
   - Format: Long random string (e.g., `dGhpc2lzYXNlY3JldGtleTEyMzQ1Njc4OTA`)
   - Must be kept secret (hashed in database)
   - Only shown once at creation

3. **Default Settings:**
   - ✅ `is_active: true` (active by default)
   - ✅ `allowed_domains: []` (empty = no domain restrictions by default)
   - ✅ No expiration date
   - ✅ Can be used from any domain (if `allowed_domains` is empty)

4. **Metadata:**
   - Name (for identification)
   - Description (optional)
   - Created timestamp
   - Last used timestamp (tracks usage)

---

## 🚨 IMPORTANT: Current Implementation Status

### ⚠️ API Keys Are Created But Not Yet Integrated

**Current Situation:**
- ✅ API key creation works
- ✅ API key management works (list, update, delete, regenerate)
- ❌ **API keys are NOT yet used to authenticate endpoints**

**What This Means:**
- You can create API keys
- You can manage API keys
- **But endpoints still require JWT tokens (not API keys)**

**To Use API Keys:**
You need to modify endpoints to accept `get_api_key_auth` dependency instead of (or in addition to) `get_current_user`.

---

## 🔐 What Permissions an API Key Has (When Implemented)

### Default Permissions

When an API key is created, it has:

#### ✅ **CAN DO:**
1. **Authenticate API Requests**
   - Can be used to authenticate requests from allowed domains
   - Works like a username/password combination
   - Provides authentication, not authorization

2. **Access Public/Third-Party Endpoints** (if endpoints support API key auth)
   - Any endpoint that accepts `get_api_key_auth` dependency
   - Example: Dashboard stats, public data, integration endpoints

3. **Domain-Based Access Control**
   - Can only be used from `allowed_domains` (if specified)
   - Empty `allowed_domains` = can be used from any domain

#### ❌ **CANNOT DO:**
1. **Manage API Keys**
   - Cannot create/update/delete other API keys
   - Cannot view API key list
   - Cannot regenerate keys

2. **User Management**
   - Cannot create users
   - Cannot update users
   - Cannot manage user profiles

3. **System Administration**
   - Cannot perform admin operations
   - Cannot access superadmin-only endpoints
   - Cannot modify system settings

4. **Access User-Specific Data** (by default)
   - API keys don't have user context
   - No organization association
   - No user profile information

---

## 📝 What the API Key Can Do (Technical Details)

### Authentication Process

When using API key + secret key:

```bash
# Request with API Key
GET /api/v1/some-endpoint
X-API-Key: ak_dGhpc2lzYXBpa2V5MTIzNDU2Nzg5MA
X-API-Secret: dGhpc2lzYXNlY3JldGtleTEyMzQ1Njc4OTA
Origin: https://example.com
```

**What Happens:**
1. ✅ System verifies API key exists
2. ✅ System verifies secret key matches (hashed comparison)
3. ✅ System checks if key is active (`is_active: true`)
4. ✅ System validates domain (if `allowed_domains` specified)
5. ✅ System updates `last_used_at` timestamp
6. ✅ Request is authenticated

### What Gets Returned

When authenticated, the system returns:
```python
{
    "auth_type": "api_key",
    "api_key_id": "507f1f77bcf86cd799439011",
    "api_key_name": "Third Party Integration"
}
```

**Note:** This is NOT a user object - it's just API key metadata.

---

## 🔒 Permission Levels Explained

### Level 1: Domain Restrictions

**Empty `allowed_domains: []`:**
- ✅ Can be used from ANY domain
- ⚠️ Less secure
- 💡 Use for: Server-to-server integrations, trusted partners

**Specific domains: `["example.com", "api.example.com"]`:**
- ✅ Can ONLY be used from specified domains
- ✅ More secure
- 💡 Use for: Web applications, specific clients

### Level 2: Active Status

**`is_active: true`:**
- ✅ Key can authenticate requests
- ✅ All validations apply (domain, secret key)

**`is_active: false`:**
- ❌ Key cannot authenticate
- ❌ All requests are rejected immediately
- 💡 Use for: Temporary suspension, security incidents

### Level 3: Secret Key Verification

**Valid secret key:**
- ✅ Authentication succeeds
- ✅ Request proceeds

**Invalid secret key:**
- ❌ Authentication fails
- ❌ Request rejected with 401 error

---

## 🎯 What Endpoints CAN Be Accessed (When Implemented)

### Currently, NO endpoints use API key authentication

**To enable API key access, you need to:**

1. **Option A: Replace JWT with API Key** (for specific endpoints)
```python
# Before (JWT only)
async def get_data(current_user: dict = Depends(get_current_user)):
    ...

# After (API Key only)
async def get_data(api_key: APIKey = Depends(get_api_key_auth)):
    ...
```

2. **Option B: Support Both** (flexible authentication)
```python
# Support both JWT and API Key
async def get_data(
    jwt_user: Optional[dict] = Depends(get_current_user_optional),
    api_key: Optional[APIKey] = Depends(get_api_key_auth_optional)
):
    if jwt_user:
        # Handle JWT user
    elif api_key:
        # Handle API key
    else:
        raise AuthenticationError("Authentication required")
```

### Recommended Endpoints for API Key Access

**Good candidates for API key authentication:**

1. **Dashboard/Statistics** (Read-only)
   - `/api/v1/stats` - Dashboard statistics
   - `/api/v1/detailed-counts` - Detailed counts
   - `/api/v1/dropdown-data` - Dropdown data

2. **Public Data** (Read-only)
   - Public patient data (if applicable)
   - Public reports
   - Public organization info

3. **Integration Endpoints**
   - Webhook endpoints
   - Third-party sync endpoints
   - External system integration

**NOT recommended for API keys:**
- User management endpoints
- API key management endpoints
- Admin-only endpoints
- Sensitive data endpoints (without additional authorization)

---

## 🔄 Comparison: JWT vs API Key

| Feature | JWT Token | API Key |
|---------|-----------|---------|
| **Authentication** | ✅ User login | ✅ Key + Secret |
| **User Context** | ✅ Has user ID, profile, org | ❌ No user context |
| **Expiration** | ✅ Expires after set time | ❌ No expiration (unless deactivated) |
| **Domain Restrictions** | ❌ No | ✅ Yes (configurable) |
| **Revocation** | ✅ Token blacklist | ✅ Set `is_active: false` |
| **Use Case** | User sessions | Third-party integrations |
| **Permissions** | Based on user type | Based on endpoint design |

---

## 💡 Example: What an API Key CAN Do

### Scenario: Dashboard Integration

**Setup:**
```json
{
  "name": "Partner Dashboard",
  "allowed_domains": ["partner.com", "dashboard.partner.com"]
}
```

**What They Can Do:**
```bash
# Access dashboard stats (if endpoint supports API keys)
GET /api/v1/stats
X-API-Key: ak_xxxxx
X-API-Secret: secret_xxxxx
Origin: https://dashboard.partner.com

# ✅ Allowed if:
# - Key is active
# - Secret matches
# - Domain is in allowed_domains
```

**What They CANNOT Do:**
```bash
# Manage API keys
GET /api/v1/accounts/api-keys
# ❌ Requires JWT admin token, not API key

# Create users
POST /api/v1/accounts/users
# ❌ Requires JWT admin token, not API key

# Access user-specific data
GET /api/v1/accounts/users/me
# ❌ Requires JWT token (has user context)
```

---

## 🛠️ Implementation Status

### ✅ What's Working

1. **API Key Creation** ✅
   - Create keys with name, description, domains
   - Generate secure keys
   - Store hashed secrets

2. **API Key Management** ✅
   - List keys (admin only)
   - Update keys (admin only)
   - Delete keys (admin only)
   - Regenerate secrets (admin only)

3. **Authentication Logic** ✅
   - Verify API key + secret key
   - Validate domains
   - Check active status
   - Update last used timestamp

### ❌ What's NOT Working Yet

1. **Endpoint Integration** ❌
   - Endpoints don't use `get_api_key_auth`
   - All endpoints require JWT tokens
   - API keys can't authenticate any endpoints yet

2. **Permission System** ❌
   - No granular permissions/scopes
   - No endpoint-level restrictions
   - All keys have same permissions (none currently)

---

## 📋 Summary

### When You Create an API Key:

**Default Permissions:**
- ✅ Active (`is_active: true`)
- ✅ No domain restrictions (`allowed_domains: []`)
- ✅ Can authenticate (when endpoints support it)
- ❌ Cannot manage other API keys
- ❌ Cannot perform admin operations
- ❌ Has no user context

**What It Can Do:**
- Authenticate requests (when endpoints are configured)
- Access endpoints that accept API key auth (none currently)
- Track usage (`last_used_at` updated on each use)

**What It Cannot Do:**
- Access endpoints that require JWT tokens
- Manage API keys (admin-only)
- Access user-specific data
- Perform admin operations

### Next Steps to Enable API Key Usage:

1. **Modify endpoints** to accept API key authentication
2. **Add permission/scopes system** (optional, for granular control)
3. **Document which endpoints** support API keys
4. **Test API key authentication** on selected endpoints

---

## ❓ FAQ

### Q: Can API keys access all endpoints?
**A:** No, currently API keys cannot access any endpoints. Endpoints need to be modified to accept API key authentication.

### Q: Do API keys have user permissions?
**A:** No, API keys don't have user context. They're for third-party integrations, not user sessions.

### Q: Can I restrict what endpoints an API key can access?
**A:** Currently no, but you can:
- Use domain restrictions
- Only enable API key auth on specific endpoints
- Add a permissions/scopes system (future enhancement)

### Q: What's the difference between JWT and API key?
**A:** 
- JWT = User session (has user context, expires)
- API Key = Service integration (no user context, no expiration)

### Q: Can API keys create other API keys?
**A:** No, API key management requires admin JWT tokens only.

---

Would you like me to:
1. **Show you how to modify endpoints** to accept API key authentication?
2. **Implement a permissions/scopes system** for API keys?
3. **Create example endpoints** that use API key authentication?

