import { minify } from 'terser';

interface MinifyRequest {
  code: string;
}

type MinifyResponse =
  | { type: 'minified'; code: string }
  | { type: 'error'; message: string };

self.onmessage = async (event: MessageEvent<MinifyRequest>) => {
  try {
    const result = await minify(event.data.code, {
      compress: {},
      mangle: {},
      format: {},
    });

    const response: MinifyResponse = {
      type: 'minified',
      code: result.code || event.data.code,
    };

    self.postMessage(response);
  } catch (error) {
    const response: MinifyResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : '压缩失败',
    };

    self.postMessage(response);
  }
};
