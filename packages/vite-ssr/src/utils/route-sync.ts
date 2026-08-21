import MagicString from 'magic-string';
import {
  deriveLocalRouteName,
  deriveNamedRouteName,
  deriveSegment,
  type FileMap,
  importSpecifier,
  namedPageName,
  type PageKind,
} from './mapper.js';
import { parseRouteExports, type RouteExports } from './route-parser.js';

export type FillRouteExportsOptions = {
  content: string;
  routeFilePath: string;
  routerFile: string;
  parentRouteFile?: string;
  parentRouteName?: string;
  routeName: string;
  indexName: string;
  isTopLevel: boolean;
  pageKind?: PageKind;
  hasLayout: boolean;
  namedPages: Set<string>;
  linkMetadata?: boolean;
  fileMap: FileMap;
  displayPath: string;
  folderSegment: string;
  warn?: (msg: string) => void;
  resolveMetadataImport: (kind: 'folder' | 'index' | 'named', pageName: string) => { varName: string; source: string };
};

export type FillRouteExportsResult = {
  changed: boolean;
  output: string;
};

/**
 * Maintains the folder's `route.ts` against its physical state: normalizes
 * the parent import, synchronizes local declarations inside the `AirLib managed` block,
 * and fills any missing named exports or default export.
 * Existing user code (guards, custom middleware, custom export names) is never altered.
 */
