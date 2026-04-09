import CryptoJS from 'crypto-js'

export type PipelineFnId =
  // Line operations
  | 'removeDuplicateLines'
  | 'removeEmptyLines'
  | 'trimLines'
  | 'addEmptyLinesBetween'
  | 'sortLinesAZ'
  | 'sortLinesZA'
  | 'reverseLines'
  | 'shuffleLines'
  | 'addLineNumbers'
  | 'removeLineNumbers'
  | 'quoteLines'
  | 'joinLinesComma'
  | 'joinLinesNewline'
  | 'splitByComma'
  // Case transformations
  | 'uppercase'
  | 'lowercase'
  | 'titleCase'
  | 'camelCase'
  | 'pascalCase'
  | 'kebabCase'
  | 'snakeCase'
  | 'invertCase'
  // Extract
  | 'extractEmails'
  | 'extractUrls'
  | 'extractNumbers'
  | 'extractChinese'
  | 'extractIPs'
  // Encode / Decode
  | 'base64Encode'
  | 'base64Decode'
  | 'urlEncode'
  | 'urlDecode'
  | 'htmlEncode'
  | 'htmlDecode'
  | 'hexEncode'
  | 'hexDecode'
  | 'unicodeEscape'
  | 'unicodeUnescape'
  // Clean / Replace
  | 'trimText'
  | 'removeAllSpaces'
  | 'collapseSpaces'
  | 'joinLines'
  | 'removeHtmlTags'
  | 'reverseString'
  | 'removeNonAscii'
  | 'removePunctuation'
  // Hash (terminal — produces hex digest)
  | 'md5'
  | 'sha1'
  | 'sha256'
  | 'sha512'

export interface PipelineRequest {
  text: string
  pipeline: PipelineFnId[]
}

export type PipelineResponse =
  | { type: 'done'; result: string }
  | { type: 'error'; message: string; failedStep: PipelineFnId }

// ── Implementations ──────────────────────────────────────────────────────────

