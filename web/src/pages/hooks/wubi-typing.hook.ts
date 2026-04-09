import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import wubiDictRaw from '@/assets/data/wubi_dictionary.json';
import wubiTextsRaw from '@/assets/data/wubi_text.json';

const wubiDict = wubiDictRaw as Record<string, string[]>;
export const wubiTexts = wubiTextsRaw as Array<{ title: string; content: string }>;

export type TextSource = 'preset' | 'custom';
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
  const lookupResults = useMemo<Array<{ char: string; codes: string[] }>>(() => {
    const q = lookupQuery.trim();
    if (!q) return [];
    // Search by character (exact match first) then by code prefix
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
  }, [lookupQuery]);

  // ── Text settings ──
  const [textSource, setTextSource] = useState<TextSource>('preset');
  const [presetIndex, setPresetIndex] = useState(0);
  const [customText, setCustomText] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Practice settings ──
  const [isHintVisible, setIsHintVisible] = useState(true);

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

  // ── Timer ──
  const startTimeRef = useRef<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived: text & tasks ──
  const rawText = useMemo(() => {
    if (textSource === 'custom') return customText;
    return wubiTexts[presetIndex]?.content ?? '';
  }, [textSource, presetIndex, customText]);

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
  const completedTasks = isFinished ? typingTasks.length : taskIndex;

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
    if (typingTasks.length === 0) return 0;
    return Math.round((completedTasks / typingTasks.length) * 100);
  }, [completedTasks, typingTasks.length]);

  // ── Timer control ──
  const startTimer = useCallback(() => {
    if (startTimeRef.current !== null) return; // already running
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 500);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

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

  // Process a single typed Chinese character
  const processInputChar = useCallback(
    (char: string) => {
      if (!isStarted || isFinished || !currentTask) return;
      startTimer();
      if (char === currentTask.char) {
        setTotalCorrectKeys((n) => n + 1);
        setTaskHadError((prev) => {
          const next = [...prev];
          if (next[taskIndex] === undefined) next[taskIndex] = false;
          return next;
        });
        setCurrentInput('');
        const nextIdx = taskIndex + 1;
        if (nextIdx >= typingTasks.length) {
          stopTimer();
          setIsFinished(true);
          setTaskIndex(typingTasks.length);
        } else {
          setTaskIndex(nextIdx);
        }
      } else {
        setTotalErrors((n) => n + 1);
        setTaskHadError((prev) => {
          const next = [...prev];
          next[taskIndex] = true;
          return next;
        });
        setErrorFlash(true);
        setCurrentInput('');
        setTimeout(() => setErrorFlash(false), 250);
      }
    },
    [
      isStarted,
      isFinished,
      currentTask,
      taskIndex,
      typingTasks.length,
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
      setCurrentInput('');
      for (const ch of Array.from(composed)) {
        processInputChar(ch);
      }
      // Clear the native input value so the next character starts fresh
      if (inputRef.current) inputRef.current.value = '';
    },
    [processInputChar],
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
      setCurrentInput('');
      for (const ch of Array.from(val)) {
        processInputChar(ch);
      }
      if (inputRef.current) inputRef.current.value = '';
    },
    [processInputChar],
  );

  // ── Controls ──
  const handleStart = useCallback(() => {
    stopTimer();
    startTimeRef.current = null;
    setIsStarted(true);
    setIsFinished(false);
    setTaskIndex(0);
    setCurrentInput('');
    setTaskHadError([]);
    setTotalErrors(0);
    setTotalCorrectKeys(0);
    setElapsedSec(0);
    setErrorFlash(false);
  }, [stopTimer]);

  const handleReset = useCallback(() => {
    stopTimer();
    startTimeRef.current = null;
    setIsStarted(false);
    setIsFinished(false);
    setTaskIndex(0);
    setCurrentInput('');
    setTaskHadError([]);
    setTotalErrors(0);
    setTotalCorrectKeys(0);
    setElapsedSec(0);
    setErrorFlash(false);
  }, [stopTimer]);

  const toggleHint = useCallback(() => setIsHintVisible((v) => !v), []);
  const toggleSettings = useCallback(() => setSettingsOpen((v) => !v), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  // Reset practice when text changes
  useEffect(() => {
    handleReset();
  }, [rawText, handleReset]);

  return {
    // tab
    activeTab,
    setActiveTab,
    // lookup
    lookupQuery,
    setLookupQuery,
    lookupResults,
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
    settingsOpen,
    toggleSettings,
    closeSettings,
    // controls
    handleStart,
    handleReset,
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
