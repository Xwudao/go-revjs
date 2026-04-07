import { useEffect, useMemo, useState } from 'react'
import CryptoJS from 'crypto-js'
import { type AppSelectOption } from '@/components/ui/app-select'

// ── Types ────────────────────────────────────────────────────────────────────

export type CryptoAlgorithm = 'AES' | 'DES' | 'TripleDES' | 'Rabbit' | 'RC4' | 'RC4Drop'
export type CryptoDirection = 'encrypt' | 'decrypt'
export type TextEncoding = 'Utf8' | 'Hex' | 'Base64'
export type BlockMode = 'CBC' | 'CFB' | 'CTR' | 'CTRGladman' | 'ECB' | 'OFB'
export type PaddingMode =
  | 'Pkcs7'
  | 'AnsiX923'
  | 'Iso10126'
  | 'Iso97971'
  | 'ZeroPadding'
  | 'NoPadding'

export interface FormState {
  algorithm: CryptoAlgorithm
  direction: CryptoDirection
  mode: BlockMode
  padding: PaddingMode
  key: string
  iv: string
  passphrase: string
  usePassphrase: boolean
  dataEncoding: TextEncoding
  secretEncoding: TextEncoding
  cipherEncoding: 'Base64' | 'Hex'
  inputText: string
}

export interface ResultMeta {
  algorithm: CryptoAlgorithm
  direction: CryptoDirection
  mode: BlockMode
  padding: PaddingMode
  inputLength: number
  outputLength: number
}

// ── Constants & options ──────────────────────────────────────────────────────

export const storageKey = 'revjs:crypto-lab:state'

export const defaultFormState: FormState = {
  algorithm: 'AES',
  direction: 'encrypt',
  mode: 'CBC',
  padding: 'Pkcs7',
  key: '0123456789abcdef',
  iv: 'abcdef9876543210',
  passphrase: '',
  usePassphrase: false,
  dataEncoding: 'Utf8',
  secretEncoding: 'Utf8',
  cipherEncoding: 'Base64',
  inputText: 'revjs crypto online test',
}

export const algorithmOptions: AppSelectOption<CryptoAlgorithm>[] = [
  { value: 'AES', label: 'AES', description: '最常用，支持完整分组模式。' },
  { value: 'DES', label: 'DES', description: '兼容传统场景，适合联调老系统。' },
  { value: 'TripleDES', label: 'TripleDES', description: '3DES，常见于旧接口或金融侧。' },
  { value: 'Rabbit', label: 'Rabbit', description: '流密码，快速验证前端样本。' },
  { value: 'RC4', label: 'RC4', description: '流密码，适合存量协议比对。' },
  { value: 'RC4Drop', label: 'RC4Drop', description: '带 drop 参数的 RC4 变体。' },
]

export const directionOptions: AppSelectOption<CryptoDirection>[] = [
  { value: 'encrypt', label: '加密', description: '明文 -> 密文' },
  { value: 'decrypt', label: '解密', description: '密文 -> 明文' },
]

export const blockModeOptions: AppSelectOption<BlockMode>[] = [
  { value: 'CBC', label: 'CBC', description: '默认常用模式，需要 IV。' },
  { value: 'CFB', label: 'CFB', description: '流式反馈模式。' },
  { value: 'CTR', label: 'CTR', description: '计数器模式。' },
  { value: 'CTRGladman', label: 'CTRGladman', description: 'CryptoJS 兼容计数器模式。' },
  { value: 'ECB', label: 'ECB', description: '不使用 IV，仅限兼容测试。' },
  { value: 'OFB', label: 'OFB', description: '输出反馈模式。' },
]

export const paddingOptions: AppSelectOption<PaddingMode>[] = [
  { value: 'Pkcs7', label: 'Pkcs7', description: '最常见默认填充。' },
  { value: 'AnsiX923', label: 'AnsiX923', description: '末尾补长度。' },
  { value: 'Iso10126', label: 'Iso10126', description: '随机填充。' },
  { value: 'Iso97971', label: 'Iso97971', description: 'ISO 9797-1。' },
  { value: 'ZeroPadding', label: 'ZeroPadding', description: '补零，常见于旧系统。' },
  { value: 'NoPadding', label: 'NoPadding', description: '无填充，需自行对齐块长度。' },
]

