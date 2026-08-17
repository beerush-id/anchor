import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { color, taggedLogger } from '../logger.js';
import { canonicalPath, deriveMetaName, deriveNamedMetaName, GENERATED_MARKER } from '../utils/mapper.js';
import { writeIfChanged } from '../utils/sync.js';

const log = taggedLogger('air-metadata');

import { META_STORE } from './metadata.js';

/**
 * Represents a compiled MDX file and its extracted frontmatter metadata.
 * Generates an isolated TypeScript file containing the extracted frontmatter.
 */
export class MarkdownNode extends EventEmitter {
  public generatedFilePath: string;
  public itemPath: string;
  public varName: string;

  /**
   * Initializes a new markdown node.
   *
   * @param absPath Absolute path to the source MDX file.
   * @param pagesDir Absolute path to the pages root directory.
   * @param metadataDir Absolute path to the metadata generation directory.
   */
  constructor(
    public readonly absPath: string,
    pagesDir: string,
    metadataDir: string
  ) {
    super();

    const rel = path.relative(pagesDir, absPath).replace(/\\/g, '/');
    let fileName = path.basename(absPath, '.mdx');
    if (fileName !== 'page') {
      fileName = fileName.replace(/\.page$/, '');
    }
    const relDir = path.dirname(rel);
    const nodeRel = relDir === '.' ? '' : relDir;
    const relPath = nodeRel ? `${nodeRel}/${fileName}` : fileName;
    const folderSegment = nodeRel ? path.basename(nodeRel) : '';

    this.generatedFilePath = path.join(metadataDir, `${relPath}.ts`);

    const isPageOrLayout = fileName === 'page' || fileName === 'layout';
    this.itemPath = (isPageOrLayout ? canonicalPath(nodeRel) : canonicalPath(relPath)).replace(/\(|\)/g, '');
    this.varName = isPageOrLayout ? deriveMetaName(folderSegment) : deriveNamedMetaName(folderSegment, fileName);
  }

  /**
   * Reads the source MDX file, extracts its frontmatter, and generates
   * a TypeScript file exporting the metadata.
   */
  public update() {
    let content = '';

    try {
      content = fs.readFileSync(this.absPath, 'utf-8');
    } catch {
      return;
    }

    const meta = META_STORE.invalidate(this.absPath, content);

    log.verbose(color.event('Parsed frontmatter metadata'), 'for', color.file(this.itemPath));

    const moduleContent = [
      GENERATED_MARKER,
      `export const meta = ${JSON.stringify(meta, null, 2)};`,
      '',
      'export default meta;',
      '',
    ].join('\n');

    if (writeIfChanged(this.generatedFilePath, moduleContent)) {
      log.debug(color.event('Generated metadata'), 'for', color.file(this.itemPath));
      this.emitChange('update');
    }
  }

  /**
   * Removes the generated metadata file and cleans up the node.
   */
  public destroy() {
    try {
      fs.unlinkSync(this.generatedFilePath);
      this.emitChange('update');
    } catch {}
    this.emit('destroy');
    this.removeAllListeners();
  }

  private emitChange(kind: 'update' | 'reload') {
    this.emit('change', this.generatedFilePath, kind);
  }
}
