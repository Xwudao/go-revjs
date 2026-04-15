import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import wubiDictRaw from '@/assets/data/wubi_dictionary.json';
import wubiTextsRaw from '@/assets/data/wubi_text.json';

const wubiDict = wubiDictRaw as Record<string, string[]>;
export const wubiTexts = wubiTextsRaw as Array<{ title: string; content: string }>;

export type TextSource = 'preset' | 'custom' | 'error';
export type CharState = 'done' | 'done-error' | 'current' | 'skipped' | 'pending';
export type ActiveTab = 'practice' | 'lookup';

interface TypingTask {
  displayIndex: number;
  char: string;
  codes: string[];
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export { formatTime };

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWubiTyping() {
  // ── Tab ──
  const [activeTab, setActiveTab] = useState<ActiveTab>('practice');

  // ── Lookup ──
  const [lookupQuery, setLookupQuery] = useState('');

  // Passage mode: query contains more than one Unicode code point
  const isPassageMode = useMemo(
    () => Array.from(lookupQuery.trim()).length > 1,
    [lookupQuery],
  );

  const lookupResults = useMemo<Array<{ char: string; codes: string[] }>>(() => {
    const q = lookupQuery.trim();
    if (!q) return [];

    if (isPassageMode) {
      // Return codes for each character in passage order (including uncoded chars)
      return Array.from(q).map((char) => ({ char, codes: wubiDict[char] ?? [] }));
    }

    // Single char or code-prefix search
    const byChar: Array<{ char: string; codes: string[] }> = [];
    const byCode: Array<{ char: string; codes: string[] }> = [];
    for (const [char, codes] of Object.entries(wubiDict)) {
      if (char === q) {
        byChar.push({ char, codes });
      } else if (codes.some((c) => c.startsWith(q.toLowerCase()))) {
        byCode.push({ char, codes });
      }
    }
    return [...byChar, ...byCode].slice(0, 60);
  }, [lookupQuery, isPassageMode]);

  // ── Error notebook ──
  const [errorChars, setErrorChars] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('wubi-error-chars');
      if (saved) return new Set<string>(JSON.parse(saved) as string[]);
    } catch {}
    return new Set<string>();
  });

  const clearErrorChars = useCallback(() => {
    setErrorChars(new Set());
    try {
      localStorage.removeItem('wubi-error-chars');
    } catch {}
  }, []);

  // ── Text settings ──
  const [textSource, setTextSource] = useState<TextSource>(() => {
    try {
      const saved = localStorage.getItem('wubi-text-source');
      if (saved === 'preset' || saved === 'custom' || saved === 'error') return saved;
    } catch {}
    return 'preset';
  });
  const [presetIndex, setPresetIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('wubi-preset-index');
      const n = parseInt(saved ?? '', 10);
      if (!isNaN(n) && n >= 0 && n < wubiTexts.length) return n;
    } catch {}
    return 0;
  });
  const [customText, setCustomText] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Persist text source and preset index
  useEffect(() => {
    try {
      localStorage.setItem('wubi-text-source', textSource);
    } catch {}
  }, [textSource]);

  useEffect(() => {
    try {
      localStorage.setItem('wubi-preset-index', String(presetIndex));
    } catch {}
  }, [presetIndex]);

  // ── Practice settings ──
  const [isHintVisible, setIsHintVisible] = useState(true);
  const [isCodeImageVisible, setIsCodeImageVisible] = useState(() => {
    try {
      return localStorage.getItem('wubi-code-image-visible') === 'true';
    } catch {
      return false;
    }
  });

  // ── Session state ──
  const [taskIndex, setTaskIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [taskHadError, setTaskHadError] = useState<boolean[]>([]);
  const [errorFlash, setErrorFlash] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [totalErrors, setTotalErrors] = useState(0);
  const [totalCorrectKeys, setTotalCorrectKeys] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // ── Start-from-position ──
  const [startTaskIndex, setStartTaskIndex] = useState(0);
  const [sessionStartIndex, setSessionStartIndex] = useState(0);

  // ── Timer ──
  const startTimeRef = useRef<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedSecRef = useRef(0);

  // ── Derived: text & tasks ──
  const rawText = useMemo(() => {
    if (textSource === 'custom') return customText;
    if (textSource === 'error') return Array.from(errorChars).join('');
    return wubiTexts[presetIndex]?.content ?? '';
  }, [textSource, presetIndex, customText, errorChars]);

  const displayChars = useMemo(() => Array.from(rawText), [rawText]);

  const typingTasks = useMemo(
    () =>
      displayChars.reduce<TypingTask[]>((acc, char, i) => {
        const codes = wubiDict[char];
        if (codes && codes.length > 0) {
          acc.push({ displayIndex: i, char, codes });
        }
        return acc;
      }, []),
    [displayChars],
  );

  const displayIndexToTaskIndex = useMemo(() => {
    const map = new Map<number, number>();
    typingTasks.forEach((task, i) => map.set(task.displayIndex, i));
    return map;
  }, [typingTasks]);

  const currentTask: TypingTask | null = typingTasks[taskIndex] ?? null;
  const nextTask: TypingTask | null = typingTasks[taskIndex + 1] ?? null;

  // Preload the next char's code image so it's ready when needed
  useEffect(() => {
    if (!isCodeImageVisible || !nextTask) return;
    const img = new Image();
    img.src = `https://oss.misiai.com/wubi/${encodeURIComponent(nextTask.char)}.gif`;
  }, [nextTask?.char, isCodeImageVisible]);

  // ── Char states for display ──
  const charStates = useMemo<CharState[]>(() => {
    const currentDisplayIdx = isFinished
      ? Infinity
      : (currentTask?.displayIndex ?? Infinity);
    return displayChars.map((_, i) => {
      if (i > currentDisplayIdx) return 'pending';
      if (i === currentDisplayIdx) return 'current';
      const ti = displayIndexToTaskIndex.get(i);
      if (ti !== undefined) {
        return taskHadError[ti] ? 'done-error' : 'done';
      }
      return 'skipped';
    });
  }, [displayChars, currentTask, isFinished, displayIndexToTaskIndex, taskHadError]);

  // ── Stats ──
  const completedTasks = isFinished
    ? typingTasks.length - sessionStartIndex
    : taskIndex - sessionStartIndex;

  const wpm = useMemo(() => {
    if (elapsedSec === 0 || completedTasks === 0) return 0;
    return Math.round((completedTasks / elapsedSec) * 60);
  }, [completedTasks, elapsedSec]);

  const accuracy = useMemo(() => {
    const total = totalCorrectKeys + totalErrors;
    if (total === 0) return 100;
    return Math.round((totalCorrectKeys / total) * 100);
  }, [totalCorrectKeys, totalErrors]);

  const progress = useMemo(() => {
    const total = typingTasks.length - sessionStartIndex;
    if (total <= 0) return 0;
    return Math.round((completedTasks / total) * 100);
  }, [completedTasks, typingTasks.length, sessionStartIndex]);

  // ── Timer control ──
  const startTimer = useCallback(() => {
    if (startTimeRef.current !== null) return; // already running
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedSec(
          accumulatedSecRef.current +
            Math.floor((Date.now() - startTimeRef.current) / 1000),
        );
      }
    }, 500);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pauseTimer = useCallback(() => {
    if (startTimeRef.current !== null) {
      accumulatedSecRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
      startTimeRef.current = null;
    }
    stopTimer();
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // ── Fullscreen ──
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Scroll current char into view ──
  const currentCharRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isStarted && !isFinished) {
      currentCharRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [taskIndex, isStarted, isFinished]);

  // ── Real input + IME handling ──
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposing = useRef(false);
  const justFinishedComposing = useRef(false);

  // Keep the input focused while practice is running
  useEffect(() => {
    if (isStarted && !isFinished) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isStarted, isFinished, taskIndex]);

  // Process a string of typed Chinese characters (may be more than one at a time)
  const processInputString = useCallback(
    (input: string) => {
      if (!isStarted || isPaused || isFinished || !currentTask) return;
      startTimer();

      const chars = Array.from(input);
      let idx = taskIndex;
      let correct = 0;
      let errors = 0;
      let finished = false;
      const hadErrorPatch: Array<[number, boolean]> = [];

      for (const ch of chars) {
        const task = typingTasks[idx];
        if (!task) break;
        if (ch === task.char) {
          correct++;
          hadErrorPatch.push([idx, false]);
          idx++;
          if (idx >= typingTasks.length) {
            finished = true;
            break;
          }
        } else {
          errors++;
          hadErrorPatch.push([idx, true]);
          break; // stop on first wrong character
        }
      }

      if (correct > 0) setTotalCorrectKeys((n) => n + correct);
      if (errors > 0) {
        setTotalErrors((n) => n + errors);
        setErrorFlash(true);
        setTimeout(() => setErrorFlash(false), 250);
      }
      if (hadErrorPatch.length > 0) {
        setTaskHadError((prev) => {
          const next = [...prev];
          for (const [i, wasError] of hadErrorPatch) {
            if (wasError) {
              next[i] = true;
            } else if (next[i] === undefined) {
              next[i] = false;
            }
          }
          return next;
        });

        // Persist newly erred chars to the error notebook
        const newErrorChars = hadErrorPatch
          .filter(([, wasError]) => wasError)
          .map(([i]) => typingTasks[i].char);
        if (newErrorChars.length > 0) {
          setErrorChars((prev) => {
            const next = new Set(prev);
            for (const c of newErrorChars) next.add(c);
            try {
              localStorage.setItem('wubi-error-chars', JSON.stringify([...next]));
            } catch {}
            return next;
          });
        }
      }

      setCurrentInput('');
      if (finished) {
        stopTimer();
        setIsFinished(true);
        setTaskIndex(typingTasks.length);
      } else {
        setTaskIndex(idx);
      }
    },
    [
      isStarted,
      isPaused,
      isFinished,
      currentTask,
      taskIndex,
      typingTasks,
      startTimer,
      stopTimer,
    ],
  );

  const handleCompositionStart = useCallback(() => {
    isComposing.current = true;
  }, []);

  // On macOS with an IME, compositionend carries the finalised character(s)
  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      isComposing.current = false;
      justFinishedComposing.current = true;
      const composed = e.data ?? '';
      if (composed) processInputString(composed);
      // Clear the native input value so the next character starts fresh
      if (inputRef.current) inputRef.current.value = '';
    },
    [processInputString],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isComposing.current) {
        // During IME composition, mirror value for display only
        setCurrentInput(e.target.value);
        return;
      }
      // onChange can fire right after compositionend on some browsers — skip it
      if (justFinishedComposing.current) {
        justFinishedComposing.current = false;
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
      const val = e.target.value;
      if (!val) return;
      processInputString(val);
      if (inputRef.current) inputRef.current.value = '';
    },
    [processInputString],
  );

  // ── Controls ──
  const handleStart = useCallback(() => {
    const clampedStart = Math.min(
      Math.max(0, startTaskIndex),
      Math.max(0, typingTasks.length - 1),
    );
    stopTimer();
    startTimeRef.current = null;
    accumulatedSecRef.current = 0;
    setIsStarted(true);
    setIsPaused(false);
    setIsFinished(false);
    setSessionStartIndex(clampedStart);
    setTaskIndex(clampedStart);
    setCurrentInput('');
    setTaskHadError([]);
    setTotalErrors(0);
    setTotalCorrectKeys(0);
    setElapsedSec(0);
    setErrorFlash(false);
  }, [stopTimer, startTaskIndex, typingTasks.length]);

  const handleReset = useCallback(() => {
    stopTimer();
    startTimeRef.current = null;
    accumulatedSecRef.current = 0;
    setIsStarted(false);
    setIsPaused(false);
    setIsFinished(false);
    setSessionStartIndex(0);
    setTaskIndex(0);
    setCurrentInput('');
    setTaskHadError([]);
    setTotalErrors(0);
    setTotalCorrectKeys(0);
    setElapsedSec(0);
    setErrorFlash(false);
  }, [stopTimer]);

  const handlePause = useCallback(() => {
    pauseTimer();
    setIsPaused(true);
  }, [pauseTimer]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    startTimer();
  }, [startTimer]);

  const toggleHint = useCallback(() => setIsHintVisible((v) => !v), []);
  const toggleCodeImage = useCallback(() => {
    setIsCodeImageVisible((v) => {
      const next = !v;
      try {
        localStorage.setItem('wubi-code-image-visible', String(next));
      } catch {}
      return next;
    });
  }, []);
  const toggleSettings = useCallback(() => setSettingsOpen((v) => !v), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  // Reset practice when text changes
  useEffect(() => {
    handleReset();
    setStartTaskIndex(0);
  }, [rawText, handleReset]);

  return {
    // tab
    activeTab,
    setActiveTab,
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
    rawText,
    displayChars,
    typingTasks,
    // practice
    taskIndex,
    currentTask,
    currentInput,
    charStates,
    errorFlash,
    isStarted,
    isFinished,
    elapsedSec,
    // stats
    wpm,
    accuracy,
    progress,
    completedTasks,
    totalErrors,
    formatTime,
    // settings
    isHintVisible,
    toggleHint,
    isCodeImageVisible,
    toggleCodeImage,
    settingsOpen,
    toggleSettings,
    closeSettings,
    // controls
    handleStart,
    handleReset,
    handlePause,
    handleResume,
    isPaused,
    startTaskIndex,
    setStartTaskIndex,
    // refs
    containerRef,
    currentCharRef,
    inputRef,
    // input / IME
    handleCompositionStart,
    handleCompositionEnd,
    handleInputChange,
    // fullscreen
    isFullscreen,
    toggleFullscreen,
  };
}