function b64Encode(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function b64Decode(s: string): string {
  const binary = atob(s.trim())
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function htmlEncode(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function htmlDecode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function hexEncode(s: string): string {
  return Array.from(new TextEncoder().encode(s))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexDecode(s: string): string {
  const hex = s.replace(/\s/g, '')
  if (hex.length % 2 !== 0) throw new Error('Hex 长度必须为偶数')
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return new TextDecoder().decode(bytes)
}

function unicodeEsc(s: string): string {
  return Array.from(s)
    .map((c) => {
      const cp = c.codePointAt(0)!
      if (cp > 0xffff) return `\\u{${cp.toString(16).toUpperCase()}}`
      return cp > 127 || cp < 32
        ? `\\u${cp.toString(16).toUpperCase().padStart(4, '0')}`
        : c
    })
    .join('')
}

function unicodeUnesc(s: string): string {
  return s
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function toCamelCase(s: string): string {
  return s
    .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toLowerCase())
}

function toPascalCase(s: string): string {
  const camel = toCamelCase(s)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

function toSnakeCase(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()
}

function toKebabCase(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase()
}

function invertCase(s: string): string {
  return Array.from(s)
    .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
    .join('')
}

function shuffle(s: string): string {
  const lines = s.split('\n')
  for (let i = lines.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[lines[i], lines[j]] = [lines[j], lines[i]]
  }
  return lines.join('\n')
}

const fnMap: Record<PipelineFnId, (text: string) => string> = {
  // Line operations
  removeDuplicateLines: (s) => [...new Set(s.split('\n'))].join('\n'),
  removeEmptyLines: (s) =>
    s
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .join('\n'),
  trimLines: (s) =>
    s
      .split('\n')
      .map((l) => l.trim())
      .join('\n'),
  addEmptyLinesBetween: (s) =>
    s
      .split('\n')
      .flatMap((l, i, arr) => (i < arr.length - 1 ? [l, ''] : [l]))
      .join('\n'),
  sortLinesAZ: (s) =>
    s
      .split('\n')
      .sort((a, b) => a.localeCompare(b))
      .join('\n'),
  sortLinesZA: (s) =>
    s
      .split('\n')
      .sort((a, b) => b.localeCompare(a))
      .join('\n'),
  reverseLines: (s) => s.split('\n').reverse().join('\n'),
  shuffleLines: shuffle,
  addLineNumbers: (s) =>
    s
      .split('\n')
      .map((l, i) => `${i + 1}. ${l}`)
      .join('\n'),
  removeLineNumbers: (s) => s.replace(/^\d+\.\s*/gm, ''),
  quoteLines: (s) =>
    s
      .split('\n')
      .map((l) => `"${l.replace(/"/g, '\\"')}"`)
      .join('\n'),
  joinLinesComma: (s) =>
    s
      .split('\n')
      .filter((l) => l.trim())
      .join(', '),
  joinLinesNewline: (s) => s.split('\n').join('\n'),
  splitByComma: (s) =>
    s
      .split(',')
      .map((p) => p.trim())
      .join('\n'),

  // Case
  uppercase: (s) => s.toUpperCase(),
  lowercase: (s) => s.toLowerCase(),
  titleCase: toTitleCase,
  camelCase: toCamelCase,
  pascalCase: toPascalCase,
  kebabCase: toKebabCase,
  snakeCase: toSnakeCase,
  invertCase,

  // Extract
  extractEmails: (s) => {
    const matches = s.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g) ?? []
    return [...new Set(matches)].join('\n')
  },
  extractUrls: (s) => {
    const matches =
      s.match(
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/g,
      ) ?? []
    return [...new Set(matches)].join('\n')
  },
  extractNumbers: (s) => {
    const matches = s.match(/-?\d+(\.\d+)?/g) ?? []
    return matches.join('\n')
  },
  extractChinese: (s) => {
    const matches = s.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+/g) ?? []
    return matches.join('\n')
  },
  extractIPs: (s) => {
    const matches = s.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? []
    return [...new Set(matches)].join('\n')
  },

  // Encode / Decode
  base64Encode: b64Encode,
  base64Decode: b64Decode,
  urlEncode: encodeURIComponent,
  urlDecode: (s) => decodeURIComponent(s),
  htmlEncode,
  htmlDecode,
  hexEncode,
  hexDecode,
  unicodeEscape: unicodeEsc,
  unicodeUnescape: unicodeUnesc,

  // Clean
  trimText: (s) => s.trim(),
  removeAllSpaces: (s) => s.replace(/\s/g, ''),
  collapseSpaces: (s) => s.replace(/[ \t]+/g, ' ').trim(),
  joinLines: (s) => s.replace(/[\r\n]+/g, ' ').trim(),
  removeHtmlTags: (s) => s.replace(/<[^>]*>/g, ''),
  reverseString: (s) => Array.from(s).reverse().join(''),
  removeNonAscii: (s) => s.replace(/[^\x00-\x7F]/g, ''),
  removePunctuation: (s) => s.replace(/[^\p{L}\p{N}\s]/gu, ''),

  // Hash
  md5: (s) => CryptoJS.MD5(s).toString(),
  sha1: (s) => CryptoJS.SHA1(s).toString(),
  sha256: (s) => CryptoJS.SHA256(s).toString(),
  sha512: (s) => CryptoJS.SHA512(s).toString(),
}

// ── Worker message handler ───────────────────────────────────────────────────

self.onmessage = (event: MessageEvent<PipelineRequest>) => {
  const { text, pipeline } = event.data
  let current = text

  for (const fnId of pipeline) {
    const fn = fnMap[fnId]
    if (!fn) {
      self.postMessage({
        type: 'error',
        message: `未知函数 ID: ${fnId}`,
        failedStep: fnId,
      } satisfies PipelineResponse)
      return
    }
    try {
      current = fn(current)
    } catch (e) {
      self.postMessage({
        type: 'error',
        message: e instanceof Error ? e.message : String(e),
        failedStep: fnId,
      } satisfies PipelineResponse)
      return
    }
  }

  self.postMessage({ type: 'done', result: current } satisfies PipelineResponse)
}
