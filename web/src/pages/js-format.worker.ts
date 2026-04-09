import { format } from 'prettier';
import babel from 'prettier/plugins/babel';
import estree from 'prettier/plugins/estree';

interface FormatRequest {
  code: string;
}

type FormatResponse =
  | { type: 'formatted'; code: string }
  | { type: 'error'; message: string };

self.onmessage = async (event: MessageEvent<FormatRequest>) => {
  try {
    const formatted = await format(event.data.code, {
      parser: 'babel',
      plugins: [babel, estree],
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: true,
      quoteProps: 'as-needed',
      trailingComma: 'es5',
      bracketSpacing: true,
      arrowParens: 'avoid',
    });

    const response: FormatResponse = {
      type: 'formatted',
      code: formatted,
    };

    self.postMessage(response);
  } catch (error) {
    const response: FormatResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : '格式化失败',
    };

    self.postMessage(response);
  }
};
