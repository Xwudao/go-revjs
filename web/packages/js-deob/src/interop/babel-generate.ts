import type { GeneratorOptions } from '@babel/generator'
import * as babelGenerateModule from '@babel/generator'

function unwrapCallable<T>(value: T): T {
  let current = value as T | { default?: T }

  while (current && typeof current !== 'function' && 'default' in current) {
    current = current.default as T | { default?: T }
  }

  return current as T
}

const babelGenerate = unwrapCallable<typeof import('@babel/generator').default>(
  babelGenerateModule as unknown as typeof import('@babel/generator').default,
)

export default babelGenerate

export type { GeneratorOptions }
