export enum ArrayMutations {
  PUSH = 'push',
  POP = 'pop',
  SHIFT = 'shift',
  UNSHIFT = 'unshift',
  SPLICE = 'splice',
  REVERSE = 'reverse',
  SORT = 'sort',
  FILL = 'fill',
  COPY_WITHIN = 'copyWithin',
}

export enum ObjectMutations {
  SET = 'set',
  DELETE = 'delete',
}

export enum BatchMutations {
  ASSIGN = 'assign',
  REMOVE = 'remove',
  CLEAR = 'clear',
}

export enum MapMutations {
  SET = 'map:set',
  DELETE = 'map:delete',
  CLEAR = 'map:clear',
}

export enum SetMutations {
  ADD = 'set:add',
  DELETE = 'set:delete',
  CLEAR = 'set:clear',
}

export enum Linkables {
  OBJECT = 'object',
  ARRAY = 'array',
  SET = 'set',
  MAP = 'map',
}

export enum OBSERVER_KEYS {
  ARRAY_MUTATIONS = 'array_mutations',
  COLLECTION_MUTATIONS = 'collection_mutations',
}
