# Central database migrations

No business schema exists. `node-pg-migrate` owns the `schema_migrations` metadata table and serializes migration execution with its advisory lock. See [migration workflow](../../../docs/development/migrations.md) before creating or applying SQL migrations.
