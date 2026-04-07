import type { CSSProperties } from 'react'
import { useMemo } from 'react'
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
  language?: CodeEditorLanguage
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
  language = 'javascript',
}: CodeEditorProps) {
  const { theme } = useAppConfig()
  const editorHeight = height ?? minHeight

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
