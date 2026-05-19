import { createDataSource } from './data-source.js';

const dataSource = createDataSource();

try {
  await dataSource.initialize();
  const hasPendingMigrations = await dataSource.showMigrations();
  console.log(JSON.stringify({
    ok: true,
    hasPendingMigrations,
  }, null, 2));
} finally {
  if (dataSource.isInitialized) await dataSource.destroy();
}