export function fillMissingRouteExports(options: FillRouteExportsOptions): FillRouteExportsResult | undefined {
  const {
    content,
    routeFilePath,
    routerFile,
    parentRouteFile,
    parentRouteName,
    routeName,
    indexName,
    isTopLevel,
    pageKind,
    hasLayout,
    namedPages,
    linkMetadata,
    fileMap,
    displayPath,
    folderSegment,
    warn,
    resolveMetadataImport,
  } = options;

  const exports = parseRouteExports(content);
  if (!exports) return undefined;

  validateRouteWiring(exports, {
    routeName,
    indexName,
    hasPage: Boolean(pageKind),
    hasLayout,
    namedPages,
    fileMap,
    displayPath,
    folderSegment,
    warn,
  });

  const magic = new MagicString(content);
  let changed = false;

  // 1. Parent import normalization
  const expectedImportSource = parentRouteFile
    ? isTopLevel
      ? importSpecifier(routeFilePath, routerFile)
      : importSpecifier(routeFilePath, parentRouteFile)
    : importSpecifier(routeFilePath, routerFile);
  const routeImport = exports.imports.find((i) => i.source === expectedImportSource);

  if (routeImport) {
    if (parentRouteName && !isTopLevel && routeImport.kind === 'named' && routeImport.count === 1) {
      const found = content.slice(routeImport.start, routeImport.end);
      const replacement = `import parentRoute from '${routeImport.source}';`;
      if (found !== replacement) {
        magic.overwrite(routeImport.start, routeImport.end, replacement);
        changed = true;
        warn?.(
          `${displayPath}route.ts: normalized \`${found}\` to \`${replacement}\` — child folders import the parent's default export so the route chain stays predictable.`
        );
      }
    }
  }

  // 2. Metadata imports linking
  if (linkMetadata) {
    const neededMetaImports: { varName: string; source: string }[] = [];

    if (pageKind === 'mdx') {
      const targetName = hasLayout ? 'indexRoute' : 'route';
      const existing = exports.declarations.find(
        (d) =>
          (d.name === targetName && !d.isExported) || (d.name === (hasLayout ? indexName : routeName) && d.isExported)
      );
      if (!existing?.binding?.hasMeta) {
        neededMetaImports.push(resolveMetadataImport(hasLayout ? 'index' : 'folder', 'page'));
      }
    }

    for (const namedPage of namedPages) {
      const isMdx = namedPage.endsWith(`.${fileMap.pageMdx}`);
      if (isMdx) {
        const name = namedPageName(namedPage, fileMap);
        const localName = deriveLocalRouteName(name);
        const namedRouteName = deriveNamedRouteName(folderSegment, name);
        /* v8 ignore next 3 */
        const existing = exports.declarations.find(
          (d) => (d.name === localName && !d.isExported) || (d.name === namedRouteName && d.isExported)
        );
        if (!existing?.binding?.hasMeta) {
          neededMetaImports.push(resolveMetadataImport('named', name));
        }
      }
    }

    for (const meta of neededMetaImports) {
      const alreadyImported = exports.imports.some((i) => i.source === meta.source);
      if (!alreadyImported) {
        const importLine = `import ${meta.varName} from '${meta.source}';\n`;
        const firstRelativeImport = exports.imports.find((i) => i.source.startsWith('.'));
        if (firstRelativeImport) {
          magic.prependLeft(firstRelativeImport.start, importLine);
        } else {
          magic.prepend(importLine);
        }
        changed = true;
      }
    }

    // Attach .meta() to declarations inside managed block if needed
    for (const declaration of exports.declarations) {
      if (declaration.isExported || declaration.binding?.hasMeta || !declaration.initEnd) continue;

      let metaVarName: string | undefined;
      if (declaration.name === 'route' && pageKind === 'mdx' && !hasLayout) {
        metaVarName = resolveMetadataImport('folder', 'page').varName;
      } else if (declaration.name === 'indexRoute' && pageKind === 'mdx' && hasLayout) {
        metaVarName = resolveMetadataImport('index', 'page').varName;
      } else {
        for (const namedPage of namedPages) {
          const isMdx = namedPage.endsWith(`.${fileMap.pageMdx}`);
          if (isMdx) {
            const name = namedPageName(namedPage, fileMap);
            const localName = deriveLocalRouteName(name);
            if (declaration.name === localName) {
              metaVarName = resolveMetadataImport('named', name).varName;
              break;
            }
          }
        }
      }

      if (metaVarName) {
        magic.appendLeft(declaration.initEnd, `.meta(${metaVarName})`);
        changed = true;
      }
    }
  }

  // 3. Managed block maintenance (local declarations)
  if (exports.managedBlock) {
    const localDecls = exports.declarations.filter(
      (d) => !d.isExported && d.start >= exports.managedBlock!.start && d.end <= exports.managedBlock!.end
    );
    const localNames = new Set(localDecls.map((d) => d.name));

    // Index route
    if (pageKind && hasLayout && !localNames.has('indexRoute')) {
      let call = `const indexRoute = route.route('/');`;
      if (linkMetadata && pageKind === 'mdx') {
        const meta = resolveMetadataImport('index', 'page');
        call = `const indexRoute = route.route('/').meta(${meta.varName});`;
      }
      magic.prependLeft(exports.managedBlock.insertPos, `${call}\n`);
      changed = true;
    } else if (!(pageKind && hasLayout) && localNames.has('indexRoute')) {
      const decl = localDecls.find((d) => d.name === 'indexRoute');
      if (decl) {
        const lineStart = content.lastIndexOf('\n', decl.start - 1) + 1;
        const lineEnd = content.indexOf('\n', decl.end);
        magic.remove(lineStart, lineEnd === -1 ? decl.end : lineEnd + 1);
        changed = true;
      }
    }

    // Named pages
    const activeLocals = new Set<string>();
    for (const namedPage of namedPages) {
      const name = namedPageName(namedPage, fileMap);
      const localName = deriveLocalRouteName(name);
      const segment = deriveSegment(name);
      activeLocals.add(localName);

      if (!localNames.has(localName)) {
        let call = `const ${localName} = route.route('/${segment}');`;
        const isMdx = namedPage.endsWith(`.${fileMap.pageMdx}`);
        if (linkMetadata && isMdx) {
          const meta = resolveMetadataImport('named', name);
          call = `const ${localName} = route.route('/${segment}').meta(${meta.varName});`;
        }
        magic.prependLeft(exports.managedBlock.insertPos, `${call}\n`);
        changed = true;
      }
    }

    // Prune stale named pages from managed block
    for (const decl of localDecls) {
      if (decl.name !== 'route' && decl.name !== 'indexRoute' && !activeLocals.has(decl.name)) {
        const lineStart = content.lastIndexOf('\n', decl.start - 1) + 1;
        const lineEnd = content.indexOf('\n', decl.end);
        magic.remove(lineStart, lineEnd === -1 ? decl.end : lineEnd + 1);
        changed = true;
      }
    }
  }

  // 4. Export declarations maintenance
  const exportAdditions: string[] = [];
  const existingExportNames = new Set(exports.names);

  // Primary route export
  if (!existingExportNames.has(routeName)) {
    exportAdditions.push(`export const ${routeName} = route;`);
  }

  // Index route export
  if (pageKind && hasLayout && !existingExportNames.has(indexName)) {
    exportAdditions.push(`export const ${indexName} = indexRoute;`);
  } else if (!(pageKind && hasLayout) && existingExportNames.has(indexName)) {
    const decl = exports.declarations.find((d) => d.name === indexName && d.isExported);
    if (decl && (decl.initText === 'indexRoute' || decl.initText === 'route')) {
      const lineStart = content.lastIndexOf('\n', decl.start - 1) + 1;
      const lineEnd = content.indexOf('\n', decl.end);
      magic.remove(lineStart, lineEnd === -1 ? decl.end : lineEnd + 1);
      changed = true;
    }
  }

  // Named page exports
  const activeNamedRouteNames = new Set<string>();
  for (const namedPage of namedPages) {
    const name = namedPageName(namedPage, fileMap);
    const localName = deriveLocalRouteName(name);
    const namedRouteName = deriveNamedRouteName(folderSegment, name);
    activeNamedRouteNames.add(namedRouteName);

    if (!existingExportNames.has(namedRouteName)) {
      exportAdditions.push(`export const ${namedRouteName} = ${localName};`);
    }
  }

  // Prune stale named page exports (only if plain alias)
  for (const decl of exports.declarations) {
    if (
      decl.isExported &&
      decl.name !== routeName &&
      decl.name !== indexName &&
      decl.name.endsWith('Route') &&
      !activeNamedRouteNames.has(decl.name)
    ) {
      if (decl.initText && !decl.initText.includes('.guard') && !decl.initText.includes('.provide')) {
        const lineStart = content.lastIndexOf('\n', decl.start - 1) + 1;
        const lineEnd = content.indexOf('\n', decl.end);
        magic.remove(lineStart, lineEnd === -1 ? decl.end : lineEnd + 1);
        changed = true;
      }
    }
  }

  // 5. Default export
  const primaryExportName =
    exports.defaultName ??
    (existingExportNames.has(routeName)
      ? routeName
      : (exports.names.find((n) => n.endsWith('Route') && !n.endsWith('IndexRoute')) ?? routeName));

  if (!exports.defaultName) {
    exportAdditions.push(`export default ${primaryExportName};`);
  }

  if (exportAdditions.length) {
    const block = exportAdditions.join('\n');
    if (exports.defaultStart !== undefined) {
      let wsStart = exports.defaultStart;
      while (
        wsStart > 0 &&
        (content[wsStart - 1] === ' ' ||
          content[wsStart - 1] === '\t' ||
          content[wsStart - 1] === '\n' ||
          content[wsStart - 1] === '\r')
      ) {
        wsStart--;
      }
      magic.overwrite(wsStart, exports.defaultStart, `\n${block}\n\n`);
    } else {
      if (!content.endsWith('\n')) {
        magic.append(`\n\n${block}\n`);
      } else {
        magic.append(`\n${block}\n`);
      }
    }
    changed = true;
  }

  return {
    changed,
    output: magic.toString(),
  };
}

