import { createHash } from 'node:crypto';

export const hashBlock = (block: string) => createHash('sha1').update(block).digest('hex');
