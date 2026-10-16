# X-DBS GUI — Portfolio Edition

A full-stack web application for configuring products, steps, sequences, execution modes, and related rules. This public portfolio edition contains reviewed source code and no production data.

## Highlights

- JWT authentication and role/permission-based access
- Management of products, steps, sequences, parameters, and limits
- Per-product configuration: values, ordering, execution rules, and component limits
- Activity history, user administration, profile avatars, and password management
- French/English interface with light and dark themes
- REST API documentation with Swagger, PostgreSQL migrations, and Docker Compose
- Optional C client for consuming the REST API

## Stack

Next.js · React · TypeScript · Tailwind CSS · NestJS · PostgreSQL · Docker Compose · Swagger · C/libcurl/json-c

## Repository scope

This repository is a portfolio demonstration. It excludes credentials, production data, internal documentation, company-specific configuration, and the original Git history.

## Local setup

1. Copy `.env.example` to `.env` and provide local development values.
2. This portfolio copy includes no production data or seeded default account.
3. Review the compose configuration before starting containers.
4. Run `docker compose up --build` for a local environment.

## Project structure

```text
frontend/          Next.js user interface
backend/dbs-api/   NestJS REST API
database/          Schema and reviewed migrations
c-client/          Optional C REST client
docker-compose.yaml
```

