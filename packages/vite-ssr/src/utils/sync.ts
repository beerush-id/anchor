import fs from 'node:fs';
import path from 'node:path';

export function writeIfChanged(filePath: string, content: string): boolean {
  try {
    if (fs.readFileSync(filePath, 'utf-8') === content) return false;
  } catch {}

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return true;
}

export function ensureSymlink(rootDir: string): void {
  const absAirStackDir = path.join(rootDir, '.airstack');
  const nodeModulesDir = path.join(rootDir, 'node_modules');
  const target = path.join(nodeModulesDir, '@airstack');
  fs.mkdirSync(nodeModulesDir, { recursive: true });

  const isWin32 = process.platform === 'win32';
  const expectedTarget = isWin32 ? absAirStackDir : path.relative(nodeModulesDir, absAirStackDir);

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