export type ValidateRouteWiringOptions = {
  routeName: string;
  indexName: string;
  hasPage: boolean;
  hasLayout: boolean;
  namedPages: Set<string>;
  fileMap: FileMap;
  displayPath: string;
  folderSegment: string;
  warn?: (msg: string) => void;
};

/**
 * Validates route wiring: ensures default export exists and points to a known export.
 */
export function validateRouteWiring(exports: RouteExports, options: ValidateRouteWiringOptions): void {
  const { routeName, displayPath, warn } = options;

  if (exports.defaultName && exports.defaultName !== routeName && !exports.names.includes(exports.defaultName)) {
    warn?.(
      `${displayPath}route.ts: the default export \`${exports.defaultName}\` is not exported by this file. Adjust the wiring, or remove the export and the generator will re-create it.`
    );
  }
}

/**
 * Discovers the actual exported route names from existing route.ts content.
 */
export function resolveRouteExportNames(content: string): { routeName?: string; indexName?: string } | undefined {
  const exports = parseRouteExports(content);
  if (!exports) return undefined;

  const { names, defaultName } = exports;
  const routeName =
    defaultName && defaultName !== 'default' && names.includes(defaultName)
      ? defaultName
      : (names.find((n) => n.endsWith('Route') && !n.endsWith('IndexRoute')) ?? names.find((n) => n.endsWith('Route')));
  const indexName = names.find((n) => n.endsWith('IndexRoute'));

  return { routeName, indexName };
}
