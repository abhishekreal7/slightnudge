import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontMock = path.resolve(__dirname, 'font-mock.cjs');

const env = {
  ...process.env,
  NEXT_FONT_GOOGLE_MOCKED_RESPONSES: fontMock,
};

try {
  console.log('[Build] Executing production webpack build with offline font fallback...');
  execSync('npx next build --webpack', { stdio: 'inherit', env });
} catch (error) {
  process.exit(error.status || 1);
}
