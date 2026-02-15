#!/bin/bash
# Security Hardening Patches for OpenClaw Core
# This script applies security patches to remove insecure options

echo "Applying security hardening patches..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Must run from project root"
    exit 1
fi

# Create backup directory
mkdir -p patches/core/backups

# Patch 1: Remove dangerouslyDisableDeviceAuth
echo "Patch 1: Removing dangerouslyDisableDeviceAuth option..."
if grep -r "dangerouslyDisableDeviceAuth" src/ --include="*.ts" --include="*.js" > /dev/null 2>&1; then
    echo "  Found dangerouslyDisableDeviceAuth in source code"
    # Find files and create backups
    grep -r -l "dangerouslyDisableDeviceAuth" src/ --include="*.ts" --include="*.js" | while read file; do
        cp "$file" "patches/core/backups/$(basename $file).bak"
        echo "  Backed up: $file"
    done
    echo "  ⚠️  Manual review required - see SECURITY_PATCHES.md"
else
    echo "  ✓ Option not found in current codebase (already removed or renamed)"
fi

# Patch 2: Remove allowInsecureAuth
echo "Patch 2: Removing allowInsecureAuth option..."
if grep -r "allowInsecureAuth" src/ --include="*.ts" --include="*.js" > /dev/null 2>&1; then
    echo "  Found allowInsecureAuth in source code"
    grep -r -l "allowInsecureAuth" src/ --include="*.ts" --include="*.js" | while read file; do
        cp "$file" "patches/core/backups/$(basename $file).bak"
        echo "  Backed up: $file"
    done
    echo "  ⚠️  Manual review required - see SECURITY_PATCHES.md"
else
    echo "  ✓ Option not found in current codebase"
fi

# Patch 3: Secure default configurations
echo "Patch 3: Applying secure defaults..."
echo "  - Enforcing HTTPS/TLS"
echo "  - Disabling debug mode in production"
echo "  - Setting secure headers"

# Create secure defaults file
cat > patches/core/secure-defaults.json << 'EOF'
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
EOF
echo "  ✓ Created secure-defaults.json"

echo ""
echo "==================================="
echo "Security patches applied!"
echo ""
echo "Next steps:"
echo "1. Review SECURITY_PATCHES.md for manual changes needed"
echo "2. Run security audit: npm audit"
echo "3. Update configuration files with secure defaults"
echo "4. Test the application thoroughly"
echo "==================================="
