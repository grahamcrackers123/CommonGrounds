import { config, parse } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

let loaded = false;
let validated = false;

const TEST_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TEST_USER_EMAIL',
  'TEST_USER_PASSWORD',
];

export function loadTestEnv() {
  if (loaded) return;
  loaded = true;

  const root = process.cwd();

  config({ path: path.join(root, '.env.local'), quiet: true });
  config({ path: path.join(root, '.env.test'), override: true, quiet: true });
}

export function assertTestEnvConfigured() {
  if (validated) return;
  validated = true;

  const root = process.cwd();
  const testEnvPath = path.join(root, '.env.test');

  if (!existsSync(testEnvPath)) {
    throw new Error(
      'Missing .env.test. Copy .env.test.example to .env.test and point it at a dedicated Supabase test project before running the system tests.'
    );
  }

  const testEnv = parse(readFileSync(testEnvPath));
  const missing = TEST_ENV_KEYS.filter((key) => !testEnv[key]);

  if (missing.length > 0) {
    throw new Error(
      `.env.test is missing required values: ${missing.join(', ')}. See .env.test.example.`
    );
  }

  const localEnvPath = path.join(root, '.env.local');

  if (existsSync(localEnvPath)) {
    const localEnv = parse(readFileSync(localEnvPath));

    if (
      localEnv.NEXT_PUBLIC_SUPABASE_URL &&
      localEnv.NEXT_PUBLIC_SUPABASE_URL ===
        testEnv.NEXT_PUBLIC_SUPABASE_URL
    ) {
      console.warn(
        'Warning: .env.test points at the same Supabase project as .env.local. Tests will create and delete data for the dedicated test user in that project.'
      );
    }
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.test.example to .env.test and fill in the test project values.`
    );
  }

  return value;
}
