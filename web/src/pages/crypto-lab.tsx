import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import CryptoJS from 'crypto-js'
import { AppCheckbox } from '@/components/ui/app-checkbox'
import { AppSelect, type AppSelectOption } from '@/components/ui/app-select'
import { CodeEditor } from '@/components/ui/code-editor'
import classes from './crypto-lab.module.scss'

type CryptoAlgorithm = 'AES' | 'DES' | 'TripleDES' | 'Rabbit' | 'RC4' | 'RC4Drop'

type CryptoDirection = 'encrypt' | 'decrypt'
type TextEncoding = 'Utf8' | 'Hex' | 'Base64'
type BlockMode = 'CBC' | 'CFB' | 'CTR' | 'CTRGladman' | 'ECB' | 'OFB'
type PaddingMode =
  | 'Pkcs7'
  | 'AnsiX923'
  | 'Iso10126'
  | 'Iso97971'
  | 'ZeroPadding'
  | 'NoPadding'

interface FormState {
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

interface ResultMeta {
  algorithm: CryptoAlgorithm
  direction: CryptoDirection
  mode: BlockMode
  padding: PaddingMode
  inputLength: number
  outputLength: number
}

const storageKey = 'revjs:crypto-lab:state'

const algorithmOptions: AppSelectOption<CryptoAlgorithm>[] = [
  { value: 'AES', label: 'AES', description: '最常用，支持完整分组模式。' },
  { value: 'DES', label: 'DES', description: '兼容传统场景，适合联调老系统。' },
  { value: 'TripleDES', label: 'TripleDES', description: '3DES，常见于旧接口或金融侧。' },
  { value: 'Rabbit', label: 'Rabbit', description: '流密码，快速验证前端样本。' },
  { value: 'RC4', label: 'RC4', description: '流密码，适合存量协议比对。' },
  { value: 'RC4Drop', label: 'RC4Drop', description: '带 drop 参数的 RC4 变体。' },
]

const directionOptions: AppSelectOption<CryptoDirection>[] = [
  { value: 'encrypt', label: '加密', description: '明文 -> 密文' },
  { value: 'decrypt', label: '解密', description: '密文 -> 明文' },
]

const blockModeOptions: AppSelectOption<BlockMode>[] = [
  { value: 'CBC', label: 'CBC', description: '默认常用模式，需要 IV。' },
  { value: 'CFB', label: 'CFB', description: '流式反馈模式。' },
  { value: 'CTR', label: 'CTR', description: '计数器模式。' },
  { value: 'CTRGladman', label: 'CTRGladman', description: 'CryptoJS 兼容计数器模式。' },
  { value: 'ECB', label: 'ECB', description: '不使用 IV，仅限兼容测试。' },
  { value: 'OFB', label: 'OFB', description: '输出反馈模式。' },
]

const paddingOptions: AppSelectOption<PaddingMode>[] = [
  { value: 'Pkcs7', label: 'Pkcs7', description: '最常见默认填充。' },
  { value: 'AnsiX923', label: 'AnsiX923', description: '末尾补长度。' },
  { value: 'Iso10126', label: 'Iso10126', description: '随机填充。' },
  { value: 'Iso97971', label: 'Iso97971', description: 'ISO 9797-1。' },
  { value: 'ZeroPadding', label: 'ZeroPadding', description: '补零，常见于旧系统。' },
  { value: 'NoPadding', label: 'NoPadding', description: '无填充，需自行对齐块长度。' },
]

const inputEncodingOptions: AppSelectOption<TextEncoding>[] = [
  { value: 'Utf8', label: 'UTF-8', description: '普通文本输入。' },
  { value: 'Hex', label: 'Hex', description: '十六进制字节串。' },
  { value: 'Base64', label: 'Base64', description: 'Base64 字节串。' },
]

const cipherEncodingOptions: AppSelectOption<'Base64' | 'Hex'>[] = [
  { value: 'Base64', label: 'Base64', description: '接口最常见输出。' },
  { value: 'Hex', label: 'Hex', description: '适合脚本联调和逐字节核对。' },
]

const defaultFormState: FormState = {
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

function readStoredState(): FormState {
  if (typeof window === 'undefined') return defaultFormState

  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return defaultFormState

  try {
    return {
      ...defaultFormState,
      ...(JSON.parse(raw) as Partial<FormState>),
    }
  } catch {
    return defaultFormState
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

function parseWordArray(value: string, encoding: TextEncoding) {
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

function stringifyWordArray(wordArray: CryptoJS.lib.WordArray, encoding: TextEncoding) {
  switch (encoding) {
    case 'Hex':
      return CryptoJS.enc.Hex.stringify(wordArray)
    case 'Base64':
      return CryptoJS.enc.Base64.stringify(wordArray)
    case 'Utf8':
      return CryptoJS.enc.Utf8.stringify(wordArray)
  }
}

function decodeFormattedCiphertext(value: string, encoding: 'Base64' | 'Hex') {
  if (encoding === 'Base64') {
    return value.trim()
  }

  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(value.trim()))
}

function requiresIv(algorithm: CryptoAlgorithm, mode: BlockMode) {
  if (algorithm === 'Rabbit' || algorithm === 'RC4' || algorithm === 'RC4Drop') {
    return false
  }

  return mode !== 'ECB'
}

function supportsBlockOptions(algorithm: CryptoAlgorithm) {
  return algorithm === 'AES' || algorithm === 'DES' || algorithm === 'TripleDES'
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

    if (!secret) {
      throw new Error('口令模式下请填写 passphrase。')
    }

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
  if (!key) {
    throw new Error('请填写 key。')
  }

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

function CryptoLabPage() {
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
    setForm((current) => ({
      ...current,
      ...patch,
    }))
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

  return (
    <main className={clsx(classes.cryptoLabPage)}>
      {/* ── Top toolbar ── */}
      <div className={clsx(classes.cryptoLabPanel, classes.cryptoLabToolbar)}>
        <div className={clsx(classes.cryptoLabToolbarLeft)}>
          <span className={clsx(classes.cryptoLabBrand)}>
            <span className="i-mdi-lock-outline" aria-hidden="true" />
            Crypto Lab
          </span>
          <span className={clsx(classes.cryptoLabStatusBadge)}>
            <span className="i-mdi-shield-check-outline" aria-hidden="true" />
            本地运行
          </span>
        </div>

        <div className={clsx(classes.cryptoLabToolbarActions)}>
          <button
            type="button"
            className={clsx(
              classes.cryptoLabButton,
              classes.cryptoLabButtonPrimary,
            )}
            onClick={executeCrypto}
          >
            <span className="i-mdi-play-circle-outline" aria-hidden="true" />
            {form.direction === 'encrypt' ? '立即加密' : '立即解密'}
          </button>
          <button
            type="button"
            className={clsx(classes.cryptoLabButton)}
            onClick={swapInputOutput}
            disabled={!result}
          >
            <span className="i-mdi-swap-horizontal" aria-hidden="true" />
            结果回填
          </button>
          <button
            type="button"
            className={clsx(classes.cryptoLabButton)}
            onClick={copyResult}
            disabled={!result}
          >
            <span className="i-mdi-content-copy" aria-hidden="true" />
            {copyState === 'done' ? '已复制' : copyState === 'failed' ? '失败' : '复制结果'}
          </button>

          <div className={clsx(classes.cryptoLabDivider)} aria-hidden="true" />

          <button
            type="button"
            className={clsx(classes.cryptoLabButton)}
            onClick={clearAll}
          >
            <span className="i-mdi-refresh" aria-hidden="true" />
            重置
          </button>
        </div>
      </div>

      {/* ── Editors ── */}
      <div className={clsx(classes.cryptoLabEditorsGrid)}>
        <div className={clsx(classes.cryptoLabPanel, classes.cryptoLabSection)}>
          <div className={clsx(classes.cryptoLabEditorHead)}>
            <h2 className={clsx(classes.cryptoLabSectionTitle)}>
              {form.direction === 'encrypt' ? '明文输入' : '密文输入'}
            </h2>
            <span className={clsx(classes.cryptoLabEditorMeta)}>
              编码:{' '}
              {form.direction === 'encrypt' ? form.dataEncoding : form.cipherEncoding}
              {' · '}
              {form.inputText.length} 字符
            </span>
          </div>
          <div className={clsx(classes.cryptoLabEditorWrap)}>
            <CodeEditor
              value={form.inputText}
              onChange={(value) => updateForm({ inputText: value })}
              minHeight="20rem"
            />
          </div>
        </div>

        <div className={clsx(classes.cryptoLabPanel, classes.cryptoLabSection)}>
          <div className={clsx(classes.cryptoLabEditorHead)}>
            <h2 className={clsx(classes.cryptoLabSectionTitle)}>
              {form.direction === 'encrypt' ? '密文结果' : '明文结果'}
            </h2>
            <span className={clsx(classes.cryptoLabEditorMeta)}>
              编码: {resultEncodingLabel}
              {result ? ` · ${result.length} 字符` : ''}
            </span>
          </div>
          {errorMessage ? (
            <div className={clsx(classes.cryptoLabError)}>
              <span className="i-mdi-alert-circle-outline" aria-hidden="true" />
              {errorMessage}
            </div>
          ) : (
            <div className={clsx(classes.cryptoLabNote)}>
              <span className="i-mdi-information-outline" aria-hidden="true" />
              {result ? '执行完成。' : '调好参数后点"立即执行"。'}
            </div>
          )}
          <div className={clsx(classes.cryptoLabEditorWrap)}>
            <CodeEditor value={result} readOnly minHeight="20rem" />
          </div>
        </div>
      </div>

      {/* ── Options + Summary ── */}
      <div className={clsx(classes.cryptoLabBottomRow)}>
        {/* Options */}
        <div
          className={clsx(
            classes.cryptoLabPanel,
            classes.cryptoLabSection,
            classes.cryptoLabOptions,
          )}
        >
          <h2 className={clsx(classes.cryptoLabSectionTitle)}>参数配置</h2>

          <div className={clsx(classes.cryptoLabForm)}>
            <div className={clsx(classes.cryptoLabField)}>
              <span className={clsx(classes.cryptoLabFieldLabel)}>算法</span>
              <AppSelect
                value={form.algorithm}
                options={algorithmOptions}
                onChange={handleAlgorithmChange}
              />
            </div>

            <div className={clsx(classes.cryptoLabField)}>
              <span className={clsx(classes.cryptoLabFieldLabel)}>方向</span>
              <AppSelect
                value={form.direction}
                options={directionOptions}
                onChange={(value) => updateForm({ direction: value })}
              />
            </div>

            <div className={clsx(classes.cryptoLabField)}>
              <span className={clsx(classes.cryptoLabFieldLabel)}>明文编码</span>
              <AppSelect
                value={form.dataEncoding}
                options={inputEncodingOptions}
                onChange={(value) => updateForm({ dataEncoding: value })}
              />
            </div>

            <div className={clsx(classes.cryptoLabField)}>
              <span className={clsx(classes.cryptoLabFieldLabel)}>密文编码</span>
              <AppSelect
                value={form.cipherEncoding}
                options={cipherEncodingOptions}
                onChange={(value) => updateForm({ cipherEncoding: value })}
              />
            </div>

            <div className={clsx(classes.cryptoLabField)}>
              <span className={clsx(classes.cryptoLabFieldLabel)}>Key / IV 编码</span>
              <AppSelect
                value={form.secretEncoding}
                options={inputEncodingOptions}
                onChange={(value) => updateForm({ secretEncoding: value })}
              />
            </div>

            {usesBlockOptions && (
              <>
                <div className={clsx(classes.cryptoLabField)}>
                  <span className={clsx(classes.cryptoLabFieldLabel)}>模式</span>
                  <AppSelect
                    value={form.mode}
                    options={blockModeOptions}
                    onChange={(value) => updateForm({ mode: value })}
                  />
                </div>

                <div className={clsx(classes.cryptoLabField)}>
                  <span className={clsx(classes.cryptoLabFieldLabel)}>填充</span>
                  <AppSelect
                    value={form.padding}
                    options={paddingOptions}
                    onChange={(value) => updateForm({ padding: value })}
                  />
                </div>
              </>
            )}

            <div className={clsx(classes.cryptoLabField, classes.cryptoLabFieldCheckbox)}>
              <AppCheckbox
                checked={form.usePassphrase}
                onChange={(checked) => updateForm({ usePassphrase: checked })}
                label="使用 Passphrase"
                description="适合 Rabbit / RC4 快速验证，也可测试 CryptoJS 口令派生逻辑。"
              />
            </div>

            {form.usePassphrase ? (
              <label className={clsx(classes.cryptoLabField)}>
                <span className={clsx(classes.cryptoLabFieldLabel)}>Passphrase</span>
                <input
                  className={clsx(classes.cryptoLabInput)}
                  value={form.passphrase}
                  onChange={(event) => updateForm({ passphrase: event.target.value })}
                  placeholder="输入口令"
                />
              </label>
            ) : (
              <>
                <label className={clsx(classes.cryptoLabField)}>
                  <span className={clsx(classes.cryptoLabFieldLabel)}>Key</span>
                  <input
                    className={clsx(classes.cryptoLabInput)}
                    value={form.key}
                    onChange={(event) => updateForm({ key: event.target.value })}
                    placeholder="输入 key"
                  />
                  <span className={clsx(classes.cryptoLabHint)}>{keyHint}</span>
                </label>

                {showIvField && (
                  <label className={clsx(classes.cryptoLabField)}>
                    <span className={clsx(classes.cryptoLabFieldLabel)}>IV</span>
                    <input
                      className={clsx(classes.cryptoLabInput)}
                      value={form.iv}
                      onChange={(event) => updateForm({ iv: event.target.value })}
                      placeholder="输入 iv"
                    />
                    <span className={clsx(classes.cryptoLabHint)}>
                      ECB 和流密码不需要 IV。
                    </span>
                  </label>
                )}
              </>
            )}
          </div>
        </div>

        {/* Result summary */}
        <div
          className={clsx(
            classes.cryptoLabPanel,
            classes.cryptoLabSection,
            classes.cryptoLabSummaryPanel,
          )}
        >
          <h2 className={clsx(classes.cryptoLabSectionTitle)}>结果摘要</h2>

          {resultMeta ? (
            <dl className={clsx(classes.cryptoLabSummary)}>
              <div>
                <dt>算法</dt>
                <dd>{resultMeta.algorithm}</dd>
              </div>
              <div>
                <dt>方向</dt>
                <dd>{resultMeta.direction === 'encrypt' ? '加密' : '解密'}</dd>
              </div>
              <div>
                <dt>模式</dt>
                <dd>{usesBlockOptions ? resultMeta.mode : '流密码'}</dd>
              </div>
              <div>
                <dt>填充</dt>
                <dd>{usesBlockOptions ? resultMeta.padding : '不适用'}</dd>
              </div>
              <div>
                <dt>输入长度</dt>
                <dd>{resultMeta.inputLength} 字符</dd>
              </div>
              <div>
                <dt>输出长度</dt>
                <dd>{resultMeta.outputLength} 字符</dd>
              </div>
            </dl>
          ) : (
            <p className={clsx(classes.cryptoLabEmpty)}>执行一次后，这里会显示本次参数摘要。</p>
          )}
        </div>
      </div>
    </main>
  )
}

export default CryptoLabPage
