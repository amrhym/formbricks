# Contributing to HiveCFM

HiveCFM is a white-labeled fork of the Formbricks ecosystem, extended with Genesys Cloud integration for contact center CX survey management.

## Repository Structure

HiveCFM consists of 11 forked repositories:

| Repository | Purpose | Upstream |
|------------|---------|----------|
| `hivecfm-core` | Core survey platform (Next.js 14) | `formbricks/formbricks` |
| `hivecfm-js` | JavaScript/Web SDK | `formbricks/js` |
| `hivecfm-react-native` | React Native SDK | `formbricks/react-native` |
| `hivecfm-ios` | iOS Native SDK (Swift) | `formbricks/ios` |
| `hivecfm-android` | Android Native SDK (Kotlin) | `formbricks/android` |
| `hivecfm-metabase` | Analytics platform | `metabase/metabase` |
| `hivecfm-superset-hub` | Apache Superset analytics | `formbricks/hub` |
| `hivecfm-superset-decision` | Decision analytics | `formbricks/decision` |
| `hivecfm-perf-tests` | Performance testing | `formbricks/performance-test-q2-2025` |
| `hivecfm-aws-ecs` | AWS ECS infrastructure | `formbricks/AWS-ECS-Deployment` |

## Branch Strategy

### Main Branches

- `hivecfm-main` — The default branch for all HiveCFM development. All white-label modifications and custom integrations go here.
- `main` — Synced with upstream Formbricks. Used as a reference only; do not commit directly.

### Feature Branches

Create feature branches from `hivecfm-main`:

```bash
git checkout hivecfm-main
git pull origin hivecfm-main
git checkout -b feature/your-feature-name
```

### Branch Naming Conventions

- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation updates
- `refactor/` — Code refactoring
- `chore/` — Maintenance tasks

## Upstream Sync Strategy

We periodically sync with upstream Formbricks to get bug fixes and new features.

### Sync Schedule

- **Weekly Review**: Check upstream for security patches
- **Monthly Sync**: Merge non-breaking changes
- **Major Releases**: Careful review and staged merge

### How to Sync

1. Use the sync script:
   ```bash
   ./scripts/sync-upstream.sh
   ```

2. Or manually:
   ```bash
   git checkout hivecfm-main
   git fetch upstream
   git merge upstream/main --no-edit
   # Resolve any conflicts
   git push origin hivecfm-main
   ```

### Handling Conflicts

When syncing, conflicts may occur in these areas:

1. **Package names** — We use `@hivecfm/*` instead of `@formbricks/*`
2. **Branding** — UI text, logos, colors
3. **Custom integrations** — Our Genesys webhook handlers

Resolution priority:
1. Keep HiveCFM customizations
2. Accept upstream bug fixes
3. Review new features case-by-case

## Development Workflow

### Prerequisites

- Node.js 18+
- pnpm 8.x
- Docker & Docker Compose
- PostgreSQL 16.x (or use Docker)

### Local Setup

```bash
# Clone the repository
git clone git@github.com:YOUR_ORG/hivecfm-core.git
cd hivecfm-core

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Start development services
docker compose up -d postgres

# Run database migrations
pnpm prisma migrate dev

# Start development server
pnpm dev
```

### Code Style

- TypeScript with strict mode enabled
- ESLint + Prettier for formatting
- Co-located test files (`*.test.ts` next to source)

### Commit Messages

Follow conventional commits:

```
type(scope): description

feat(genesys): add conversation.end webhook handler
fix(sms): correct phone number validation
docs(readme): update setup instructions
```

## Pull Request Process

1. Create a feature branch from `hivecfm-main`
2. Implement changes with tests
3. Run `pnpm lint` and `pnpm test`
4. Open PR against `hivecfm-main`
5. Request review from CODEOWNERS
6. Address review feedback
7. Squash and merge when approved

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated (if applicable)
- [ ] No breaking changes (or noted in PR description)
- [ ] Follows HiveCFM coding standards
- [ ] No Formbricks branding (use HiveCFM)

## HiveCFM-Specific Guidelines

### Genesys Integration

All Genesys-related code should:
- Prefix fields with `genesys` (e.g., `genesysConversationId`)
- Use the standard API response wrapper
- Follow error code naming: `GENESYS_WEBHOOK_*`

### API Response Format

All API endpoints must use:

```typescript
// Success
return Response.json({
  success: true,
  data: { /* response data */ }
});

// Error
return Response.json({
  success: false,
  error: {
    code: "DOMAIN_ACTION_REASON",
    message: "Human-readable message"
  }
}, { status: 4xx/5xx });
```

### Testing

- Co-locate tests with source files
- Use Vitest for unit/integration tests
- Follow Arrange-Act-Assert pattern

## Patch Management

HiveCFM uses patch files to unlock enterprise features. These patches must be reapplied after upstream merges.

### Patch Files

| Patch | Purpose |
|-------|---------|
| `patches/formbricks-enterprise-unlock.patch` | Unlocks all enterprise features |

### Applying Patches

After syncing with upstream, reapply patches:

```bash
./scripts/apply-patches.sh
```

The script is idempotent — safe to run multiple times.

### Creating New Patches

If you modify enterprise feature code:

```bash
# After making changes
git diff > patches/your-patch-name.patch

# Or for specific files
git diff path/to/file.ts > patches/specific-patch.patch
```

### After Upstream Merge

1. Sync with upstream: `./scripts/sync-upstream.sh`
2. Reapply patches: `./scripts/apply-patches.sh`
3. Resolve any conflicts manually
4. Test that enterprise features still work

## Getting Help

- Check existing issues before creating new ones
- Use discussions for questions
- Tag issues appropriately (bug, feature, question)

## License

HiveCFM is proprietary software. All rights reserved.
