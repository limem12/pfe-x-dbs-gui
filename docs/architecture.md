# Architecture overview

The portfolio edition uses a web frontend, a REST API and PostgreSQL. Docker Compose is provided for local development.

- **Frontend:** Next.js, React, TypeScript and Tailwind CSS
- **Backend:** NestJS REST API with JWT authentication, Swagger documentation and Jest tests
- **Database:** PostgreSQL schema and numbered migrations
- **Optional client:** C11 REST client using libcurl and json-c

The public edition deliberately excludes organisation-specific configuration, credentials, database backups and internal documentation.
