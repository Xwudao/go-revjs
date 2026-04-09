import { parse } from '@babel/parser';
import { expect } from 'vitest';
import { applyTransform, generate, type Transform } from './src/ast-utils';

function normalizeGeneratedCode(code: string) {
  if (code.length >= 2 && code.startsWith('"') && code.endsWith('"')) {
    try {
      return JSON.parse(code) as string;
    } catch {
      return code.slice(1, -1);
    }
  }
  return code;
}

function normalizeSnapshotText(snapshot: string) {
  const normalized = snapshot.replace(/\r\n/g, '\n');
  if (!normalized.includes('\n')) {
    return normalized;
  }

  const lines = normalized.split('\n');
  if (lines[0]?.trim() === '') {
    lines.shift();
  }
  if (lines.at(-1)?.trim() === '') {
    lines.pop();
  }

  const indent = lines
    .filter((line) => line.trim().length > 0)
    .reduce(
      (min, line) => Math.min(min, line.match(/^\s*/)?.[0].length ?? 0),
      Number.POSITIVE_INFINITY,
    );

  if (!Number.isFinite(indent)) {
    return lines.join('\n');
  }

  return lines.map((line) => line.slice(indent)).join('\n');
}

export function testTransform<TOptions>(
  transform: Transform<TOptions>,
  options?: TOptions,
) {
  return (input: string) => {
    const ast = parse(input, {
      sourceType: 'unambiguous',
      allowReturnOutsideFunction: true,
      errorRecovery: true,
      plugins: ['jsx'],
    });

    applyTransform(ast, transform, options);
    const output = normalizeGeneratedCode(generate(ast));
    return {
      toMatchInlineSnapshot(snapshot: string) {
        expect(output).toBe(normalizeSnapshotText(snapshot));
      },
      toMatchSnapshot() {
        expect(output).toMatchSnapshot();
      },
    };
  };
}
