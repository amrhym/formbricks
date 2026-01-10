<div id="top"></div>

<p align="center">
<h3 align="center">HiveCFM</h3>
<p align="center">
Customer Feedback Management Platform
<br />
Based on Formbricks Open Source
</p>
</p>

## About HiveCFM

HiveCFM is a customer feedback management platform built on top of [Formbricks](https://formbricks.com), an open-source survey suite. This is an enterprise-ready fork with all features enabled.

### Features

- Create **conversion-optimized surveys** with a no-code editor
- Choose from a variety of best-practice **templates**
- Launch and **target surveys to specific user groups** without changing application code
- Create shareable **link surveys**
- Invite organization members to **collaborate** on surveys
- Integrate with **Slack, Notion, Zapier, n8n and more**
- **All enterprise features enabled** - multi-language, SAML SSO, advanced targeting, and more

### Built on Open Source

- [Typescript](https://www.typescriptlang.org/)
- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [Prisma](https://prisma.io/)
- [Auth.js](https://authjs.dev/)
- [Zod](https://zod.dev/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en) (Version: >=18.x)
- [Pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) - to run PostgreSQL and Redis

### Local Development

1. Clone the repository
2. Copy `.env.example` to `.env` and configure
3. Install dependencies: `pnpm install`
4. Start development services: `docker compose up -d`
5. Run database migrations: `pnpm db:migrate`
6. Start development server: `pnpm dev`

### Production Deployment

Use Docker for production deployment. See the deployment documentation for details.

## License

HiveCFM is based on Formbricks which is licensed under [AGPLv3](./LICENSE). Enterprise features are included and enabled by default.

## Acknowledgments

- [Formbricks](https://formbricks.com) - The open-source survey platform this project is based on
- All Formbricks contributors for their work on the core platform

<p align="right"><a href="#top">Back to top</a></p>
