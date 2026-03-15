# HiveCFM Technical Documentation

Comprehensive technical documentation for the HiveCFM Enterprise Customer Feedback Management Platform.

## Documents

| # | Document | Description |
|---|----------|-------------|
| 01 | [Architecture Overview](01-architecture-overview.md) | System architecture, technology stack, monorepo structure, data flow diagrams |
| 02 | [Database Schema](02-database-schema.md) | Complete Prisma schema, models, enums, migrations, Superset analytics views |
| 03 | [API Reference](03-api-reference.md) | All REST API endpoints — client, management, and integration APIs |
| 04 | [Survey Engine](04-survey-engine.md) | Question types, channels, logic, blocks, rendering, i18n |
| 05 | [Integrations](05-integrations.md) | Superset, HiveCFM Notifications, n8n, Genesys, Airtable, Notion, Slack, Google Sheets, Stripe |
| 06 | [Authentication & Security](06-authentication-security.md) | NextAuth, SAML/SSO, API keys, RBAC, rate limiting, RLS |
| 07 | [Deployment Guide](07-deployment-guide.md) | Docker, Azure Container Apps, Kubernetes/Helm, OpenShift on-prem |
| 08 | [Logging, Monitoring & Support](08-logging-monitoring-support.md) | Pino logging, Sentry, health checks, debugging, incident response |
| 09 | [Codebase Walkthrough](09-codebase-walkthrough.md) | Key modules, code patterns, build system, state management |
| 10 | [Azure Infrastructure](10-azure-infrastructure.md) | Current production setup — all resources, sizing, networking, firewall, CI/CD, costs |

## Diagrams

All architecture and flow diagrams are written in [Mermaid](https://mermaid.js.org/) syntax and can be rendered in:
- GitHub Markdown (native support)
- VS Code with Mermaid extension
- [Mermaid Live Editor](https://mermaid.live/)
- Confluence (with Mermaid macro)

## Target Audience

- **Developers** — onboarding, code navigation, contribution
- **DevOps / SRE** — deployment, monitoring, incident response
- **Technical Leads** — architecture decisions, integration planning
- **Support Engineers** — debugging, troubleshooting, operational recipes