export const inputEncodingOptions: AppSelectOption<TextEncoding>[] = [
  { value: 'Utf8', label: 'UTF-8', description: '普通文本输入。' },
  { value: 'Hex', label: 'Hex', description: '十六进制字节串。' },
  { value: 'Base64', label: 'Base64', description: 'Base64 字节串。' },
]

export const cipherEncodingOptions: AppSelectOption<'Base64' | 'Hex'>[] = [
  { value: 'Base64', label: 'Base64', description: '接口最常见输出。' },
  { value: 'Hex', label: 'Hex', description: '适合脚本联调和逐字节核对。' },
]

// ── Pure helpers ─────────────────────────────────────────────────────────────

export function requiresIv(algorithm: CryptoAlgorithm, mode: BlockMode) {
  if (algorithm === 'Rabbit' || algorithm === 'RC4' || algorithm === 'RC4Drop') {
    return false
  }
  return mode !== 'ECB'
}

export function supportsBlockOptions(algorithm: CryptoAlgorithm) {
  return algorithm === 'AES' || algorithm === 'DES' || algorithm === 'TripleDES'
}

export function parseWordArray(value: string, encoding: TextEncoding) {
  if (!value) return CryptoJS.lib.WordArray.create()
  switch (encoding) {
    case 'Hex':
      return CryptoJS.enc.Hex.parse(value)
    case 'Base64':
      return CryptoJS.enc.Base64.parse(value)
    case 'Utf8':
      return CryptoJS.enc.Utf8.parse(value)
  }
}

export function stringifyWordArray(wordArray: CryptoJS.lib.WordArray, encoding: TextEncoding) {
  switch (encoding) {
    case 'Hex':
      return CryptoJS.enc.Hex.stringify(wordArray)
    case 'Base64':
      return CryptoJS.enc.Base64.stringify(wordArray)
    case 'Utf8':
      return CryptoJS.enc.Utf8.stringify(wordArray)
  }
}

function getCipher(algorithm: CryptoAlgorithm) {
  switch (algorithm) {
    case 'AES':
      return CryptoJS.AES
    case 'DES':
      return CryptoJS.DES
    case 'TripleDES':
      return CryptoJS.TripleDES
    case 'Rabbit':
      return CryptoJS.Rabbit
    case 'RC4':
      return CryptoJS.RC4
    case 'RC4Drop':
      return CryptoJS.RC4Drop
  }
}

function getMode(mode: BlockMode) {
  return CryptoJS.mode[mode]
}

function getPadding(padding: PaddingMode) {
  return CryptoJS.pad[padding]
}

function getKeyHint(algorithm: CryptoAlgorithm) {
  switch (algorithm) {
    case 'AES':
      return '常见为 16 / 24 / 32 字节，按当前输入编码解析。'
    case 'DES':
      return '常见为 8 字节。'
    case 'TripleDES':
      return '常见为 24 字节。'
    case 'Rabbit':
    case 'RC4':
    case 'RC4Drop':
      return '流密码场景可直接填 key，或切换口令模式。'
  }
}

function decodeFormattedCiphertext(value: string, encoding: 'Base64' | 'Hex') {
  if (encoding === 'Base64') {
    return value.trim()
  }
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(value.trim()))
}

function buildOptions(state: FormState) {
  if (state.usePassphrase) {
    return supportsBlockOptions(state.algorithm)
      ? {
          mode: getMode(state.mode),
          padding: getPadding(state.padding),
        }
      : undefined
  }

  const options: Record<string, unknown> = {}

  if (supportsBlockOptions(state.algorithm)) {
    options.mode = getMode(state.mode)
    options.padding = getPadding(state.padding)
  }

  if (requiresIv(state.algorithm, state.mode) && state.iv) {
    options.iv = parseWordArray(state.iv, state.secretEncoding)
  }

  return options
}

