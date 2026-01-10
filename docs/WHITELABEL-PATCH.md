# HiveCFM White-Label Patch Documentation

## Overview

This document describes all the white-labeling changes made to transform Formbricks into HiveCFM. These changes ensure the product appears as "HiveCFM" throughout the user interface while maintaining full functionality.

## Changes Summary

### 1. NPM Package Scope Rename

**Scope Change**: `@formbricks/*` → `@hivecfm/*`

Files modified:
- All 17 `package.json` files in the monorepo
- `turbo.json` - build task references
- All TypeScript/JavaScript import statements (1074+ files)
- All `tsconfig.json` files
- `.changeset/config.json`

### 2. UI Branding Assets

**Logo Updates**:
- `apps/web/modules/ui/components/logo/index.tsx` - Main logo component (HiveCFM with hexagon icon)
- `apps/web/modules/ui/components/formbricks-logo/index.tsx` - Alternative logo component
- `apps/web/public/hivecfm-logo.svg` - New SVG logo file

**Favicon Updates**:
- `apps/web/public/favicon/site.webmanifest` - Updated name to "HiveCFM"
- `apps/web/public/favicon/safari-pinned-tab.svg` - New hexagon icon

**Note**: PNG favicons (favicon-16x16.png, favicon-32x32.png, etc.) should be replaced with proper HiveCFM brand assets when available.

### 3. Product Name in UI

**Metadata**:
- `apps/web/app/layout.tsx` - Page title template: "HiveCFM"
- All locale files (`apps/web/locales/*.json`) - "Formbricks" → "HiveCFM"
- Email references updated: `hola@formbricks.com` → `support@hivecfm.xcai.io`

**Constants** (`apps/web/lib/constants.ts`):
- `DEFAULT_BRAND_COLOR`: Changed to `#3B82F6` (HiveCFM blue)
- `FB_LOGO_URL`: Points to `hivecfm-logo.svg`
- `DOCS_URL`: Configurable via environment variable (defaults to formbricks.com/docs)
- `HIVECFM_SUPPORT_EMAIL`: `support@hivecfm.xcai.io`
- `UPGRADE_URL`: Set to `#` (enterprise always enabled)
- `SAML_TENANT`: `hivecfm.com`
- `SAML_PRODUCT`: `hivecfm`
- `SAML_AUDIENCE`: `https://saml.hivecfm.com`
- `STRIPE_PROJECT_NAMES`: "HiveCFM Startup", "HiveCFM Custom"

**Form Wrapper**:
- `apps/web/modules/auth/components/form-wrapper.tsx` - Removed external Formbricks link

### 4. API Configuration

**OpenAPI Document** (`apps/web/modules/api/v2/openapi-document.ts`):
- API title: "HiveCFM API"
- API description: "Manage HiveCFM resources programmatically."
- Server URL: "/api/v2" (relative, not hardcoded to formbricks.com)
- Authentication description updated

### 5. Enterprise License

**License Bypass** (`apps/web/modules/ee/license-check/lib/license.ts`):
- All enterprise features enabled by default
- `getEnterpriseLicense()` always returns active license
- No external license validation required

Enabled features:
- Multi-Organization
- Unlimited Projects
- Two-Factor Auth
- SSO
- SAML
- White-label
- Remove Branding
- Contacts
- AI Features
- Spam Protection
- Audit Logs
- Multi-Language Surveys
- Access Control
- Quotas

### 6. Documentation

- **README.md**: Updated with HiveCFM branding and simplified setup instructions
- **CONTRIBUTING.md**: Already contains HiveCFM-specific guidelines

## Build Verification

All changes have been verified to compile and build successfully:
- `pnpm install` - Package installation succeeds
- `pnpm build` - Full build completes (excluding pre-existing Storybook issue)

## Environment Variable Configuration

The following environment variables can be used to customize external URLs:

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCS_URL` | `https://formbricks.com/docs` | Documentation URL (override when HiveCFM has its own docs) |

## External Documentation Links

Documentation links (formbricks.com/docs/*) remain in the codebase as they point to valid, useful documentation. These can be:
1. Overridden by setting the `DOCS_URL` environment variable
2. Updated to HiveCFM documentation when available
3. Left as-is since Formbricks documentation is applicable to HiveCFM

## Outstanding Items (Non-blocking)

1. **PNG Favicon Assets**: Replace with proper HiveCFM brand assets when available:
   - `favicon.ico`
   - `favicon-16x16.png`
   - `favicon-32x32.png`
   - `android-chrome-*.png`
   - `apple-touch-icon.png`
   - `mstile-*.png`

2. **Open Graph Images**: Create HiveCFM-branded OG images for social sharing

3. **Internal Variable Names**: Some internal variables retain `formbricks` naming (e.g., `IS_FORMBRICKS_CLOUD`). This is intentional for code compatibility and does not affect user-facing UI.

## Color Scheme

HiveCFM uses a blue-purple gradient theme:
- Primary: `#3B82F6` (Blue-500)
- Secondary: `#6366F1` (Indigo-500)
- Accent: `#8B5CF6` (Violet-500)

## Maintenance

When merging upstream Formbricks updates:
1. Re-apply package scope changes using sed/find-replace
2. Check for new branding references in UI components
3. Verify the enterprise license bypass remains intact
4. Run full build to confirm compatibility

## Files Created/Modified

**Created:**
- `/docs/branding-audit.md` - Initial branding audit
- `/docs/WHITELABEL-PATCH.md` - This documentation
- `/apps/web/public/hivecfm-logo.svg` - Logo SVG
- `/.env` - Development environment configuration

**Modified:**
- All 17 `package.json` files
- `turbo.json`
- 1074+ TypeScript/JavaScript files
- 13 locale files
- `apps/web/lib/constants.ts`
- `apps/web/lib/env.ts`
- `apps/web/app/layout.tsx`
- Logo and favicon components
