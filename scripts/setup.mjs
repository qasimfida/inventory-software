import { constants, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));

export function setup() {
  for (const app of ['api', 'web', 'mobile']) {
    const destination = new URL(`../apps/${app}/.env`, import.meta.url);
    try {
      copyFileSync(new URL(`${destination.href}.example`), destination, constants.COPYFILE_EXCL);
      console.log(`Created apps/${app}/.env from its local development example.`);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
}

setup();
