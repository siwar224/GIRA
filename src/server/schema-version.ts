/**
 * The newest migration this version of the code expects in the database (file name in
 * db/migrations, without ".sql"). The health check compares it with the database, and a
 * unit test fails if a new migration is added without updating it here.
 */
export const EXPECTED_SCHEMA = "003_waitlist";
