import type { CSSProperties } from 'react'
import { useCallback, useMemo, useRef } from 'react'
import clsx from 'clsx'
import { css } from '@codemirror/lang-css'
import { go } from '@codemirror/lang-go'
import { html } from '@codemirror/lang-html'
import { java } from '@codemirror/lang-java'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import type { ViewUpdate } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { useAppConfig } from '@/provider/ConfigProvider'
import classes from './code-editor.module.scss'

export type CodeEditorLanguage =
  | 'javascript'
  | 'typescript'
  | 'go'
  | 'python'
  | 'html'
  | 'json'
  | 'css'
  | 'java'
  | 'plain'

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  height?: string
  minHeight?: string
  compact?: boolean
  /** Remove border and border-radius so the editor fills a parent bordered panel seamlessly. */
  seamless?: boolean
  language?: CodeEditorLanguage
  onCursorChange?: (pos: { line: number; col: number }) => void
}

function buildLangExtension(language: CodeEditorLanguage) {
  switch (language) {
    case 'javascript':
      return javascript()
    case 'typescript':
      return javascript({ typescript: true })
    case 'go':
      return go()
    case 'python':
      return python()
    case 'html':
      return html()
    case 'json':
      return json()
    case 'css':
      return css()
    case 'java':
      return java()
    default:
      return null
  }
}

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  height,
  minHeight = '33rem',
  compact = false,
  seamless = false,
  language = 'javascript',
  onCursorChange,
}: CodeEditorProps) {
  const { theme } = useAppConfig()
  // In seamless mode the .root is flex:1 inside its panel, so CodeMirror must
  // fill 100% of that flex space rather than an explicit calc() value.
  const editorHeight = height ?? minHeight

  const onCursorChangeRef = useRef(onCursorChange)
  onCursorChangeRef.current = onCursorChange

  const handleUpdate = useCallback((update: ViewUpdate) => {
    if (!update.selectionSet || !onCursorChangeRef.current) return
    const sel = update.state.selection.main
    const lineInfo = update.state.doc.lineAt(sel.head)
    onCursorChangeRef.current({ line: lineInfo.number, col: sel.head - lineInfo.from })
  }, [])

  const extensions = useMemo(() => {
    const langExt = buildLangExtension(language)
    return langExt ? [langExt, EditorView.lineWrapping] : [EditorView.lineWrapping]
  }, [language])

  return (
    <div
      className={clsx(
        classes.root,
        compact && classes.compact,
        readOnly && classes.readOnly,
        seamless && classes.seamless,
      )}
      style={
        {
          '--editor-height': editorHeight,
          '--editor-min-height': minHeight,
        } as CSSProperties
      }
    >
      <CodeMirror
        value={value}
        height={editorHeight}
        theme={theme === 'dark' ? oneDark : undefined}
        extensions={extensions}
        editable={!readOnly}
        readOnly={readOnly}
        onChange={onChange}
        onUpdate={handleUpdate}
        basicSetup={{
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          autocompletion: true,
          bracketMatching: true,
        }}
      />
    </div>
  )
}
