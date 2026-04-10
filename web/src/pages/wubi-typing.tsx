import clsx from 'clsx';
import { useWubiTyping } from './hooks/wubi-typing.hook';
import classes from './wubi-typing.module.scss';

export default function WubiTypingPage() {
  const {
    // tab
    activeTab,
    setActiveTab,
    // lookup
    lookupQuery,
    setLookupQuery,
    isPassageMode,
    lookupResults,
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
    currentTask,
    charStates,
    errorFlash,
    isStarted,
    isFinished,
    elapsedSec,
    wpm,
    accuracy,
    progress,
    isHintVisible,
    toggleHint,
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
  } = useWubiTyping();

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

        {/* Tabs */}
        <div className={classes.tabRow}>
          <button
            className={clsx(
              classes.tabBtn,
              activeTab === 'practice' && classes.tabBtnActive,
            )}
            onClick={() => setActiveTab('practice')}
          >
            练习
          </button>
          <button
            className={clsx(
              classes.tabBtn,
              activeTab === 'lookup' && classes.tabBtnActive,
            )}
            onClick={() => setActiveTab('lookup')}
          >
            编码查询
          </button>
        </div>

        {activeTab === 'practice' && (
          <>
            {/* Controls */}
            <div className={classes.sideSection}>
              <div className={classes.sideSectionTitle}>操作</div>
              <div className={classes.controlRow}>
                {!isStarted ? (
                  <button
                    className={clsx(classes.ctrlBtn, classes.ctrlBtnPrimary)}
                    onClick={handleStart}
                  >
                    <span className="i-mdi-play-outline" aria-hidden="true" />
                    开始练习
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
                    className={
                      isFullscreen ? 'i-mdi-fullscreen-exit' : 'i-mdi-fullscreen'
                    }
                    aria-hidden="true"
                  />
                  全屏
                </button>
              </div>
            </div>

            {/* Settings */}
            <div className={classes.sideSection}>
              <div className={classes.sideSectionTitle}>设置</div>
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
                  disabled={isStarted}
                  className={classes.numberInput}
                />
                字开始
              </label>
            </div>

            {/* Text source */}
            <div className={classes.sideSection}>
              <div className={classes.sideSectionTitleRow}>
                <span className={classes.sideSectionTitle}>练习文本</span>
                <button
                  className={classes.iconBtn}
                  title="切换文本来源"
                  onClick={() =>
                    setTextSource(textSource === 'preset' ? 'custom' : 'preset')
                  }
                >
                  <span className="i-mdi-swap-horizontal" aria-hidden="true" />
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

              {textSource === 'custom' ? (
                <textarea
                  className={classes.customTextarea}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="粘贴或输入要练习的文本…"
                  rows={6}
                />
              ) : (
                <div className={classes.textPreview}>
                  {wubiTexts[presetIndex]?.content.slice(0, 100)}…
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'lookup' && (
          <div className={classes.sideSection}>
            <div className={classes.sideSectionTitle}>查询</div>
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
          </div>
        )}
      </aside>

      {/* ── Right main area ── */}
      <div className={classes.main}>
        {activeTab === 'practice' && (
          <>
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
            </div>

            {/* Progress bar */}
            <div
              className={classes.progressBar}
              role="progressbar"
              aria-valuenow={progress}
            >
              <div className={classes.progressFill} style={{ width: `${progress}%` }} />
            </div>

            {/* Guide card */}
            {isStarted && !isPaused && !isFinished && currentTask ? (
              <div
                className={clsx(classes.guideCard, errorFlash && classes.guideCardError)}
              >
                <div className={classes.guideChar}>{currentTask.char}</div>

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

            {/* Paused overlay */}
            {isStarted && isPaused && !isFinished && (
              <div className={classes.pausedCard}>
                <span className="i-mdi-pause-circle-outline" aria-hidden="true" />
                <p>已暂停，点击「继续」恢复练习</p>
              </div>
            )}

            {/* Input box — real input, handles IME / Mac composing correctly */}
            {isStarted && !isFinished && !isPaused && (
              <div
                className={clsx(classes.inputBox, errorFlash && classes.inputBoxError)}
              >
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

            {/* Text body */}
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

            {/* Finish overlay */}
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
                    <strong>{typingTasks.length}</strong>
                    <span>汉字</span>
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
          </>
        )}

        {activeTab === 'lookup' && (
          <div className={classes.lookupPanel}>
            {lookupResults.length > 0 ? (
              isPassageMode ? (
                <div className={classes.lookupPassage}>
                  {lookupResults.map(({ char, codes }, i) => (
                    <div key={i} className={classes.lookupPassageItem}>
                      <span className={classes.lookupPassageChar}>{char}</span>
                      {codes.length > 0 ? (
                        <span className={classes.lookupPassageCode}>{codes[0]}</span>
                      ) : (
                        <span className={classes.lookupPassageNoCode}>—</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={classes.lookupGrid}>
                  {lookupResults.map(({ char, codes }, i) => (
                    <div key={i} className={classes.lookupCard}>
                      <span className={classes.lookupChar}>{char}</span>
                      <div className={classes.lookupCodes}>
                        {codes.map((c, ci) => (
                          <span key={ci} className={classes.lookupCode}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : lookupQuery ? (
              <div className={classes.lookupEmpty}>
                <span className="i-mdi-emoticon-sad-outline" aria-hidden="true" />
                <p>未找到匹配结果</p>
              </div>
            ) : (
              <div className={classes.lookupEmpty}>
                <span className="i-mdi-keyboard-outline" aria-hidden="true" />
                <p>在左侧搜索框输入汉字或编码前缀</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
