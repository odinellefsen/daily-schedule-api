## Installation

Install dependencies:
```sh
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM. Make sure you have a `.env` file with:
```
POSTGRES_CONNECTION_STRING=postgresql://postgres:postgres@localhost:5432/daily-schedule-db
```

Start the database with Docker:
```sh
docker-compose up -d
```

Generate and apply database migrations:
```sh
bun run db:generate
bun run db:migrate
```

## Development

To run the development server:
```sh
bun run dev
```

Open http://localhost:3000

## Database Commands

- `bun run db:generate` - Generate migration files from schema changes
- `bun run db:migrate` - Apply migrations to the database  
- `bun run db:push` - Push schema changes directly to database (for development)
- `bun run db:studio` - Open Drizzle Studio for database exploration

For more database documentation, see [src/db/README.md](src/db/README.md).
