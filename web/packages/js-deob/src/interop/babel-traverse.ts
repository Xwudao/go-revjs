import type {
  Binding,
  Node,
  NodePath,
  Scope,
  TraverseOptions,
  Visitor,
} from '@babel/traverse'
import * as babelTraverseModule from '@babel/traverse'

function hasDefaultExport<T>(value: T | { default?: T }): value is { default?: T } {
  return typeof value === 'object' && value !== null && 'default' in value
}

function unwrapCallable<T>(value: T): T {
  let current = value as T | { default?: T }

  while (typeof current !== 'function' && hasDefaultExport(current)) {
    current = current.default as T | { default?: T }
  }

  return current as T
}

const traverse = unwrapCallable<typeof import('@babel/traverse').default>(
  babelTraverseModule as unknown as typeof import('@babel/traverse').default,
)

export const visitors = babelTraverseModule.visitors

export default traverse

export type { Binding, Node, NodePath, Scope, TraverseOptions, Visitor }
