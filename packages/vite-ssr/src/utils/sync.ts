import fs from 'node:fs';
import path from 'node:path';
import { AIR_ENV } from '../modules/env.js';

export function writeIfChanged(filePath: string, content: string): boolean {
  try {
    if (fs.readFileSync(filePath, 'utf-8') === content) return false;
  } catch {}

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return true;
}

export function ensureSymlink(
  viteRoot: string,
  cacheDir: string = AIR_ENV.cacheDir,
  cacheScope: string = AIR_ENV.cacheScope
): void {
  const absAirLibDir = path.join(viteRoot, cacheDir);
  const nodeModulesDir = path.join(viteRoot, 'node_modules');
  const target = path.join(nodeModulesDir, cacheScope);
  fs.mkdirSync(nodeModulesDir, { recursive: true });

  const isWin32 = process.platform === 'win32';
  const expectedTarget = isWin32 ? absAirLibDir : path.relative(nodeModulesDir, absAirLibDir);

  try {
    const stat = fs.lstatSync(target);
    if (!stat.isSymbolicLink() || fs.readlinkSync(target) !== expectedTarget) {
      fs.rmSync(target, { recursive: true, force: true });
      fs.symlinkSync(expectedTarget, target, isWin32 ? 'junction' : 'dir');
    }
  } catch {
    fs.symlinkSync(expectedTarget, target, isWin32 ? 'junction' : 'dir');
  }
}

export function bootPackage(dir: string, name: string, exports: Record<string, string>): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, type: 'module', exports }, null, 2), 'utf-8');
}
