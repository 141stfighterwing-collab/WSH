// Cross-platform build asset copy script (BUG-010 fix)
// Replaces Unix-only `cp -r` commands for Windows compatibility
import { cpSync, mkdirSync } from 'fs';
import { join } from 'path';

function copyRecursive(src, dest) {
  mkdirSync(dest, { recursive: true });
  const entries = cpSync(src, dest, { recursive: true });
}

try {
  copyRecursive('.next/static', '.next/standalone/.next/static');
  copyRecursive('public', '.next/standalone/public');
  console.log('Build assets copied successfully.');
} catch (err) {
  console.error('Failed to copy build assets:', err.message);
  process.exit(1);
}