function runCrypto(state: FormState) {
  const cipher = getCipher(state.algorithm)

  if (state.usePassphrase) {
    const secret = state.passphrase.trim()
    if (!secret) throw new Error('口令模式下请填写 passphrase。')

    if (state.direction === 'encrypt') {
      const payload = parseWordArray(state.inputText, state.dataEncoding)
      const encrypted = cipher.encrypt(payload, secret, buildOptions(state))
      if (state.cipherEncoding === 'Base64') {
        return encrypted.toString()
      }
      return stringifyWordArray(CryptoJS.enc.Base64.parse(encrypted.toString()), 'Hex')
    }

    const decrypted = cipher.decrypt(
      decodeFormattedCiphertext(state.inputText, state.cipherEncoding),
      secret,
      buildOptions(state),
    )
    return decrypted
  }

  const key = state.key.trim()
  if (!key) throw new Error('请填写 key。')
  if (requiresIv(state.algorithm, state.mode) && !state.iv.trim()) {
    throw new Error('当前模式需要 IV，请补充。')
  }

  const parsedKey = parseWordArray(key, state.secretEncoding)
  const options = buildOptions(state)

  if (state.direction === 'encrypt') {
    const payload = parseWordArray(state.inputText, state.dataEncoding)
    const encrypted = cipher.encrypt(payload, parsedKey, options)
    return stringifyWordArray(encrypted.ciphertext, state.cipherEncoding)
  }

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: parseWordArray(state.inputText.trim(), state.cipherEncoding),
  })
  return cipher.decrypt(cipherParams, parsedKey, options)
}

function readStoredState(): FormState {
  if (typeof window === 'undefined') return defaultFormState
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return defaultFormState
  try {
    return { ...defaultFormState, ...(JSON.parse(raw) as Partial<FormState>) }
  } catch {
    return defaultFormState
  }
}

// ── Code generation ──────────────────────────────────────────────────────────

