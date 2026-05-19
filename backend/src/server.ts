import { createApp } from './app.js';
import { loadAppConfig } from './config/env.js';
import { createDataSource } from './db/data-source.js';

const config = loadAppConfig();
if (config.nodeEnv === 'production' && !config.database.enabled) {
  throw new Error('Database configuration is required in production');
}
const dataSource = config.database.enabled ? createDataSource(config) : undefined;

try {
  if (dataSource) await dataSource.initialize();
  const app = await createApp({ config, dataSource });

  const close = async () => {
    await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  };

  process.on('SIGINT', () => { void close().finally(() => process.exit(0)); });
  process.on('SIGTERM', () => { void close().finally(() => process.exit(0)); });

  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  console.error(error);
  if (dataSource?.isInitialized) await dataSource.destroy();
  process.exit(1);
}
