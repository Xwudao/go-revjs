import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import wubiDictRaw from '@/assets/data/wubi_dictionary.json';
import wubiTextsRaw from '@/assets/data/wubi_text.json';

type WubiCodeDictionary = Record<string, string[]>;

const wubiDict = wubiDictRaw as WubiCodeDictionary;

let wubiPhraseDictCache: WubiCodeDictionary | null = null;
let phraseLengthsDescCache: number[] | null = null;
let wubiPhraseDictPromise: Promise<{
  dict: WubiCodeDictionary;
  phraseLengthsDesc: number[];
}> | null = null;

function buildPhraseLengthsDesc(dict: WubiCodeDictionary): number[] {
  return [...new Set(Object.keys(dict).map((phrase) => Array.from(phrase).length))]
    .filter((length) => length >= 2)
    .sort((left, right) => right - left);
}

async function loadWubiPhraseDict() {
  if (wubiPhraseDictCache && phraseLengthsDescCache) {
    return {
      dict: wubiPhraseDictCache,
      phraseLengthsDesc: phraseLengthsDescCache,
    };
  }

  if (!wubiPhraseDictPromise) {
    wubiPhraseDictPromise = import('@/assets/data/wubi_phrase_dictionary.json')
      .then((module) => {
        const dict = module.default as WubiCodeDictionary;
        const phraseLengthsDesc = buildPhraseLengthsDesc(dict);
        wubiPhraseDictCache = dict;
        phraseLengthsDescCache = phraseLengthsDesc;
        return { dict, phraseLengthsDesc };
      })
      .catch((error) => {
        wubiPhraseDictPromise = null;
        throw error;
      });
  }

  return wubiPhraseDictPromise;
}

export const wubiTexts = wubiTextsRaw as Array<{
  title: string;
  content: string;
}>;

export type TextSource = 'preset' | 'custom' | 'error';
export type PracticeMode = 'single' | 'phrase';
export type CharState = 'done' | 'done-error' | 'current' | 'skipped' | 'pending';

const SAVES_KEY = 'revjs:wubi-typing:saves';
const MAX_SAVES = 10;

export interface WubiSaveSlot {
  id: string;
  name: string;
  savedAt: number;
  textSource: TextSource;
  presetIndex: number;
  customText: string;
  practiceMode: PracticeMode;
  taskIndex: number;
}

