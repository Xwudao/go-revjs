import type { Options } from '@revjs/js-deob'
import debug from 'debug'
import { deob } from '@revjs/js-deob'

interface WorkerRequest {
  code: string
  options: Options
}

const originalDebugLog = debug.log

function formatLogValue(value: unknown) {
  if (value instanceof Error) {
    return value.stack || value.message
  }

  if (value instanceof Map) {
    return JSON.stringify(Object.fromEntries(value.entries()), null, 2)
  }

  if (value instanceof Set) {
    return JSON.stringify(Array.from(value.values()), null, 2)
  }

  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  return String(value)
}

function normalizeLogArgs(args: unknown[]) {
  return args
    .map((value) => {
      if (typeof value === 'string') {
        const cleaned = value.replace(/%c/g, '').trim()

        if (!cleaned || /^color:/i.test(cleaned)) {
          return ''
        }

        return cleaned
      }

      return formatLogValue(value)
    })
    .filter(Boolean)
}

debug.log = (...args: unknown[]) => {
  originalDebugLog?.(...args)

  self.postMessage({
    type: 'log',
    message: normalizeLogArgs(args).join(' '),
    timestamp: Date.now(),
  })
}

self.addEventListener(
  'message',
  async (event: MessageEvent<WorkerRequest>) => {
    const { code, options } = event.data

    if (!code.trim()) {
      self.postMessage({
        type: 'error',
        message: '请先输入要处理的 JS 代码。',
        timestamp: Date.now(),
      })
      return
    }

    try {
      const startedAt = performance.now()
      const result = await deob(code, options)
      self.postMessage({
        type: 'result',
        code: result.code,
        parseTime: Math.round(performance.now() - startedAt),
      })
    } catch (error) {
      self.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      })
    }
  },
  false,
)
