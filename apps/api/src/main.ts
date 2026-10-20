import { createApplication } from './bootstrap.js';
import { ENVIRONMENT } from './config/environment.js';
import type { Environment } from './config/environment.js';
import { SafeLogger } from './logging/safe-logger.js';

const logger = new SafeLogger();
let app: Awaited<ReturnType<typeof createApplication>> | undefined;
try {
  app = await createApplication();
  const environment = app.get<Environment>(ENVIRONMENT);
  const deadline = () => {
    setTimeout(() => {
      logger.error({ event: 'shutdown.timeout' });
      process.exit(1);
    }, environment.SHUTDOWN_TIMEOUT_MS).unref();
  };
  process.once('SIGTERM', deadline);
  process.once('SIGINT', deadline);
  await app.listen(environment.PORT, environment.HOST);
} catch {
  logger.error({ event: 'startup.failed', hint: 'Check environment and listener configuration.' });
  await app?.close();
  process.exitCode = 1;
}
