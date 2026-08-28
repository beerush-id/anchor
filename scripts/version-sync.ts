import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* @ts-expect-error */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;

interface PackageManifest {
  name?: string;
  version?: string;
  workspaces?: string[];
  [key: string]: unknown;
}

/**
 * Replaces `workspace:*` dependencies and synchronizes package manifest versions
 * across monorepo packages with the root package version or a specified target version.
 *
 * @param targetVersion - Target version string to apply, or `undefined` to use root version.
 * @param isRevert - Whether this operation is reverting workspace dependencies back to `workspace:*`.
 * @returns Summary of modified package manifest paths.
 */
export function replaceWorkspaceVersions(targetVersion?: string, isRevert = false): string[] {
  const rootManifestPath = join(ROOT_DIR, 'package.json');
  const rootManifest = readManifest(rootManifestPath);
  const version = targetVersion || rootManifest.version;

  if (!version) {
    throw new Error('Could not resolve version from root package.json');
  }

  const manifestPaths = discoverPackageManifests(rootManifest);
  const updatedFiles: string[] = [];

  for (const manifestPath of manifestPaths) {
    const updated = updateManifest(manifestPath, version, isRevert);
    if (updated) {
      updatedFiles.push(manifestPath);
    }
  }

  return updatedFiles;
}

/**
 * Discovers all relevant package.json manifests defined by root workspace globs.
 *
 * @param rootManifest - Parsed root package manifest containing workspace definitions.
 * @returns Unique absolute paths to all workspace package.json files including root.
 */
export function discoverPackageManifests(rootManifest: PackageManifest): string[] {
  const manifestPaths = new Set<string>();
  const patterns = Array.from(new Set([...(rootManifest.workspaces || []), 'templates/*']));

  manifestPaths.add(join(ROOT_DIR, 'package.json'));

  for (const pattern of patterns) {
    const baseDir = pattern.replace(/\/?\*.*$/, '');
    const absoluteBase = join(ROOT_DIR, baseDir);

    if (!existsSync(absoluteBase)) {
      continue;
    }

    const entries = readdirSync(absoluteBase, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const candidate = join(absoluteBase, entry.name, 'package.json');
        if (existsSync(candidate)) {
          manifestPaths.add(candidate);
        }
      }
    }
  }

  return Array.from(manifestPaths);
}

/**
 * Updates dependency declarations and version field in a single package manifest.
 *
 * @param filePath - Absolute path to the package.json file.
 * @param targetVersion - The version string to apply.
 * @param isRevert - When true, only resets workspace dependencies to `workspace:*` without altering package version.
 * @returns True if the file content changed and was written, false otherwise.
 */
export function updateManifest(filePath: string, targetVersion: string, isRevert = false): boolean {
  const content = readFileSync(filePath, 'utf8');
  const manifest: PackageManifest = JSON.parse(content);
  let changed = false;

  if (!isRevert && manifest.version && manifest.version !== targetVersion) {
    manifest.version = targetVersion;
    changed = true;
  }

  const dependencyTarget = isRevert ? 'workspace:*' : targetVersion;

  for (const field of DEPENDENCY_FIELDS) {
    const deps = manifest[field] as Record<string, string> | undefined;
    if (!deps || typeof deps !== 'object') {
      continue;
    }

    for (const [pkgName, specifier] of Object.entries(deps)) {
      if (isRevert) {
        if (specifier === targetVersion) {
          deps[pkgName] = dependencyTarget;
          changed = true;
        }
      } else if (specifier === 'workspace:*' || specifier !== dependencyTarget) {
        if (specifier === 'workspace:*') {
          deps[pkgName] = dependencyTarget;
          changed = true;
        }
      }
    }
  }

  if (changed) {
    writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  return changed;
}

/**
 * Reads and parses a package.json manifest.
 *
 * @param filePath - Absolute path to the package.json file.
 * @returns Parsed package manifest object.
 */
function readManifest(filePath: string): PackageManifest {
  const content = readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

// CLI Execution
if (process.argv[1] === __filename) {
  const isRevert = process.argv.includes('--revert');
  const customVersion = process.argv.slice(2).find((arg) => !arg.startsWith('--'));

  try {
    const updated = replaceWorkspaceVersions(customVersion, isRevert);
    const label = isRevert
      ? 'Reverted workspace dependencies to workspace:*'
      : 'Synchronized package versions and workspace dependencies';
    console.log(`\n✨ Successfully processed package manifests (${label})`);
    console.log(`Modified ${updated.length} file(s):`);
    for (const file of updated) {
      console.log(` - ${file.replace(`${ROOT_DIR}/`, '')}`);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${(error as Error).message}`);
    process.exit(1);
  }
}
