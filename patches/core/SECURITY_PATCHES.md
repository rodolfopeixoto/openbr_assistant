# Security Hardening Patches

This document describes the security patches applied to OpenClaw core.

## Overview

These patches remove dangerous configuration options and enforce secure defaults.

## Patches Applied

### 1. Remove `dangerouslyDisableDeviceAuth`

**Risk Level:** CRITICAL
**CVSS Score:** 9.8

This option allows complete bypass of device authentication, enabling:
- Unauthorized access to user data
- Session hijacking
- Credential theft

**Action Taken:**
- Removed from configuration schema
- Removed from authentication flow
- Added validation to prevent usage

**Files Modified:**
- `src/config/schema.ts` - Remove option from schema
- `src/auth/device.ts` - Remove bypass logic
- `src/middleware/auth.ts` - Enforce device auth

### 2. Remove `allowInsecureAuth`

**Risk Level:** HIGH
**CVSS Score:** 7.5

This option allows HTTP transmission of authentication tokens:
- Tokens sent in plaintext
- Vulnerable to man-in-the-middle attacks
- Network sniffing exposure

**Action Taken:**
- Removed from configuration
- Enforced HTTPS for all auth endpoints
- Added TLS version check (minimum 1.2)

**Files Modified:**
- `src/config/schema.ts` - Remove option
- `src/auth/token.ts` - Enforce HTTPS
- `src/server/index.ts` - Redirect HTTP to HTTPS

### 3. Secure Defaults

**Configuration Changes:**

```json
{
  "security": {
    "requireDeviceAuth": true,
    "requireSecureConnection": true,
    "enforceTls": true,
    "minTlsVersion": "1.2",
    "secureHeaders": true,
    "disableInsecureOptions": true
  },
  "logging": {
    "sensitiveDataRedaction": true,
    "auditAllAccess": true
  },
  "sessions": {
    "secureCookies": true,
    "httpOnly": true,
    "sameSite": "strict",
    "maxAge": 3600000
  }
}
```

## Breaking Changes

⚠️ **WARNING:** These patches introduce breaking changes:

1. **Device authentication is now mandatory**
   - Existing sessions will need re-authentication
   - CLI tools must use secure device pairing

2. **HTTP is no longer supported**
   - All traffic must use HTTPS
   - Development environments need self-signed certs

3. **Legacy configuration options removed**
   - Configs using removed options will fail to load
   - Migration guide provided below

## Migration Guide

### Before (Insecure):
```json
{
  "dangerouslyDisableDeviceAuth": true,
  "allowInsecureAuth": true
}
```

### After (Secure):
```json
{
  "security": {
    "requireDeviceAuth": true,
    "requireSecureConnection": true
  }
}
```

## Testing

After applying patches, verify:

1. **Authentication Required:**
   ```bash
   curl http://localhost:3000/api/protected
   # Should return 401 Unauthorized
   ```

2. **HTTPS Enforced:**
   ```bash
   curl -I http://localhost:3000/
   # Should redirect to HTTPS
   ```

3. **No Insecure Options:**
   ```bash
   grep -r "dangerouslyDisableDeviceAuth\|allowInsecureAuth" src/
   # Should return no results
   ```

## Rollback

If issues occur, restore from backups:

```bash
# Restore original files
for file in patches/core/backups/*.bak; do
    original="${file%.bak}"
    cp "$file" "$original"
done

# Restart application
npm restart
```

## Compliance

These patches address:
- **OWASP Top 10:** A01:2021 – Broken Access Control
- **OWASP Top 10:** A02:2021 – Cryptographic Failures
- **SOC2 CC6.1:** Logical access security
- **SOC2 CC6.6:** Encryption during transmission
- **HIPAA:** 164.312(e)(1) - Transmission security

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

---

**Applied:** 2026-02-15  
**Version:** 1.0.0  
**Patches:** 3 security hardening patches
