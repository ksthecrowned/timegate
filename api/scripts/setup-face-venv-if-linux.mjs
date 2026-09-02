import { execSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { platform } from 'os';

if (platform() === 'win32') {
  process.exit(0);
}

const script = resolve(dirname(fileURLToPath(import.meta.url)), 'setup-face-venv-linux.sh');
execSync(`bash "${script}"`, { stdio: 'inherit' });