export function generateCode(state: FormState): string {
  const { algorithm, direction, mode, padding, key, iv, passphrase, usePassphrase,
    dataEncoding, secretEncoding, cipherEncoding, inputText } = state

  const lines: string[] = ["import CryptoJS from 'crypto-js';", '']

  const needsIv = requiresIv(algorithm, mode)
  const hasBlockOpts = supportsBlockOptions(algorithm)

  function pushOpts(withIv: boolean) {
    const opts: string[] = []
    if (hasBlockOpts) {
      opts.push(`  mode: CryptoJS.mode.${mode},`)
      opts.push(`  padding: CryptoJS.pad.${padding},`)
    }
    if (withIv) opts.push('  iv,')
    return opts
  }

  if (usePassphrase) {
    const secret = JSON.stringify(passphrase.trim() || '<passphrase>')
    const opts = pushOpts(false)

    if (direction === 'encrypt') {
      lines.push(`const encrypted = CryptoJS.${algorithm}.encrypt(`)
      lines.push(`  CryptoJS.enc.${dataEncoding}.parse(${JSON.stringify(inputText)}),`)
      if (opts.length) {
        lines.push(`  ${secret},`)
        lines.push('  {')
        opts.forEach((o) => lines.push('  ' + o))
        lines.push('  }')
      } else {
        lines.push(`  ${secret}`)
      }
      lines.push(');')
      lines.push('')
      lines.push('// CryptoJS 口令模式输出为 Base64 envelope 格式')
      lines.push('console.log(encrypted.toString());')
    } else {
      const opts2 = pushOpts(false)
      lines.push(`const decrypted = CryptoJS.${algorithm}.decrypt(`)
      lines.push(`  ${JSON.stringify(inputText.trim())}, // ${cipherEncoding} 密文`)
      if (opts2.length) {
        lines.push(`  ${secret},`)
        lines.push('  {')
        opts2.forEach((o) => lines.push('  ' + o))
        lines.push('  }')
      } else {
        lines.push(`  ${secret}`)
      }
      lines.push(');')
      lines.push('')
      lines.push(`console.log(decrypted.toString(CryptoJS.enc.${dataEncoding}));`)
    }
  } else {
    lines.push(`const key = CryptoJS.enc.${secretEncoding}.parse(${JSON.stringify(key.trim() || '<key>')});`)
    if (needsIv) {
      lines.push(`const iv = CryptoJS.enc.${secretEncoding}.parse(${JSON.stringify(iv.trim() || '<iv>')});`)
    }
    lines.push('')

    const opts = pushOpts(needsIv)

    if (direction === 'encrypt') {
      lines.push(`const payload = CryptoJS.enc.${dataEncoding}.parse(${JSON.stringify(inputText)});`)
      lines.push('')
      if (opts.length) {
        lines.push(`const encrypted = CryptoJS.${algorithm}.encrypt(payload, key, {`)
        opts.forEach((o) => lines.push(o))
        lines.push('});')
      } else {
        lines.push(`const encrypted = CryptoJS.${algorithm}.encrypt(payload, key);`)
      }
      lines.push('')
      if (cipherEncoding === 'Base64') {
        lines.push('console.log(encrypted.ciphertext.toString(CryptoJS.enc.Base64));')
      } else {
        lines.push('console.log(encrypted.ciphertext.toString()); // Hex (CryptoJS default)')
      }
    } else {
      lines.push('const cipherParams = CryptoJS.lib.CipherParams.create({')
      lines.push(`  ciphertext: CryptoJS.enc.${cipherEncoding}.parse(${JSON.stringify(inputText.trim())}),`)
      lines.push('});')
      lines.push('')
      if (opts.length) {
        lines.push(`const decrypted = CryptoJS.${algorithm}.decrypt(cipherParams, key, {`)
        opts.forEach((o) => lines.push(o))
        lines.push('});')
      } else {
        lines.push(`const decrypted = CryptoJS.${algorithm}.decrypt(cipherParams, key);`)
      }
      lines.push('')
      lines.push(`console.log(decrypted.toString(CryptoJS.enc.${dataEncoding}));`)
    }
  }

  return lines.join('\n')
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCryptoLab() {
  const [form, setForm] = useState<FormState>(readStoredState)
  const [result, setResult] = useState('')
  const [resultMeta, setResultMeta] = useState<ResultMeta | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle')

  const usesBlockOptions = supportsBlockOptions(form.algorithm)
  const showIvField = !form.usePassphrase && requiresIv(form.algorithm, form.mode)
  const keyHint = useMemo(() => getKeyHint(form.algorithm), [form.algorithm])
  const resultEncodingLabel =
    form.direction === 'encrypt' ? form.cipherEncoding : form.dataEncoding

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(form))
  }, [form])

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = window.setTimeout(() => setCopyState('idle'), 1600)
    return () => window.clearTimeout(timer)
  }, [copyState])

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function handleAlgorithmChange(nextAlgorithm: CryptoAlgorithm) {
    updateForm({
      algorithm: nextAlgorithm,
      mode: nextAlgorithm === 'DES' ? 'CBC' : form.mode,
    })
    setErrorMessage('')
  }

  function swapInputOutput() {
    if (!result) return
    setForm((current) => ({
      ...current,
      direction: current.direction === 'encrypt' ? 'decrypt' : 'encrypt',
      inputText: result,
    }))
    setResult('')
    setResultMeta(null)
    setErrorMessage('')
  }

  function clearAll() {
    setForm(defaultFormState)
    setResult('')
    setResultMeta(null)
    setErrorMessage('')
    window.localStorage.removeItem(storageKey)
  }

  async function copyResult() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setCopyState('done')
    } catch {
      setCopyState('failed')
    }
  }

  function executeCrypto() {
    try {
      const cryptoResult = runCrypto(form)
      const nextResult =
        typeof cryptoResult === 'string'
          ? cryptoResult
          : stringifyWordArray(cryptoResult, form.dataEncoding)

      if (!nextResult) {
        throw new Error('结果为空，请检查 key、iv、编码或填充方式是否匹配。')
      }

      setResult(nextResult)
      setResultMeta({
        algorithm: form.algorithm,
        direction: form.direction,
        mode: form.mode,
        padding: form.padding,
        inputLength: form.inputText.length,
        outputLength: nextResult.length,
      })
      setErrorMessage('')
    } catch (error) {
      setResult('')
      setResultMeta(null)
      setErrorMessage(
        error instanceof Error ? error.message : '执行失败，请检查参数组合是否正确。',
      )
    }
  }

  return {
    form,
    result,
    resultMeta,
    errorMessage,
    copyState,
    usesBlockOptions,
    showIvField,
    keyHint,
    resultEncodingLabel,
    updateForm,
    handleAlgorithmChange,
    swapInputOutput,
    clearAll,
    copyResult,
    executeCrypto,
  }
}