interface TypingTask {
  displayStartIndex: number;
  displayEndIndex: number;
  text: string;
  codes: string[];
  kind: 'char' | 'phrase';
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function buildSingleTypingTasks(displayChars: string[]): TypingTask[] {
  return displayChars.reduce<TypingTask[]>((acc, char, index) => {
    const codes = wubiDict[char];
    if (codes && codes.length > 0) {
      acc.push({
        displayStartIndex: index,
        displayEndIndex: index,
        text: char,
        codes,
        kind: 'char',
      });
    }
    return acc;
  }, []);
}

function buildPhraseOptimizedTasks(
  displayChars: string[],
  phraseDict: WubiCodeDictionary,
  phraseLengthsDesc: number[],
): TypingTask[] {
  const tasks: TypingTask[] = [];

  for (let index = 0; index < displayChars.length; ) {
    let matched = false;

    for (const phraseLength of phraseLengthsDesc) {
      if (index + phraseLength > displayChars.length) {
        continue;
      }

      const phrase = displayChars.slice(index, index + phraseLength).join('');
      const codes = phraseDict[phrase];
      if (!codes || codes.length === 0) {
        continue;
      }

      tasks.push({
        displayStartIndex: index,
        displayEndIndex: index + phraseLength - 1,
        text: phrase,
        codes,
        kind: 'phrase',
      });
      index += phraseLength;
      matched = true;
      break;
    }

    if (matched) {
      continue;
    }

    const char = displayChars[index];
    const codes = wubiDict[char];
    if (codes && codes.length > 0) {
      tasks.push({
        displayStartIndex: index,
        displayEndIndex: index,
        text: char,
        codes,
        kind: 'char',
      });
    }
    index += 1;
  }

  return tasks;
}

export { formatTime };

export function useWubiTyping() {
  const [lookupQuery, setLookupQuery] = useState('');

  const isPassageMode = useMemo(
    () => Array.from(lookupQuery.trim()).length > 1,
    [lookupQuery],
  );

  const lookupResults = useMemo<Array<{ char: string; codes: string[] }>>(() => {
    const q = lookupQuery.trim();
    if (!q) return [];

    if (isPassageMode) {
      return Array.from(q).map((char) => ({
        char,
        codes: wubiDict[char] ?? [],
      }));
    }

    const byChar: Array<{ char: string; codes: string[] }> = [];
    const byCode: Array<{ char: string; codes: string[] }> = [];
    const normalizedQuery = q.toLowerCase();
    for (const [char, codes] of Object.entries(wubiDict)) {
      if (char === q) {
        byChar.push({ char, codes });
      } else if (codes.some((code) => code.startsWith(normalizedQuery))) {
        byCode.push({ char, codes });
      }
    }
    return [...byChar, ...byCode].slice(0, 60);
  }, [lookupQuery, isPassageMode]);

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

  const [saves, setSaves] = useState<WubiSaveSlot[]>(() => {
    try {
      const raw = localStorage.getItem(SAVES_KEY);
      if (raw) return JSON.parse(raw) as WubiSaveSlot[];
    } catch {}
    return [];
  });
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

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

  const [practiceMode, setPracticeMode] = useState<PracticeMode>(() => {
    try {
      const saved = localStorage.getItem('wubi-practice-mode');
      if (saved === 'single' || saved === 'phrase') return saved;
    } catch {}
    return 'single';
  });
  const [isHintVisible, setIsHintVisible] = useState(true);
  const [isCodeImageVisible, setIsCodeImageVisible] = useState(() => {
    try {
      return localStorage.getItem('wubi-code-image-visible') === 'true';
    } catch {
      return false;
    }
  });
  const [phraseDict, setPhraseDict] = useState<WubiCodeDictionary | null>(
    wubiPhraseDictCache,
  );
  const [phraseLengthsDesc, setPhraseLengthsDesc] = useState<number[]>(
    phraseLengthsDescCache ?? [],
  );
  const [isPhraseDictLoading, setIsPhraseDictLoading] = useState(false);
  const [phraseDictLoadError, setPhraseDictLoadError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('wubi-practice-mode', practiceMode);
    } catch {}
  }, [practiceMode]);

  useEffect(() => {
    if (practiceMode !== 'phrase' || phraseDict) return;

    let cancelled = false;
    setIsPhraseDictLoading(true);
    setPhraseDictLoadError(null);

    loadWubiPhraseDict()
      .then(({ dict, phraseLengthsDesc }) => {
        if (cancelled) return;
        setPhraseDict(dict);
        setPhraseLengthsDesc(phraseLengthsDesc);
      })
      .catch((error) => {
        if (cancelled) return;
        setPhraseDictLoadError(
          error instanceof Error ? error.message : '词组词典加载失败，请稍后重试。',
        );
      })
      .finally(() => {
        if (cancelled) return;
        setIsPhraseDictLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [phraseDict, practiceMode]);

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

  const [startTaskIndex, setStartTaskIndex] = useState(0);
  const [sessionStartIndex, setSessionStartIndex] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedSecRef = useRef(0);

  const rawText = useMemo(() => {
    if (textSource === 'custom') return customText;
    if (textSource === 'error') return Array.from(errorChars).join('');
    return wubiTexts[presetIndex]?.content ?? '';
  }, [customText, errorChars, presetIndex, textSource]);

  const displayChars = useMemo(() => Array.from(rawText), [rawText]);

  const typingTasks = useMemo(
    () =>
      practiceMode === 'phrase'
        ? phraseDict
          ? buildPhraseOptimizedTasks(displayChars, phraseDict, phraseLengthsDesc)
          : []
        : buildSingleTypingTasks(displayChars),
    [displayChars, phraseDict, phraseLengthsDesc, practiceMode],
  );

  const isPhraseModeLoading = practiceMode === 'phrase' && isPhraseDictLoading;
  const canStartPractice = !isPhraseModeLoading && typingTasks.length > 0;

  const displayIndexToTaskIndex = useMemo(() => {
    const map = new Map<number, number>();
    typingTasks.forEach((task, index) => {
      for (
        let displayIndex = task.displayStartIndex;
        displayIndex <= task.displayEndIndex;
        displayIndex += 1
      ) {
        map.set(displayIndex, index);
      }
    });
    return map;
  }, [typingTasks]);

  const taskCharOffsets = useMemo(() => {
    const offsets = [0];
    for (const task of typingTasks) {
      offsets.push(offsets[offsets.length - 1] + Array.from(task.text).length);
    }
    return offsets;
  }, [typingTasks]);

  const currentTask: TypingTask | null = typingTasks[taskIndex] ?? null;
  const nextTask: TypingTask | null = typingTasks[taskIndex + 1] ?? null;

  useEffect(() => {
    if (!isCodeImageVisible || !nextTask || nextTask.kind !== 'char') return;
    const img = new Image();
    img.src = `https://oss.misiai.com/wubi/${encodeURIComponent(nextTask.text)}.gif`;
  }, [isCodeImageVisible, nextTask]);

  const charStates = useMemo<CharState[]>(() => {
    if (!isStarted) {
      return displayChars.map(() => 'pending');
    }

    const currentTaskStartIndex = isFinished
      ? Infinity
      : (currentTask?.displayStartIndex ?? Infinity);
    const currentTaskEndIndex = isFinished ? -1 : (currentTask?.displayEndIndex ?? -1);

    return displayChars.map((_, index) => {
      if (index >= currentTaskStartIndex && index <= currentTaskEndIndex) {
        return 'current';
      }

      const taskAtIndex = displayIndexToTaskIndex.get(index);
      if (taskAtIndex !== undefined && taskAtIndex < taskIndex) {
        return taskHadError[taskAtIndex] ? 'done-error' : 'done';
      }

      if (index < currentTaskStartIndex) {
        return 'skipped';
      }

      return 'pending';
    });
  }, [
    currentTask,
    displayChars,
    displayIndexToTaskIndex,
    isFinished,
    taskHadError,
    taskIndex,
  ]);

  const completedChars = useMemo(() => {
    if (isFinished) {
      return taskCharOffsets[typingTasks.length] - taskCharOffsets[sessionStartIndex];
    }
    return taskCharOffsets[taskIndex] - taskCharOffsets[sessionStartIndex];
  }, [isFinished, sessionStartIndex, taskCharOffsets, taskIndex, typingTasks.length]);

  const practiceCharCount = useMemo(
    () => taskCharOffsets[typingTasks.length] - taskCharOffsets[sessionStartIndex],
    [sessionStartIndex, taskCharOffsets, typingTasks.length],
  );

  const wpm = useMemo(() => {
    if (elapsedSec === 0 || completedChars === 0) return 0;
    return Math.round((completedChars / elapsedSec) * 60);
  }, [completedChars, elapsedSec]);

  const accuracy = useMemo(() => {
    const total = totalCorrectKeys + totalErrors;
    if (total === 0) return 100;
    return Math.round((totalCorrectKeys / total) * 100);
  }, [totalCorrectKeys, totalErrors]);

  const progress = useMemo(() => {
    if (practiceCharCount <= 0) return 0;
    return Math.round((completedChars / practiceCharCount) * 100);
  }, [completedChars, practiceCharCount]);

  const startTimer = useCallback(() => {
    if (startTimeRef.current !== null) return;
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

  const currentCharRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isStarted && !isFinished) {
      currentCharRef.current?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      });
    }
  }, [isFinished, isStarted, taskIndex]);

  const inputRef = useRef<HTMLInputElement>(null);
  const isComposing = useRef(false);
  const justFinishedComposing = useRef(false);

  useEffect(() => {
    if (isStarted && !isFinished) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isFinished, isStarted, taskIndex]);

  const processInputString = useCallback(
    (input: string) => {
      if (!isStarted || isPaused || isFinished || !currentTask) return;
      startTimer();

      const inputChars = Array.from(input);
      let inputOffset = 0;
      let nextTaskIndex = taskIndex;
      let correctChars = 0;
      let errors = 0;
      let finished = false;
      const hadErrorPatch: Array<[number, boolean]> = [];

      while (inputOffset < inputChars.length) {
        const task = typingTasks[nextTaskIndex];
        if (!task) break;

        const taskLength = Array.from(task.text).length;
        const candidate = inputChars
          .slice(inputOffset, inputOffset + taskLength)
          .join('');
        if (candidate === task.text) {
          correctChars += taskLength;
          hadErrorPatch.push([nextTaskIndex, false]);
          inputOffset += taskLength;
          nextTaskIndex += 1;
          if (nextTaskIndex >= typingTasks.length) {
            finished = true;
            break;
          }
          continue;
        }

        errors += 1;
        hadErrorPatch.push([nextTaskIndex, true]);
        break;
      }

      if (correctChars > 0) {
        setTotalCorrectKeys((count) => count + correctChars);
      }

      if (errors > 0) {
        setTotalErrors((count) => count + errors);
        setErrorFlash(true);
        setTimeout(() => setErrorFlash(false), 250);
      }

      if (hadErrorPatch.length > 0) {
        setTaskHadError((prev) => {
          const next = [...prev];
          for (const [index, wasError] of hadErrorPatch) {
            if (wasError) {
              next[index] = true;
            } else if (next[index] === undefined) {
              next[index] = false;
            }
          }
          return next;
        });

        const newErrorChars = hadErrorPatch
          .filter(([, wasError]) => wasError)
          .flatMap(([index]) => Array.from(typingTasks[index].text));
        if (newErrorChars.length > 0) {
          setErrorChars((prev) => {
            const next = new Set(prev);
            for (const char of newErrorChars) next.add(char);
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
        setTaskIndex(nextTaskIndex);
      }
    },
    [
      currentTask,
      isFinished,
      isPaused,
      isStarted,
      startTimer,
      stopTimer,
      taskIndex,
      typingTasks,
    ],
  );

  const handleCompositionStart = useCallback(() => {
    isComposing.current = true;
  }, []);

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      isComposing.current = false;
      justFinishedComposing.current = true;
      const composed = e.data ?? '';
      if (composed) processInputString(composed);
      if (inputRef.current) inputRef.current.value = '';
    },
    [processInputString],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isComposing.current) {
        setCurrentInput(e.target.value);
        return;
      }

      if (justFinishedComposing.current) {
        justFinishedComposing.current = false;
        if (inputRef.current) inputRef.current.value = '';
        return;
      }

      const value = e.target.value;
      if (!value) return;
      processInputString(value);
      if (inputRef.current) inputRef.current.value = '';
    },
    [processInputString],
  );

  const handleStart = useCallback(() => {
    if (!canStartPractice) return;

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
  }, [canStartPractice, startTaskIndex, stopTimer, typingTasks.length]);

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

  const persistSaves = useCallback((next: WubiSaveSlot[]) => {
    setSaves(next);
    try {
      localStorage.setItem(SAVES_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const saveProgress = useCallback(
    (name: string) => {
      const slot: WubiSaveSlot = {
        id: String(Date.now()),
        name: name.trim() || `存档 ${new Date().toLocaleString('zh-CN')}`,
        savedAt: Date.now(),
        textSource,
        presetIndex,
        customText,
        practiceMode,
        taskIndex: isStarted ? taskIndex : startTaskIndex,
      };
      persistSaves([slot, ...saves].slice(0, MAX_SAVES));
    },
    [
      customText,
      isStarted,
      persistSaves,
      practiceMode,
      presetIndex,
      saves,
      startTaskIndex,
      taskIndex,
      textSource,
    ],
  );

  const loadSave = useCallback((slot: WubiSaveSlot) => {
    setTextSource(slot.textSource);
    setPresetIndex(slot.presetIndex);
    setCustomText(slot.customText);
    setPracticeMode(slot.practiceMode);
    setStartTaskIndex(slot.taskIndex);
    setIsSaveModalOpen(false);
  }, []);

  const deleteSave = useCallback(
    (id: string) => {
      persistSaves(saves.filter((s) => s.id !== id));
    },
    [persistSaves, saves],
  );

  const toggleHint = useCallback(() => setIsHintVisible((visible) => !visible), []);
  const toggleCodeImage = useCallback(() => {
    setIsCodeImageVisible((visible) => {
      const next = !visible;
      try {
        localStorage.setItem('wubi-code-image-visible', String(next));
      } catch {}
      return next;
    });
  }, []);
  const toggleSettings = useCallback(() => setSettingsOpen((open) => !open), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  useEffect(() => {
    handleReset();
    setStartTaskIndex(0);
  }, [handleReset, practiceMode, rawText]);

  useEffect(() => {
    const handleSaveShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        const name = `存档 ${new Date().toLocaleString('zh-CN')}`;
        saveProgress(name);
        toast.success(`已保存「${name}」`);
      }
    };
    document.addEventListener('keydown', handleSaveShortcut);
    return () => document.removeEventListener('keydown', handleSaveShortcut);
  }, [saveProgress]);

  return {
    lookupQuery,
    setLookupQuery,
    isPassageMode,
    lookupResults,
    errorChars,
    clearErrorChars,
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
    practiceMode,
    setPracticeMode,
    isPhraseModeLoading,
    phraseDictLoadError,
    canStartPractice,
    taskIndex,
    currentTask,
    currentInput,
    charStates,
    errorFlash,
    isStarted,
    isFinished,
    elapsedSec,
    wpm,
    accuracy,
    progress,
    practiceCharCount,
    totalErrors,
    formatTime,
    isHintVisible,
    toggleHint,
    isCodeImageVisible,
    toggleCodeImage,
    settingsOpen,
    toggleSettings,
    closeSettings,
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
    saves,
    isSaveModalOpen,
    setIsSaveModalOpen,
    saveName,
    setSaveName,
    saveProgress,
    loadSave,
    deleteSave,
  };
}
