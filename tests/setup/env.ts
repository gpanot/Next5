/**
 * Test environment. DB-backed tests use a dedicated local database, never .env.local.
 * Override with DATABASE_URL_TEST. Create it once with:
 *   createdb next5_test && psql -d next5_test -f db/schema.sql && DATABASE_URL=… npx dbmate up
 */
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  `postgres://${process.env.USER ?? 'postgres'}@localhost:5432/next5_test?sslmode=disable`;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
