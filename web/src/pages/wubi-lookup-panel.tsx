import { useState } from 'react';
import clsx from 'clsx';
import classes from './wubi-lookup-panel.module.scss';

interface LookupResult {
  char: string;
  codes: string[];
}

interface Props {
  lookupResults: LookupResult[];
  isPassageMode: boolean;
  lookupQuery: string;
}

export function WubiLookupPanel({ lookupResults, isPassageMode, lookupQuery }: Props) {
  const [activeChar, setActiveChar] = useState<string | null>(null);

  const activeResult = lookupResults.find((r) => r.char === activeChar) ?? null;

  const handleCardClick = (char: string) => {
    setActiveChar((prev) => (prev === char ? null : char));
  };

  const handleKeyDown = (e: React.KeyboardEvent, char: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(char);
    }
  };

  return (
    <div className={classes.lookupPanel}>
      {/* Char preview strip — visible when a char is selected */}
      {activeResult && (
        <div className={classes.charPreview}>
          <span className={classes.charPreviewChar}>{activeResult.char}</span>
          {activeResult.codes.length > 0 && (
            <div className={classes.charPreviewCodes}>
              {activeResult.codes.map((c, i) => (
                <span key={i} className={classes.charPreviewCode}>
                  {c}
                </span>
              ))}
            </div>
          )}
          <img
            src={`https://oss.misiai.com/wubi/${encodeURIComponent(activeResult.char)}.gif`}
            alt={`键位图-${activeResult.char}`}
            className={classes.charPreviewImg}
          />
          <button
            className={classes.charPreviewClose}
            onClick={() => setActiveChar(null)}
            title="关闭"
          >
            <span className="i-mdi-close" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Results */}
      {lookupResults.length > 0 ? (
        isPassageMode ? (
          <div className={classes.lookupPassage}>
            {lookupResults.map(({ char, codes }, i) => (
              <div
                key={i}
                className={clsx(
                  classes.lookupPassageItem,
                  activeChar === char && classes.lookupPassageItemActive,
                )}
                onClick={() => handleCardClick(char)}
                onKeyDown={(e) => handleKeyDown(e, char)}
                role="button"
                tabIndex={0}
              >
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
              <div
                key={i}
                className={clsx(
                  classes.lookupCard,
                  activeChar === char && classes.lookupCardActive,
                )}
                onClick={() => handleCardClick(char)}
                onKeyDown={(e) => handleKeyDown(e, char)}
                role="button"
                tabIndex={0}
              >
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
          <p>在上方搜索框输入汉字或编码前缀</p>
        </div>
      )}
    </div>
  );
}
