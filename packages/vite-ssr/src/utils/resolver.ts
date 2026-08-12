import path from 'node:path';

export class EntryResolver {
  public baseName: string;
  public pathName: string;
  public pageName: string;

  public get route() {
    if (this.isRoot) return 'rootRoute';
    return `${this.pathName}Route`;
  }

  public get index() {
    if (this.isRoot) return 'indexRoute';
    return `${this.pathName}IndexRoute`;
  }

  public get named() {
    if (this.isRoot) return `root${this.pageName}Route`;
    return `${this.pathName}${this.pageName}Route`;
  }

  constructor(
    file: string,
    public isRoot: boolean
  ) {
    const name = normalizeName(file);
    this.pathName = path.basename(path.dirname(file));
    this.baseName = path.basename(file);
    this.pageName = toCamelCase(name.endsWith('.page') ? name.replace('.page', '') : '', true);
  }
}

function normalizeName(file: string) {
  const ext = path.extname(file);
  return path.basename(file).replace(new RegExp(`${ext}$`), '');
}

function toCamelCase(str: string, all = false) {
  return str
    .split(/[\s\-_]/g)
    .map((w, i) => {
      if (all || i >= 1) return capitalize(w);
      return w;
    })
    .join('');
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
