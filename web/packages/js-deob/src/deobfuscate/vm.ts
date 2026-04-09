import type { NodePath } from '@babel/traverse';
import type { CallExpression } from '@babel/types';
import type { ArrayRotator } from './array-rotator';
import type { Decoder } from './decoder';
import type { StringArray } from './string-array';
import { parse } from '@babel/parser';
import * as t from '@babel/types';
import { deobLogger, generate } from '../ast-utils';

export type Sandbox = (code: string) => Promise<unknown>;

function stripModuleSyntaxForEval(code: string): string {
  if (!code.includes('import') && !code.includes('export')) {
    return code;
  }

  const ast = parse(code, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    errorRecovery: true,
    plugins: ['jsx'],
  });

  let changed = false;
  const body: t.Statement[] = [];

  for (const statement of ast.program.body) {
    if (t.isImportDeclaration(statement) || t.isExportAllDeclaration(statement)) {
      changed = true;
      continue;
    }

    if (t.isExportNamedDeclaration(statement)) {
      changed = true;
      if (statement.declaration) {
        body.push(statement.declaration);
      }
      continue;
    }

    if (t.isExportDefaultDeclaration(statement)) {
      changed = true;

      const declaration = statement.declaration;
      if (t.isFunctionDeclaration(declaration)) {
        body.push(
          declaration.id
            ? declaration
            : t.expressionStatement(
                t.functionExpression(
                  null,
                  declaration.params,
                  declaration.body,
                  declaration.generator,
                  declaration.async,
                ),
              ),
        );
        continue;
      }

      if (t.isClassDeclaration(declaration)) {
        body.push(
          declaration.id
            ? declaration
            : t.expressionStatement(
                t.classExpression(
                  null,
                  declaration.superClass,
                  declaration.body,
                  declaration.decorators ?? [],
                ),
              ),
        );
        continue;
      }

      if (t.isExpression(declaration)) {
        body.push(t.expressionStatement(declaration));
      }
      continue;
    }

    body.push(statement);
  }

  if (!changed) {
    return code;
  }

  ast.program.body = body;
  ast.program.sourceType = 'script';

  return generate(ast, {
    compact: true,
    shouldPrintComment: () => false,
  });
}

export function createNodeSandbox(): Sandbox {
  let contextPromise: Promise<{ context: any }> | undefined;

  async function getContext() {
    if (!contextPromise) {
      contextPromise = (async () => {
        const {
          default: { Isolate },
        } = await import('isolated-vm');
        const isolate = new Isolate();
        const context = await isolate.createContext();

        await context.eval(`
          globalThis.global = globalThis;
          if (typeof globalThis.atob !== 'function') {
            globalThis.atob = function (input) {
              const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
              const str = String(input).replace(/=+$/, '');
              if (str.length % 4 === 1) {
                throw new Error('InvalidCharacterError');
              }
              let output = '';
              let bitCount = 0;
              let bitStorage = 0;
              let buffer;
              let index = 0;
              while ((buffer = str.charAt(index++))) {
                buffer = chars.indexOf(buffer);
                if (buffer < 0) {
                  continue;
                }
                bitStorage = bitCount % 4 ? bitStorage * 64 + buffer : buffer;
                if (bitCount++ % 4) {
                  output += String.fromCharCode(255 & bitStorage >> (-2 * bitCount & 6));
                }
              }
              return output;
            };
          }
        `);

        return { context };
      })();
    }

    return contextPromise;
  }

  return async (code: string) => {
    const { context } = await getContext();

    return (await context.eval(code, {
      timeout: 10_000,
      copy: true,
      filename: 'file:///obfuscated.js',
    })) as unknown;
  };
}

export function createBrowserSandbox(): Sandbox {
  return async (code: string) => globalThis.eval(code) as unknown;
}

export class VMDecoder {
  decoders: Decoder[];
  private setupCode: string;
  private sandbox: Sandbox;

  constructor(
    sandbox: Sandbox,
    stringArray: StringArray,
    decoders: Decoder[],
    rotator?: ArrayRotator,
  ) {
    this.sandbox = sandbox;
    this.decoders = decoders;

    // Generate as compact to bypass the self defense
    // (which tests someFunction.toString against a regex)
    const generateOptions = {
      compact: true,
      shouldPrintComment: () => false,
    };
    const stringArrayCode = generate(stringArray.path.node, generateOptions);
    const rotatorCode = rotator ? generate(rotator.node, generateOptions) : '';
    const decoderCode = decoders
      .map((decoder) => generate(decoder.path.node, generateOptions))
      .join(';\n');

    this.setupCode = [stringArrayCode, rotatorCode, decoderCode].join(';\n');
  }

  async decode(calls: NodePath<CallExpression>[]): Promise<unknown[]> {
    const code = stripModuleSyntaxForEval(`(() => {
      ${this.setupCode}
      return [${calls.join(',')}]
    })()`);

    try {
      const result = await this.sandbox(code);
      return result as unknown[];
    } catch {
      // eslint-disable-next-line unused-imports/no-unused-vars
      // ignore
    }

    try {
      const result = await globalThis.eval(code);
      return result as unknown[];
    } catch (error) {
      deobLogger('global.eval error:', error);
      throw error;
    }
  }
}

export async function evalCode(sandbox: Sandbox, code: string) {
  const executableCode = stripModuleSyntaxForEval(code);

  try {
    return (await sandbox(executableCode)) as unknown;
  } catch (sandboxError) {
    try {
      return globalThis.eval(executableCode) as unknown;
    } catch (evalError) {
      deobLogger('evalCode error:', evalError);
      throw sandboxError;
    }
  }
}
