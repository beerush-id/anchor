export enum ArrayMutations {
  POP = 'pop',
  SORT = 'sort',
  PUSH = 'push',
  FILL = 'fill',
  SHIFT = 'shift',
  SPLICE = 'splice',
  UNSHIFT = 'unshift',
  REVERSE = 'reverse',
  COPY_WITHIN = 'copyWithin',
}

export enum ObjectMutations {
  SET = 'set',
  DELETE = 'delete',
}

export enum BatchMutations {
  CLEAR = 'clear',
  ASSIGN = 'assign',
  REMOVE = 'remove',
}

export enum MapMutations {
  SET = 'map:set',
  CLEAR = 'map:clear',
  DELETE = 'map:delete',
}

export enum SetMutations {
  ADD = 'set:add',
  CLEAR = 'set:clear',
  DELETE = 'set:delete',
}

export enum Linkables {
  MAP = 'map',
  SET = 'set',
  ARRAY = 'array',
  OBJECT = 'object',
}

export enum OBSERVER_KEYS {
  ARRAY_MUTATIONS = 'array_mutations',
  COLLECTION_MUTATIONS = 'collection_mutations',
}
