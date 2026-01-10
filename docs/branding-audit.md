# HiveCFM Branding Audit

**Generated:** 2026-01-10
**Purpose:** Document all Formbricks branding touchpoints for white-label replacement

## Summary

| Category | Count | Priority |
|----------|-------|----------|
| Package names (@formbricks/*) | 17 packages | HIGH |
| turbo.json references | ~50 references | HIGH |
| formbricks.com URLs | 177 files | MEDIUM |
| UI text "Formbricks" | ~200+ occurrences | MEDIUM |
| Logo/favicon assets | 5 files | HIGH |

## Package Dependency Order (for safe renaming)

The packages MUST be renamed in this order to avoid breaking dependencies:

```
1. @formbricks/config-typescript → @hivecfm/config-typescript (no deps)
2. @formbricks/config-eslint     → @hivecfm/config-eslint (depends on 1)
3. @formbricks/config-prettier   → @hivecfm/config-prettier (no deps)
4. @formbricks/logger            → @hivecfm/logger (depends on 1, 2)
5. @formbricks/database          → @hivecfm/database (depends on 4, 1, 2)
6. @formbricks/types             → @hivecfm/types (depends on 5, 1)
7. @formbricks/cache             → @hivecfm/cache (depends on 4)
8. @formbricks/storage           → @hivecfm/storage (depends on 4)
9. @formbricks/i18n-utils        → @hivecfm/i18n-utils (depends on 1)
10. @formbricks/email            → @hivecfm/email (depends on 5, 6)
11. @formbricks/vite-plugins     → @hivecfm/vite-plugins
12. @formbricks/survey-ui        → @hivecfm/survey-ui
13. @formbricks/surveys          → @hivecfm/surveys
14. @formbricks/js-core          → @hivecfm/js-core
15. @formbricks/ui               → @hivecfm/ui
16. @formbricks/web              → @hivecfm/web (depends on all)
17. @formbricks/storybook        → @hivecfm/storybook
```

## Package.json Files (17 files)

| File | Current Name | Target Name |
|------|--------------|-------------|
| `/package.json` | formbricks | hivecfm |
| `/packages/config-typescript/package.json` | @formbricks/config-typescript | @hivecfm/config-typescript |
| `/packages/config-eslint/package.json` | @formbricks/eslint-config | @hivecfm/eslint-config |
| `/packages/config-prettier/package.json` | @formbricks/config-prettier | @hivecfm/config-prettier |
| `/packages/logger/package.json` | @formbricks/logger | @hivecfm/logger |
| `/packages/database/package.json` | @formbricks/database | @hivecfm/database |
| `/packages/types/package.json` | @formbricks/types | @hivecfm/types |
| `/packages/cache/package.json` | @formbricks/cache | @hivecfm/cache |
| `/packages/storage/package.json` | @formbricks/storage | @hivecfm/storage |
| `/packages/i18n-utils/package.json` | @formbricks/i18n-utils | @hivecfm/i18n-utils |
| `/packages/email/package.json` | @formbricks/email | @hivecfm/email |
| `/packages/vite-plugins/package.json` | @formbricks/vite-plugins | @hivecfm/vite-plugins |
| `/packages/survey-ui/package.json` | @formbricks/survey-ui | @hivecfm/survey-ui |
| `/packages/surveys/package.json` | @formbricks/surveys | @hivecfm/surveys |
| `/packages/js-core/package.json` | @formbricks/js-core | @hivecfm/js-core |
| `/apps/web/package.json` | @formbricks/web | @hivecfm/web |
| `/apps/storybook/package.json` | @formbricks/storybook | @hivecfm/storybook |

## turbo.json References

All `@formbricks/*#task` patterns in turbo.json need updating to `@hivecfm/*#task`:
- @formbricks/cache#build, #go, #lint, #test, #test:coverage
- @formbricks/database#build, #lint, #setup, #db:setup
- @formbricks/i18n-utils#build, #lint, #test
- @formbricks/js-core#build, #go, #lint
- @formbricks/react-native#build, #go
- @formbricks/storage#build, #go, #lint, #test, #test:coverage
- @formbricks/survey-ui#build, #build:dev, #go
- @formbricks/surveys#build, #build:dev, #go, #test, #test:coverage
- @formbricks/ui#build, #build:dev, #go
- @formbricks/web#go, #test, #test:coverage
- storybook#storybook (@formbricks/logger#build)

## Asset Files

### Favicon Files
| File | Action |
|------|--------|
| `/apps/web/public/favicon.ico` | Replace with HiveCFM favicon |
| `/apps/web/public/favicon/favicon-16x16.png` | Replace with HiveCFM 16x16 |
| `/apps/web/public/favicon/favicon-32x32.png` | Replace with HiveCFM 32x32 |
| `/docs/images/favicon.svg` | Replace with HiveCFM SVG |

### Logo Files
| File | Action |
|------|--------|
| `/apps/web/public/logo-transparent.png` | Replace with HiveCFM logo |
| `/apps/web/modules/survey/link/lib/footerlogo.svg` | Replace with HiveCFM footer logo |
| `/docs/images/logo-dark.svg` | Replace with HiveCFM dark logo |
| `/docs/images/logo-light.svg` | Replace with HiveCFM light logo |

## URL References (177 files)

### Pattern: formbricks.com
Files containing URLs like `api.formbricks.com`, `formbricks.com`, etc.

**Key files to update:**
- `/apps/web/.env.example` - API URLs
- `/packages/js-core/` - SDK API endpoints
- `/packages/email/` - Email template links
- All test mocks with hardcoded URLs

**Target replacements:**
- `formbricks.com` → `hivecfm.xcai.io`
- `api.formbricks.com` → `api.hivecfm.xcai.io`
- `app.formbricks.com` → `app.hivecfm.xcai.io`

## Environment Variables

| Current Variable | Status |
|-----------------|--------|
| `IS_FORMBRICKS_CLOUD` | Keep as-is (internal flag) |
| `NEXT_PUBLIC_FORMBRICKS_URL` | Rename to NEXT_PUBLIC_HIVECFM_URL |
| `NEXT_PUBLIC_FORMBRICKS_PMF_FORM_ID` | Remove (Formbricks-specific) |
| `NEXT_PUBLIC_FORMBRICKS_COM_*` | Remove (Formbricks cloud-specific) |

## UI Text Patterns

### Search patterns for UI text:
```bash
grep -rI "Formbricks" --include="*.tsx" --include="*.ts"
```

**Key areas:**
- Page titles and meta descriptions
- Navigation components
- Footer components
- Welcome/onboarding screens
- Email templates
- Error messages
- Documentation references

## Repository Metadata

### Files with repository/homepage URLs:
- `/package.json` - homepage field (if present)
- `/packages/logger/package.json` - homepage, repository, author
- README.md files

### Patterns to replace:
- `github.com/formbricks/formbricks` → `github.com/amrhym/hivecfm-core`
- `hola@formbricks.com` → (HiveCFM contact email)

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Circular import issues after rename | HIGH | Rename in dependency order |
| TypeScript path aliases breaking | HIGH | Update tsconfig.json paths |
| pnpm workspace resolution failing | HIGH | Test with `pnpm install` after changes |
| turbo cache invalidation | MEDIUM | Clear .turbo cache after rename |
| Hardcoded strings in runtime code | MEDIUM | Comprehensive grep before build |

## Verification Steps

After renaming:
1. `rm -rf node_modules .turbo`
2. `pnpm install`
3. `pnpm build`
4. `pnpm test`
5. Visual inspection of UI for any "Formbricks" text

---
**Note:** This audit was generated as part of Story 1.3 implementation. Update this document if additional touchpoints are discovered during implementation.
