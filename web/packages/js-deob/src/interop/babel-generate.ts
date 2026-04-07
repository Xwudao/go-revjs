import type { GeneratorOptions } from '@babel/generator'
import * as babelGenerateModule from '@babel/generator'

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

const babelGenerate = unwrapCallable<typeof import('@babel/generator').default>(
  babelGenerateModule as unknown as typeof import('@babel/generator').default,
)

export default babelGenerate

export type { GeneratorOptions }
