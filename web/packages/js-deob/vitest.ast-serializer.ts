import type * as t from '@babel/types'
import { generate } from './src/ast-utils'

function normalizeGeneratedCode(code: string) {
  if (code.length >= 2 && code.startsWith('"') && code.endsWith('"')) {
    try {
      return JSON.parse(code) as string
    }
    catch {
      return code.slice(1, -1)
    }
  }

  return code
}

function isBabelNode(value: unknown): value is t.Node {
  return Boolean(
    value
    && typeof value === 'object'
    && 'type' in value
    && typeof (value as { type?: unknown }).type === 'string',
  )
}

export default {
  serialize(value: unknown) {
    return normalizeGeneratedCode(generate(value as t.Node))
  },
  test(value: unknown) {
    return isBabelNode(value)
  },
}