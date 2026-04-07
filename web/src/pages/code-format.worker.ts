import { format } from 'prettier'
import babel from 'prettier/plugins/babel'
import estree from 'prettier/plugins/estree'
import html from 'prettier/plugins/html'
import postcss from 'prettier/plugins/postcss'
import graphql from 'prettier/plugins/graphql'
import markdown from 'prettier/plugins/markdown'

export type FormatLanguage =
  | 'javascript'
  | 'typescript'
  | 'html'
  | 'css'
  | 'scss'
  | 'less'
  | 'json'
  | 'json5'
  | 'markdown'
  | 'graphql'

export interface FormatOptions {
  printWidth: number
  tabWidth: number
  useTabs: boolean
  semi: boolean
  singleQuote: boolean
  trailingComma: 'none' | 'es5' | 'all'
}

interface FormatRequest {
  code: string
  language: FormatLanguage
  options: FormatOptions
}

type FormatResponse =
  | { type: 'formatted'; code: string }
  | { type: 'error'; message: string }

const parserMap: Record<FormatLanguage, string> = {
  javascript: 'babel',
  typescript: 'babel-ts',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  json5: 'json5',
  markdown: 'markdown',
  graphql: 'graphql',
}

function getPlugins(language: FormatLanguage) {
  switch (language) {
    case 'javascript':
    case 'typescript':
    case 'json':
    case 'json5':
      return [babel, estree]
    case 'html':
      return [html]
    case 'css':
    case 'scss':
    case 'less':
      return [postcss]
    case 'markdown':
      return [markdown]
    case 'graphql':
      return [graphql]
  }
}

self.onmessage = async (event: MessageEvent<FormatRequest>) => {
  const { code, language, options } = event.data

  try {
    const formatted = await format(code, {
      parser: parserMap[language],
      plugins: getPlugins(language),
      printWidth: options.printWidth,
      tabWidth: options.tabWidth,
      useTabs: options.useTabs,
      semi: options.semi,
      singleQuote: options.singleQuote,
      trailingComma: options.trailingComma,
    })

    const response: FormatResponse = { type: 'formatted', code: formatted }
    self.postMessage(response)
  } catch (error) {
    const response: FormatResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : '格式化失败',
    }
    self.postMessage(response)
  }
}
