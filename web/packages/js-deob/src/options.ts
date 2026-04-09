import type { Sandbox } from './deobfuscate/vm';
import { createBrowserSandbox, createNodeSandbox } from './deobfuscate/vm';
import { isBrowser } from './utils/platform';

export interface Options {
  /** 解密器定位方式 */
  decoderLocationMethod?: 'callCount' | 'stringArray' | 'evalCode';
  /** 字符串数组长度，0 表示自动匹配 */
  decoderStringArrayLength?: number;
  /** 解密器调用次数 */
  decoderCallCount?: number;
  /** 执行代码函数 */
  setupCode?: string;
  /** 指明解密函数 */
  decoderNames?: string | string[];

  /** 是否标记关键信息 */
  isMarkEnable?: boolean;
  /** 关键标识符 */
  keywords?: string[];
  /** 变量名优化模式 */
  mangleMode?: 'off' | 'all' | 'hex' | 'short' | 'custom';
  /** 自定义变量名优化正则 */
  manglePattern?: string;
  /** 自定义变量名优化正则标志位 */
  mangleFlags?: string;
  /** 沙盒 */
  sandbox?: Sandbox;
}

export function createDefaultSandbox() {
  return isBrowser() ? createBrowserSandbox() : createNodeSandbox();
}

export const defaultOptions: Required<Options> = {
  decoderLocationMethod: 'stringArray',
  decoderStringArrayLength: 0,
  decoderCallCount: 150,
  setupCode: '',
  decoderNames: '',

  isMarkEnable: true,
  keywords: ['debugger'],

  mangleMode: 'off',
  manglePattern: '',
  mangleFlags: '',
  sandbox: createDefaultSandbox(),
};

export function mergeOptions(options: Options): asserts options is Required<Options> {
  const mergedOptions: Required<Options> = {
    ...defaultOptions,
    ...options,
    sandbox: options.sandbox ?? createDefaultSandbox(),
  };
  // backward compatibility: boolean mangle -> mode
  if (!options.mangleMode && typeof (options as any).mangle === 'boolean') {
    mergedOptions.mangleMode = (options as any).mangle ? 'all' : 'off';
  }
  Object.assign(options, mergedOptions);
}
