import { importSpecifier, MARKER_DEFAULT, MARKER_VARIABLE_NAME } from './mapper.js';

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
 * Renders the initial route.ts file contents from scratch with proper import markers,
 * route declarations, optional metadata chaining, and default export.
 */
export function renderRouteFile(options: RouteScaffoldOptions): string {
  const lines: string[] = [];

  if (options.parentRouteName && options.parentRouteFile) {
    let segment = options.routePath;
    const isTopLevel = options.isTopLevel;

    if (isTopLevel) {
      segment = segment.replace(/\(|\)/g, '');
      const routerImport = importSpecifier(options.routeFilePath, options.routerFile);
      for (const metaImport of options.metaImports) {
        lines.push(`import ${metaImport.varName} from '${metaImport.source}';`);
      }
      lines.push(`import router from '${routerImport}';`);
      lines.push('');
      lines.push(MARKER_VARIABLE_NAME);
      lines.push(`export const ${options.routeName} = router.add('/${segment}')${options.routeModifier || ''};`);
    } else {
      const parentName = options.parentRouteName;
      for (const metaImport of options.metaImports) {
        lines.push(`import ${metaImport.varName} from '${metaImport.source}';`);
      }
      lines.push(`import ${parentName} from '${importSpecifier(options.routeFilePath, options.parentRouteFile)}';`);
      lines.push('');
      lines.push(MARKER_VARIABLE_NAME);
      lines.push(
        `export const ${options.routeName} = ${parentName}.route('/${segment}')${options.routeModifier || ''};`
      );
    }

    if (options.hasPage && options.hasLayout && options.indexName) {
      lines.push('');
      lines.push(MARKER_VARIABLE_NAME);
      lines.push(`export const ${options.indexName} = ${options.routeName}.route('/')${options.indexModifier || ''};`);
    }

    for (const named of options.namedPages) {
      const modifier = named.metaVarName ? `.meta(${named.metaVarName})` : '';
      lines.push('');
      lines.push(MARKER_VARIABLE_NAME);
      lines.push(`export const ${named.routeName} = ${options.routeName}.route('/${named.segment}')${modifier};`);
    }

    lines.push('');
    lines.push(MARKER_DEFAULT);
    lines.push(`export default ${options.routeName};`);
  } else {
    const routerImport = importSpecifier(options.routeFilePath, options.routerFile);
    for (const metaImport of options.metaImports) {
      lines.push(`import ${metaImport.varName} from '${metaImport.source}';`);
    }
    lines.push(`import router from '${routerImport}';`);
    lines.push('');
    lines.push(MARKER_VARIABLE_NAME);
    lines.push(`export const rootRoute = router.route()${options.routeModifier || ''};`);

    if (options.hasPage && options.hasLayout && options.indexName) {
      lines.push('');
      lines.push(MARKER_VARIABLE_NAME);
      lines.push(`export const indexRoute = rootRoute.route('/')${options.indexModifier || ''};`);
    }

    for (const named of options.namedPages) {
      const modifier = named.metaVarName ? `.meta(${named.metaVarName})` : '';
      lines.push('');
      lines.push(MARKER_VARIABLE_NAME);
      lines.push(`export const ${named.routeName} = rootRoute.route('/${named.segment}')${modifier};`);
    }

    lines.push('');
    lines.push(MARKER_DEFAULT);
    lines.push(`export default rootRoute;`);
  }

  return `${lines.join('\n')}\n`;
}
