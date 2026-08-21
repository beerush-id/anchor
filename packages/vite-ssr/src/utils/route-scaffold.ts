import { deriveLocalRouteName, deriveRouterImport, importSpecifier, MARKER_MANAGED } from './mapper.js';

export type MetadataImportDescriptor = {
  varName: string;
  source: string;
};

export type NamedPageDescriptor = {
  name: string;
  segment: string;
  routeName: string;
  metaVarName?: string;
};

export type RouteScaffoldOptions = {
  routeFilePath: string;
  routerFile: string;
  routerImport?: string;
  parentRouteFile?: string;
  parentRouteName?: string;
  routeName: string;
  indexName?: string;
  routePath: string;
  isTopLevel: boolean;
  hasPage: boolean;
  hasLayout: boolean;
  metaImports: MetadataImportDescriptor[];
  routeModifier?: string;
  indexModifier?: string;
  namedPages: NamedPageDescriptor[];
};

/**
 * Renders the initial route.ts file contents from scratch with an enclosed
 * AirLib managed block for route instantiations, user-owned export declarations,
 * and default export.
 */
export function renderRouteFile(options: RouteScaffoldOptions): string {
  const lines: string[] = [];
  const managedLines: string[] = [];
  const exportLines: string[] = [];

  for (const metaImport of options.metaImports) {
    lines.push(`import ${metaImport.varName} from '${metaImport.source}';`);
  }

  if (options.parentRouteName && options.parentRouteFile) {
    let segment = options.routePath;
    const isTopLevel = options.isTopLevel;

    if (isTopLevel) {
      segment = segment.replace(/\(|\)/g, '');
      const routerImport = options.routerImport ?? deriveRouterImport();
      lines.push(`import router from '${routerImport}';`);
      managedLines.push(`const route = router.add('/${segment}')${options.routeModifier || ''};`);
    } else {
      lines.push(`import parentRoute from '${importSpecifier(options.routeFilePath, options.parentRouteFile)}';`);
      managedLines.push(`const route = parentRoute.route('/${segment}')${options.routeModifier || ''};`);
    }
  } else {
    const routerImport = options.routerImport ?? deriveRouterImport();
    lines.push(`import router from '${routerImport}';`);
    managedLines.push(`const route = router.route()${options.routeModifier || ''};`);
  }

  exportLines.push(`export const ${options.routeName} = route;`);

  if (options.hasPage && options.hasLayout && options.indexName) {
    managedLines.push(`const indexRoute = route.route('/')${options.indexModifier || ''};`);
    exportLines.push(`export const ${options.indexName} = indexRoute;`);
  }

  for (const named of options.namedPages) {
    const localName = deriveLocalRouteName(named.name);
    const modifier = named.metaVarName ? `.meta(${named.metaVarName})` : '';
    managedLines.push(`const ${localName} = route.route('/${named.segment}')${modifier};`);
    exportLines.push(`export const ${named.routeName} = ${localName};`);
  }

  lines.push('');
  lines.push(MARKER_MANAGED);
  lines.push(...managedLines);
  lines.push(MARKER_MANAGED);
  lines.push('');
  lines.push(...exportLines);
  lines.push('');
  lines.push(`export default ${options.routeName};`);

  return `${lines.join('\n')}\n`;
}
