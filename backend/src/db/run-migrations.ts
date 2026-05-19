import { createDataSource } from './data-source.js';

const dataSource = createDataSource();

try {
  await dataSource.initialize();
  const migrations = await dataSource.runMigrations();
  console.log(JSON.stringify({
    ok: true,
    migrationsRun: migrations.map((migration) => migration.name),
  }, null, 2));
} finally {
  if (dataSource.isInitialized) await dataSource.destroy();
}
