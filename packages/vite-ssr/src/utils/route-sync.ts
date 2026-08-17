import MagicString from 'magic-string';
import {
  deriveNamedRouteName,
  deriveSegment,
  type FileMap,
  importSpecifier,
  LEGACY_DEFAULT_MARKER,
  MARKER_DEFAULT,
  MARKER_VARIABLE_NAME,
  namedPageName,
  type PageKind,
} from './mapper.js';
import {
  hasMarkerAbove,
  markerLineStart,
  parseRouteExports,
  type RouteBinding,
  type RouteExports,
} from './route-parser.js';

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
 * the parent import to its default form, validates existing wiring, and
 * appends any missing export (index, leaf, default) via magic-string.
 * Existing user code is never deleted or altered.
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

  const expectedImportSource = parentRouteFile
    ? isTopLevel
      ? importSpecifier(routeFilePath, routerFile)
      : importSpecifier(routeFilePath, parentRouteFile)
    : importSpecifier(routeFilePath, routerFile);
  const routeImport = exports.imports.find((i) => i.source === expectedImportSource);

  if (routeImport) {
    if (parentRouteName && !isTopLevel && routeImport.kind === 'named' && routeImport.count === 1) {
      const found = content.slice(routeImport.start, routeImport.end);
      const replacement = `import ${parentRouteName} from '${routeImport.source}';`;
      if (found !== replacement) {
        magic.overwrite(routeImport.start, routeImport.end, replacement);
        changed = true;
        warn?.(
          `${displayPath}route.ts: normalized \`${found}\` to \`${replacement}\` — child folders import the parent's default export so the route chain stays predictable.`
        );
      }
    }
  }

  if (linkMetadata) {
    const neededMetaImports: { varName: string; source: string }[] = [];

    if (pageKind === 'mdx') {
      const targetName = hasLayout ? indexName : routeName;
      const existing = exports.declarations.find((d) => d.name === targetName);
      if (!existing?.binding?.hasMeta) {
        neededMetaImports.push(resolveMetadataImport(hasLayout ? 'index' : 'folder', 'page'));
      }
    }

    for (const namedPage of namedPages) {
      const isMdx = namedPage.endsWith(`.${fileMap.pageMdx}`);
      if (isMdx) {
        const name = namedPageName(namedPage, fileMap);
        const namedRouteName = deriveNamedRouteName(folderSegment, name);
        const existing = exports.declarations.find((d) => d.name === namedRouteName);
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
          const insertPos = firstRelativeImport.start;
          magic.prependLeft(insertPos, importLine);
        } else {
          magic.prepend(importLine);
        }
        changed = true;
      }
    }

    for (const declaration of exports.declarations) {
      const isGeneratorOwned = markerLineStart(content, declaration.start) !== undefined;
      if (!isGeneratorOwned || declaration.binding?.hasMeta || !declaration.initEnd) continue;

      let metaVarName: string | undefined;
      if (declaration.name === routeName && pageKind === 'mdx' && !hasLayout) {
        metaVarName = resolveMetadataImport('folder', 'page').varName;
      } else if (declaration.name === indexName && pageKind === 'mdx' && hasLayout) {
        metaVarName = resolveMetadataImport('index', 'page').varName;
      } else {
        for (const namedPage of namedPages) {
          const isMdx = namedPage.endsWith(`.${fileMap.pageMdx}`);
          if (isMdx) {
            const name = namedPageName(namedPage, fileMap);
            const namedRouteName = deriveNamedRouteName(folderSegment, name);
            if (declaration.name === namedRouteName) {
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

  const contractNames = getContractExportNames({
    routeName,
    indexName,
    hasPage: Boolean(pageKind),
    hasLayout,
    namedPages,
    fileMap,
    folderSegment,
  });

  for (const contractName of contractNames) {
    const declaration = exports.declarations.find((d) => d.name === contractName);
    if (declaration?.start !== undefined && !hasMarkerAbove(content, declaration.start, MARKER_VARIABLE_NAME)) {
      magic.prependLeft(declaration.start, `${MARKER_VARIABLE_NAME}\n`);
      changed = true;
    }
  }

  const boundPaths = new Set(
    exports.declarations
      .map((d) => d.binding)
      .filter((binding): binding is RouteBinding => binding !== undefined)
      .filter((binding) => binding.object === routeName && binding.method === 'route')
      .map((binding) => binding.path)
  );

  const additions: string[] = [];

  if (pageKind && hasLayout && !exports.names.includes(indexName) && !boundPaths.has('/')) {
    let call = `${routeName}.route('/')`;
    if (linkMetadata && pageKind === 'mdx') {
      const meta = resolveMetadataImport('index', 'page');
      call += `.meta(${meta.varName})`;
    }
    additions.push(`${MARKER_VARIABLE_NAME}\nexport const ${indexName} = ${call};`);
  }

  for (const namedPage of namedPages) {
    const name = namedPageName(namedPage, fileMap);
    const namedRouteName = deriveNamedRouteName(folderSegment, name);
    const segment = deriveSegment(name);

    if (!exports.names.includes(namedRouteName) && !boundPaths.has(`/${segment}`)) {
      let call = `${routeName}.route('/${segment}')`;
      const isMdx = namedPage.endsWith(`.${fileMap.pageMdx}`);
      if (linkMetadata && isMdx) {
        const meta = resolveMetadataImport('named', name);
        call += `.meta(${meta.varName})`;
      }
      additions.push(`${MARKER_VARIABLE_NAME}\nexport const ${namedRouteName} = ${call};`);
    }
  }

  const defaultMarkerMissing =
    exports.defaultName !== undefined &&
    exports.defaultStart !== undefined &&
    !hasMarkerAbove(content, exports.defaultStart, MARKER_DEFAULT) &&
    !hasMarkerAbove(content, exports.defaultStart, LEGACY_DEFAULT_MARKER);

  if (!exports.defaultName && exports.names.includes(routeName)) {
    additions.push(`${MARKER_DEFAULT}\nexport default ${routeName};`);
  }

  const activeNamed = new Set(
    [...namedPages].map((page) => deriveNamedRouteName(folderSegment, namedPageName(page, fileMap)))
  );
  const stale = exports.declarations.filter((declaration) => {
    if (markerLineStart(content, declaration.start) === undefined) return false;
    const plain = declaration.binding?.object === routeName && declaration.binding.method === 'route';
    if (!plain) return false;
    if (declaration.name === indexName) return !(pageKind && hasLayout);
    return declaration.name !== routeName && declaration.name.endsWith('Route') && !activeNamed.has(declaration.name);
  });

  if (stale.length) {
    for (const declaration of stale) {
      const markerStart = markerLineStart(content, declaration.start)!;
      const lineEnd = content.indexOf('\n', declaration.end);
      /* v8 ignore next */
      magic.remove(markerStart, lineEnd === -1 ? content.length : lineEnd + 1);
    }
    changed = true;
  }

  if (additions.length || defaultMarkerMissing) {
    const block = defaultMarkerMissing ? [...additions, MARKER_DEFAULT].join('\n\n') : additions.join('\n\n');
    const insertStart = defaultMarkerMissing
      ? exports.defaultStart!
      : (exports.defaultInsertStart ?? exports.defaultStart ?? content.length);
    if (defaultMarkerMissing || insertStart >= content.length) {
      magic.appendLeft(insertStart, `${block}\n`);
    } else {
      magic.appendLeft(insertStart, `${block}\n\n`);
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
 * Warns about existing exports whose wiring contradicts the contract: the
 * default must reference the folder route, index/leaf exports must chain it
 * with their exact path. Missing exports are not warned — they are filled.
 */
export function validateRouteWiring(exports: RouteExports, options: ValidateRouteWiringOptions): void {
  const { routeName, indexName, hasPage, hasLayout, namedPages, fileMap, displayPath, folderSegment, warn } = options;

  if (exports.defaultName && exports.defaultName !== routeName) {
    warn?.(
      `${displayPath}route.ts: the default export should reference the folder route \`${routeName}\` — found \`${exports.defaultName}\`. Adjust the wiring, or remove the export and the generator will re-create it.`
    );
  }

  const check = (exportName: string, expected: RouteBinding): void => {
    if (!exports.names.includes(exportName)) return;
    const declaration = exports.declarations.find((d) => d.name === exportName);
    const binding = declaration?.binding;
    const found = `\`${declaration!.initText!}\``;
    const wired =
      binding?.object === expected.object && binding.method === expected.method && binding.path === expected.path;

    if (!wired) {
      warn?.(
        `${displayPath}route.ts: ${exportName} is wired as ${found} — it should chain the folder route: \`${expected.object}.${expected.method}('${expected.path}')\`. Adjust the wiring, or remove the export and the generator will re-create it.`
      );
    }
  };

  if (hasPage && hasLayout) {
    check(indexName, { object: routeName, method: 'route', path: '/' });
  }

  for (const namedPage of namedPages) {
    const name = namedPageName(namedPage, fileMap);
    check(deriveNamedRouteName(folderSegment, name), {
      object: routeName,
      method: 'route',
      path: `/${deriveSegment(name)}`,
    });
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
    defaultName?.endsWith('Route') && !defaultName.endsWith('IndexRoute')
      ? defaultName
      : names.find((n) => n.endsWith('Route') && !n.endsWith('IndexRoute'));
  const indexName = names.find((n) => n.endsWith('IndexRoute'));

  return { routeName, indexName };
}

/** The export names this folder's contract owns: the folder route, index, and leaf routes. */
function getContractExportNames(options: {
  routeName: string;
  indexName: string;
  hasPage: boolean;
  hasLayout: boolean;
  namedPages: Set<string>;
  fileMap: FileMap;
  folderSegment: string;
}): string[] {
  const { routeName, indexName, hasPage, hasLayout, namedPages, fileMap, folderSegment } = options;
  const names = [routeName];
  if (hasPage && hasLayout) names.push(indexName);
  for (const namedPage of namedPages) {
    names.push(deriveNamedRouteName(folderSegment, namedPageName(namedPage, fileMap)));
  }
  return names;
}
