# Consent API

Customer identity, access grants and consent management API.
Built with Express 5, Prisma 7, PostgreSQL and MongoDB.

## Local setup

Requirements: Node 24 (see `.nvmrc`), Docker with Compose.

```bash
npm install
./scripts/setup-env.sh          # creates .env and .env.test with random secrets
docker compose up -d --wait     # starts Postgres and MongoDB
```

To start from scratch (this deletes local data):

```bash
docker compose down -v && rm .env .env.test && ./scripts/setup-env.sh
```