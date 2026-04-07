import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import clsx from 'clsx'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { useAppConfig } from '@/provider/ConfigProvider'
import classes from './code-editor.module.scss'

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  height?: string
  minHeight?: string
  compact?: boolean
  language?: 'javascript' | 'plain'
}

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  height,
  minHeight = '33rem',
  compact = false,
  language = 'javascript',
}: CodeEditorProps) {
  const { theme } = useAppConfig()
  const editorHeight = height ?? minHeight

  const extensions = useMemo(
    () =>
      language === 'javascript'
        ? [javascript(), EditorView.lineWrapping]
        : [EditorView.lineWrapping],
    [language],
  )

  return (
    <div
      className={clsx(
        classes.root,
        compact && classes.compact,
        readOnly && classes.readOnly,
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
