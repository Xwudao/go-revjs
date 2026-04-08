import clsx from 'clsx'
import { AppCheckbox } from '@/components/ui/app-checkbox'
import { AppSelect } from '@/components/ui/app-select'
import { CodeEditor } from '@/components/ui/code-editor'
import { ToolbarButton, ToolbarDivider } from '@/components/ui/toolbar-button'
import {
  algorithmOptions,
  blockModeOptions,
  cipherEncodingOptions,
  directionOptions,
  generateCode,
  inputEncodingOptions,
  paddingOptions,
  useCryptoLab,
} from './hooks/crypto-lab.hook'
import classes from './crypto-lab.module.scss'


function CryptoLabPage() {
  const {
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
  } = useCryptoLab()

  const generatedCode = generateCode(form)

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
          <ToolbarButton
            variant="primary"
            onClick={executeCrypto}
          >
            <span className="i-mdi-play-circle-outline" aria-hidden="true" />
            {form.direction === 'encrypt' ? '立即加密' : '立即解密'}
          </ToolbarButton>
          <ToolbarButton onClick={swapInputOutput} disabled={!result}>
            <span className="i-mdi-swap-horizontal" aria-hidden="true" />
            结果回填
          </ToolbarButton>
          <ToolbarButton onClick={copyResult} disabled={!result}>
            <span className="i-mdi-content-copy" aria-hidden="true" />
            {copyState === 'done' ? '已复制' : copyState === 'failed' ? '失败' : '复制结果'}
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton onClick={clearAll}>
            <span className="i-mdi-refresh" aria-hidden="true" />
            重置
          </ToolbarButton>
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

      {/* ── Code generation ── */}
      <div className={clsx(classes.cryptoLabPanel, classes.cryptoLabSection, classes.cryptoLabCodegen)}>
        <div className={clsx(classes.cryptoLabEditorHead)}>
          <h2 className={clsx(classes.cryptoLabSectionTitle)}>
            <span className="i-mdi-code-braces" aria-hidden="true" />
            代码生成
          </h2>
          <span className={clsx(classes.cryptoLabEditorMeta)}>
            CryptoJS · 随参数实时更新
          </span>
        </div>
        <div className={clsx(classes.cryptoLabEditorWrap, classes.cryptoLabCodegenWrap)}>
          <CodeEditor value={generatedCode} readOnly language="javascript" />
        </div>
      </div>
    </main>
  )
}

export default CryptoLabPage
