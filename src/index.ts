import { logger } from './utils/index.js';

export * from './stream/index.js';
export * from './core/index.js';
export * from './hook/index.js';
export {
  Schema,
  SchemaType,
  SchemaPresets,
  COMMON_SCHEMA_TYPES,
  SERIALIZABLE_SCHEMA_TYPES,
  validate as validateSchema,
  satisfy as satisfySchema,
} from './schema/index.js';

export { logger };

export function debug(trace?: boolean) {
  logger.setDebug(true, trace);
}
