import { createDataSource } from './data-source.js';

const dataSource = createDataSource();

try {
  await dataSource.initialize();
  await dataSource.undoLastMigration();
  console.log(JSON.stringify({ ok: true, reverted: true }, null, 2));
} finally {
  if (dataSource.isInitialized) await dataSource.destroy();
}
