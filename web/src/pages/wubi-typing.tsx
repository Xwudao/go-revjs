import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useWubiTyping } from './hooks/wubi-typing.hook';
import classes from './wubi-typing.module.scss';
import { WubiLookupPanel } from './wubi-lookup-panel';
import { SaveProgressModal } from '@/components/front/modals/SaveProgressModal';

export default function WubiTypingPage() {
  const {
    // lookup
    lookupQuery,
    setLookupQuery,
    isPassageMode,
    lookupResults,
    // error notebook
    errorChars,
    clearErrorChars,
    // text
    wubiTexts,
    textSource,
    setTextSource,
    presetIndex,
    setPresetIndex,
    customText,
    setCustomText,
    displayChars,
    typingTasks,
    practiceMode,
    setPracticeMode,
    isPhraseModeLoading,
    phraseDictLoadError,
    canStartPractice,
    currentTask,
    charStates,
    errorFlash,
    isStarted,
    isFinished,
    elapsedSec,
    wpm,
    accuracy,
    progress,
    practiceCharCount,
    isHintVisible,
    toggleHint,
    isCodeImageVisible,
    toggleCodeImage,
    handleStart,
    handleReset,
    handlePause,
    handleResume,
    isPaused,
    startTaskIndex,
    setStartTaskIndex,
    containerRef,
    currentCharRef,
    inputRef,
    handleCompositionStart,
    handleCompositionEnd,
    handleInputChange,
    isFullscreen,
    toggleFullscreen,
    formatTime,
    saves,
    isSaveModalOpen,
    setIsSaveModalOpen,
    saveName,
    setSaveName,
    saveProgress,
    loadSave,
    deleteSave,
  } = useWubiTyping();
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLookupModalOpen(false);
        setIsSaveModalOpen(false);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'i') {
        event.preventDefault();
        setIsLookupModalOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsSaveModalOpen]);

  return (
    <div
      ref={containerRef}
      className={clsx(classes.page, isFullscreen && classes.pageFull)}
    >
      {/* ── Left sidebar ── */}
      <aside className={classes.sidebar}>
        {/* Brand */}
        <div className={classes.sidebarBrand}>
          <span className="i-mdi-keyboard-outline" aria-hidden="true" />
          <span className={classes.brandName}>五笔打字练习</span>
        </div>
        <p className={classes.sidebarDesc}>
          在线五笔输入法练习工具，支持自定义文本和码表提示
        </p>

        {/* Controls */}
        <div className={classes.sideSection}>
          <div className={classes.sideSectionTitle}>操作</div>
          <div className={classes.controlRow}>
            {!isStarted ? (
              <button
                className={clsx(classes.ctrlBtn, classes.ctrlBtnPrimary)}
                onClick={handleStart}
                disabled={!canStartPractice}
              >
                <span
                  className={clsx(
                    isPhraseModeLoading
                      ? 'i-mdi-loading animate-spin'
                      : 'i-mdi-play-outline',
                  )}
                  aria-hidden="true"
                />
                {isPhraseModeLoading ? '加载词典中…' : '开始练习'}
              </button>
            ) : isPaused ? (
              <>
                <button
                  className={clsx(classes.ctrlBtn, classes.ctrlBtnPrimary)}
                  onClick={handleResume}
                >
                  <span className="i-mdi-play-outline" aria-hidden="true" />
                  继续
                </button>
                <button
                  className={clsx(classes.ctrlBtn, classes.ctrlBtnDanger)}
                  onClick={handleReset}
                >
                  <span className="i-mdi-restart" aria-hidden="true" />
                  重置
                </button>
              </>
            ) : (
              <>
                <button
                  className={clsx(classes.ctrlBtn, classes.ctrlBtnWarning)}
                  onClick={handlePause}
                >
                  <span className="i-mdi-pause" aria-hidden="true" />
                  暂停
                </button>
                <button
                  className={clsx(classes.ctrlBtn, classes.ctrlBtnDanger)}
                  onClick={handleReset}
                >
                  <span className="i-mdi-restart" aria-hidden="true" />
                  重置
                </button>
              </>
            )}
          </div>
          <div className={classes.controlRow}>
            <button className={classes.ctrlBtnGhost} onClick={toggleFullscreen}>
              <span
                className={isFullscreen ? 'i-mdi-fullscreen-exit' : 'i-mdi-fullscreen'}
                aria-hidden="true"
              />
              全屏
            </button>
            <button
              className={classes.ctrlBtnGhost}
              onClick={() => setIsLookupModalOpen(true)}
              title="编码查询 (⌘I / Ctrl+I)"
            >
              <span className="i-mdi-magnify" aria-hidden="true" />
              编码查询
            </button>
            <button
              className={classes.ctrlBtnGhost}
              onClick={() => setIsSaveModalOpen(true)}
            >
              <span className="i-mdi-content-save-outline" aria-hidden="true" />
              存档
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className={classes.sideSection}>
          <div className={classes.sideSectionTitle}>设置</div>
          <div className={classes.modeSection}>
            <div className={classes.modeLabelRow}>
              <span className={classes.modeLabel}>练习模式</span>
              <span className={classes.modeValue}>
                {practiceMode === 'single' ? '单字' : '词组优化'}
              </span>
            </div>
            <div className={classes.modeSwitch}>
              <button
                className={clsx(
                  classes.modeBtn,
                  practiceMode === 'single' && classes.modeBtnActive,
                )}
                onClick={() => setPracticeMode('single')}
              >
                单字模式
              </button>
              <button
                className={clsx(
                  classes.modeBtn,
                  practiceMode === 'phrase' && classes.modeBtnActive,
                  isPhraseModeLoading && classes.modeBtnLoading,
                )}
                onClick={() => setPracticeMode('phrase')}
                disabled={isPhraseModeLoading}
              >
                {isPhraseModeLoading && (
                  <span
                    className={clsx('i-mdi-loading animate-spin', classes.modeBtnIcon)}
                    aria-hidden="true"
                  />
                )}
                词组优化
              </button>
            </div>
            <p className={classes.modeHint}>
              词组模式会优先匹配词库中的完整词组，未命中内容自动回退为单字。
            </p>
            {isPhraseModeLoading && (
              <div className={classes.modeLoadingNotice}>
                <span className="i-mdi-loading animate-spin" aria-hidden="true" />
                <span>正在加载词组词典，首次切换会稍等片刻。</span>
              </div>
            )}
            {!isPhraseModeLoading && phraseDictLoadError && practiceMode === 'phrase' && (
              <div className={classes.modeErrorNotice}>
                <span className="i-mdi-alert-circle-outline" aria-hidden="true" />
                <span>词组词典加载失败，请稍后重试或先切回单字模式。</span>
              </div>
            )}
          </div>
          <label className={classes.checkRow}>
            <input
              type="checkbox"
              checked={isHintVisible}
              onChange={toggleHint}
              className={classes.checkbox}
            />
            显示编码提示
          </label>
          <label className={classes.checkRow}>
            <input
              type="checkbox"
              checked={isCodeImageVisible}
              onChange={toggleCodeImage}
              className={classes.checkbox}
            />
            显示键位图
          </label>
          <label className={classes.checkRow}>
            从第
            <input
              type="number"
              min={1}
              max={typingTasks.length || 1}
              value={startTaskIndex + 1}
              onChange={(e) =>
                setStartTaskIndex(
                  Math.max(
                    0,
                    Math.min(Number(e.target.value) - 1, typingTasks.length - 1),
                  ),
                )
              }
              disabled={isStarted || isPhraseModeLoading}
              className={classes.numberInput}
            />
            {practiceMode === 'single' ? '字' : '段'}开始
          </label>
        </div>

        {/* Text source */}
        <div className={classes.sideSection}>
          <div className={classes.sideSectionTitleRow}>
            <span className={classes.sideSectionTitle}>练习文本</span>
            {textSource === 'error' && errorChars.size > 0 && (
              <button
                className={classes.iconBtn}
                title="清空错题本"
                onClick={clearErrorChars}
              >
                <span className="i-mdi-delete-outline" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className={classes.sourceRow}>
            <button
              className={clsx(
                classes.sourceBtn,
                textSource === 'preset' && classes.sourceBtnActive,
              )}
              onClick={() => setTextSource('preset')}
            >
              预设
            </button>
            <button
              className={clsx(
                classes.sourceBtn,
                textSource === 'custom' && classes.sourceBtnActive,
              )}
              onClick={() => setTextSource('custom')}
            >
              自定义
            </button>
            <button
              className={clsx(
                classes.sourceBtn,
                textSource === 'error' && classes.sourceBtnActive,
              )}
              onClick={() => setTextSource('error')}
            >
              错题本
              {errorChars.size > 0 && (
                <span className={classes.errorBadge}>{errorChars.size}</span>
              )}
            </button>
          </div>

          {textSource === 'preset' && (
            <select
              className={classes.select}
              value={presetIndex}
              onChange={(e) => setPresetIndex(Number(e.target.value))}
            >
              {wubiTexts.map((t, i) => (
                <option key={i} value={i}>
                  {t.title}
                </option>
              ))}
            </select>
          )}

          {textSource === 'custom' && (
            <textarea
              className={classes.customTextarea}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="粘贴或输入要练习的文本…"
              rows={6}
            />
          )}

          {textSource === 'error' ? (
            errorChars.size === 0 ? (
              <div className={classes.errorEmpty}>
                <span
                  className="i-mdi-book-open-blank-variant-outline"
                  aria-hidden="true"
                />
                <p>暂无错题，练习时答错的字会自动收录</p>
              </div>
            ) : (
              <div className={classes.textPreview}>
                {Array.from(errorChars).join('　')}
              </div>
            )
          ) : textSource === 'preset' ? (
            <div className={classes.textPreview}>
              {wubiTexts[presetIndex]?.content.slice(0, 100)}…
            </div>
          ) : null}
        </div>
      </aside>

      {/* ── Right main area ── */}
      <div className={classes.main}>
        {/* Stats row */}
        <div className={classes.statsRow}>
          <div className={classes.statItem}>
            <span className={classes.statLabel}>速度</span>
            <strong className={clsx(classes.statVal, classes.statValAccent)}>
              {wpm} 字/分
            </strong>
          </div>
          <div className={classes.statItem}>
            <span className={classes.statLabel}>准确率</span>
            <strong className={clsx(classes.statVal, classes.statValAccent)}>
              {accuracy}%
            </strong>
          </div>
          <div className={classes.statItem}>
            <span className={classes.statLabel}>进度</span>
            <strong className={clsx(classes.statVal, classes.statValAccent)}>
              {progress}%
            </strong>
          </div>
          {isCodeImageVisible &&
            isStarted &&
            !isPaused &&
            !isFinished &&
            currentTask?.kind === 'char' &&
            currentTask && (
              <div className={clsx(classes.statItem, classes.statItemImg)}>
                <img
                  key={currentTask.text}
                  src={`https://oss.misiai.com/wubi/${encodeURIComponent(currentTask.text)}.gif`}
                  alt={`键位图-${currentTask.text}`}
                  className={classes.codeImage}
                />
              </div>
            )}
        </div>

        <div className={classes.progressBar} role="progressbar" aria-valuenow={progress}>
          <div className={classes.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {isPhraseModeLoading ? (
          <div className={classes.loadingCard}>
            <span className="i-mdi-loading animate-spin" aria-hidden="true" />
            <p>正在加载词组词典，加载完成后即可开始词组练习。</p>
          </div>
        ) : isStarted && !isPaused && !isFinished && currentTask ? (
          <div className={clsx(classes.guideCard, errorFlash && classes.guideCardError)}>
            <div className={classes.guideMeta}>
              <span className={classes.guideMetaBadge}>
                {currentTask.kind === 'phrase' ? '词组' : '单字'}
              </span>
              <span className={classes.guideMetaText}>
                {Array.from(currentTask.text).length} 字
              </span>
            </div>
            <div
              className={clsx(
                classes.guideChar,
                currentTask.kind === 'phrase' && classes.guideCharPhrase,
              )}
            >
              {currentTask.text}
            </div>

            {isHintVisible && (
              <div className={classes.keyRow}>
                {currentTask.codes[0].split('').map((letter, ki) => (
                  <span key={ki} className={classes.keyBox}>
                    {letter}
                  </span>
                ))}
                {currentTask.codes.length > 1 &&
                  currentTask.codes.slice(1).map((c, ci) => (
                    <span key={ci} className={classes.altCode}>
                      {c}
                    </span>
                  ))}
              </div>
            )}
          </div>
        ) : (
          !isFinished &&
          !isStarted && (
            <div className={classes.idleCard}>
              <span className="i-mdi-keyboard-outline" aria-hidden="true" />
              <p>点击「开始练习」，然后用键盘输入五笔码</p>
            </div>
          )
        )}

        {isStarted && isPaused && !isFinished && (
          <div className={classes.pausedCard}>
            <span className="i-mdi-pause-circle-outline" aria-hidden="true" />
            <p>已暂停，点击「继续」恢复练习</p>
          </div>
        )}

        {isStarted && !isFinished && !isPaused && (
          <div className={clsx(classes.inputBox, errorFlash && classes.inputBoxError)}>
            <input
              ref={inputRef}
              type="text"
              className={classes.inputField}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onChange={handleInputChange}
              placeholder="输入汉字…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
        )}

        <div className={clsx(classes.textPanel, !isStarted && classes.textPanelDim)}>
          <p className={classes.textBody}>
            {displayChars.map((char, i) =>
              char === '\n' ? (
                <br key={i} />
              ) : (
                <span
                  key={i}
                  ref={charStates[i] === 'current' ? currentCharRef : undefined}
                  className={clsx(
                    classes.char,
                    charStates[i] === 'done' && classes.charDone,
                    charStates[i] === 'done-error' && classes.charError,
                    charStates[i] === 'current' && classes.charCurrent,
                    charStates[i] === 'current' && errorFlash && classes.charFlash,
                    charStates[i] === 'skipped' && classes.charSkipped,
                    charStates[i] === 'pending' && classes.charPending,
                  )}
                >
                  {char}
                </span>
              ),
            )}
          </p>
        </div>

        {isFinished && (
          <div className={classes.finishCard}>
            <span className="i-mdi-check-circle-outline" aria-hidden="true" />
            <h2>练习完成</h2>
            <div className={classes.finishStats}>
              <div className={classes.finishStat}>
                <strong>{wpm}</strong>
                <span>字/分</span>
              </div>
              <div className={classes.finishStat}>
                <strong>{accuracy}%</strong>
                <span>准确率</span>
              </div>
              <div className={classes.finishStat}>
                <strong>{practiceCharCount}</strong>
                <span>练习字数</span>
              </div>
              <div className={classes.finishStat}>
                <strong>{formatTime(elapsedSec)}</strong>
                <span>用时</span>
              </div>
            </div>
            <button
              className={clsx(classes.ctrlBtn, classes.ctrlBtnPrimary)}
              onClick={handleReset}
            >
              <span className="i-mdi-restart" aria-hidden="true" />
              再练一次
            </button>
          </div>
        )}
      </div>

      {isSaveModalOpen && (
        <SaveProgressModal
          saves={saves}
          saveName={saveName}
          setSaveName={setSaveName}
          saveProgress={saveProgress}
          loadSave={loadSave}
          deleteSave={deleteSave}
          onClose={() => setIsSaveModalOpen(false)}
        />
      )}

      {isLookupModalOpen && (
        <div
          className={classes.lookupModalBackdrop}
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsLookupModalOpen(false);
            }
          }}
        >
          <div
            className={classes.lookupModalPanel}
            role="dialog"
            aria-modal="true"
            aria-label="五笔编码查询"
          >
            <div className={classes.lookupModalHeader}>
              <div>
                <h2 className={classes.lookupModalTitle}>编码查询</h2>
                <p className={classes.lookupModalDesc}>
                  单字或编码前缀会列出候选，多字文本则逐字展示五笔编码。
                  <span className={classes.lookupModalKbd}>
                    <kbd>⌘I</kbd> / <kbd>Ctrl+I</kbd> 唤出 · <kbd>Esc</kbd> 关闭
                  </span>
                </p>
              </div>
              <button
                className={classes.lookupModalClose}
                onClick={() => setIsLookupModalOpen(false)}
                title="关闭"
              >
                <span className="i-mdi-close" aria-hidden="true" />
              </button>
            </div>

            <div className={classes.lookupModalContent}>
              <div className={classes.lookupSearch}>
                <span className="i-mdi-magnify" aria-hidden="true" />
                <textarea
                  className={classes.lookupTextarea}
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="汉字、编码前缀或一段文本…"
                  rows={3}
                  autoFocus
                />
                {lookupQuery && (
                  <button
                    className={classes.lookupClear}
                    onClick={() => setLookupQuery('')}
                  >
                    <span className="i-mdi-close-circle" aria-hidden="true" />
                  </button>
                )}
              </div>
              <p className={classes.lookupTip}>
                单字或编码前缀：搜索匹配结果；多字文本：逐字显示五笔编码。
              </p>

              <div className={classes.lookupModalBody}>
                <WubiLookupPanel
                  lookupResults={lookupResults}
                  isPassageMode={isPassageMode}
                  lookupQuery={lookupQuery}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
