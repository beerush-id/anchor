#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cancel, intro, isCancel, outro, select, spinner, text } from '@clack/prompts';
import { Command } from 'commander';
import pc from 'picocolors';
import * as tar from 'tar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('create-airlib')
  .description('Scaffold a new AirLib project')
  .argument('[project-directory]', 'Directory to create the project in')
  .parse(process.argv);

async function main() {
  console.clear();
  intro(pc.bgCyan(pc.black(' Welcome to AirLib ')));

  const stackChoice = await select({
    message: 'What kind of project do you want to build?',
    options: [
      { value: 'frontend', label: 'Frontend App (React / Solid)' },
      { value: 'backend', label: 'Backend API (Isomorphic RPC Server)' },
    ],
  });

  if (isCancel(stackChoice)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  let templateName = '';

  if (stackChoice === 'backend') {
    templateName = 'irpc-starter';
  } else {
    const framework = await select({
      message: 'Which framework would you like to use?',
      options: [
        { value: 'react', label: 'React' },
        { value: 'solid', label: 'SolidJS' },
      ],
    });

    if (isCancel(framework)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }

    const variant = await select({
      message: 'Select your preferred stack variant:',
      options: [
        { value: 'air', label: 'AirLib Full Stack (Includes IRPC, Real-time WebSockets, Router)' },
        { value: 'ssr', label: 'Standard SSR (Router only, no IRPC)' },
      ],
    });

    if (isCancel(variant)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }

    if (framework === 'react' && variant === 'air') templateName = 'air-react';
    if (framework === 'solid' && variant === 'air') templateName = 'air-solid';
    if (framework === 'react' && variant === 'ssr') templateName = 'react-ssr';
    if (framework === 'solid' && variant === 'ssr') templateName = 'solid-ssr';
  }

  let targetDir = program.args[0];

  if (!targetDir) {
    const defaultName = templateName === 'irpc-starter' ? 'my-irpc' : templateName;
    const defaultDir = `./${defaultName}`;
    const dir = await text({
      message: 'Where should we create your project?',
      placeholder: defaultDir,
      defaultValue: defaultDir,
    });

    if (isCancel(dir)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }

    targetDir = dir as string;
  }

  const s = spinner();
  s.start(`Unpacking ${pc.cyan(templateName)} template...`);

  const targetPath = path.resolve(process.cwd(), targetDir);

  try {
    await fs.mkdir(targetPath, { recursive: true });

    // The tarball is at ../dist/templates.tar.tgz relative to bin/index.js
    const tarballPath = path.resolve(__dirname, '../dist/templates.tar.tgz');

    await tar.x({
      file: tarballPath,
      cwd: targetPath,
      strip: 1,
      filter: (path) => path.startsWith(`${templateName}/`),
    });

    // Rename package.json
    const pkgPath = path.join(targetPath, 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    const projectName = path.basename(targetPath);
    pkg.name = projectName;
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

    // Create .env from .env.example
    const envExamplePath = path.join(targetPath, '.env.example');
    try {
      await fs.stat(envExamplePath);
      await fs.copyFile(envExamplePath, path.join(targetPath, '.env'));
    } catch (e) {
      // Ignore if .env.example doesn't exist
    }

    s.stop(pc.green('Template unpacked successfully!'));

    outro(`Next steps:\n\n  cd ${targetDir}\n  bun install\n  bun run dev`);
  } catch (err: any) {
    s.stop(pc.red('Failed to unpack template.'));
    console.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
