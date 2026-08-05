import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Files to create, keyed by relative path (`''` = 0-byte file). */
export type FixtureFiles = Record<string, string>;

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Base directory for fixtures that must stay inside the package so vite-node
 * can transform their TypeScript (executed generated modules).
 */
export const PACKAGE_TMP = path.join(here, '.tmp');

/** Creates a temp fixture directory with the given files written. */
export function makeFixture(files: FixtureFiles, base = os.tmpdir()): string {
  fs.mkdirSync(base, { recursive: true });
  const dir = fs.mkdtempSync(path.join(base, 'air-pages-'));
  writeFixture(dir, files);
  return dir;
}

/** Writes additional files into an existing fixture directory. */
export function writeFixture(dir: string, files: FixtureFiles): void {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
}

/** Reads a file from a fixture directory. */
export function readFixture(dir: string, rel: string): string {
  return fs.readFileSync(path.join(dir, rel), 'utf-8');
}

/** Tells whether a path exists inside a fixture directory. */
export function fixtureExists(dir: string, rel: string): boolean {
  return fs.existsSync(path.join(dir, rel));
}

/** Removes a file or directory inside a fixture directory. */
export function removeFixture(dir: string, rel: string): void {
  fs.rmSync(path.join(dir, rel), { recursive: true, force: true });
}

/** Removes a whole fixture directory. */
export function cleanFixture(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Absolute path of a fixture entry. */
export function fixturePath(dir: string, rel: string): string {
  return path.join(dir, rel);
}
