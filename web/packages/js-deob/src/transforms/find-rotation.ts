import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import traverse from '../interop/babel-traverse';
import { deobLogger as logger } from '../ast-utils';
import { buildSetupCode } from './setup-code';

/** Returns true when a string looks like a deobfuscated identifier or literal value. */
function isAsciiPrintable(s: unknown): s is string {
  return (
    typeof s === 'string' && s.length > 0 && s.length < 100 && /^[\x20-\x7E]+$/.test(s)
  );
}

/**
 * Expand one level of alias: `const alias = decoderFn` → alias is also considered
 * a decoder name.  Repeated until stable.
 */
function expandAliases(ast: t.Node, baseNames: Set<string>): Set<string> {
  const all = new Set(baseNames);
  let changed = true;
  while (changed) {
    changed = false;
    traverse(ast, {
      VariableDeclarator(path) {
        const { id, init } = path.node;
        if (id.type !== 'Identifier' || !init || init.type !== 'Identifier') return;
        if (all.has(init.name) && !all.has(id.name)) {
          all.add(id.name);
          changed = true;
        }
      },
    });
  }
  return all;
}

/** Collect up to `limit` literal-argument call sites for any name in `names`. */
function collectSampleCalls(
  ast: t.Node,
  names: Set<string>,
  limit = 25,
): Array<[number, string]> {
  const out: Array<[number, string]> = [];
  traverse(ast, {
    CallExpression(path) {
      if (out.length >= limit) {
        path.stop();
        return;
      }
      const { callee, arguments: args } = path.node;
      if (callee.type !== 'Identifier' || !names.has(callee.name)) return;
      if (args.length < 2) return;
      const [a0, a1] = args;
      if (a0.type !== 'NumericLiteral' || a1.type !== 'StringLiteral') return;
      out.push([a0.value, a1.value]);
    },
  });
  return out;
}

/**
 * Brute-force the correct circular-rotation count for the string array.
 *
 * Tries each rotation 0…arrayLength synchronously (in the current Node process
 * via `new Function`).  Returns the rotation with the highest count of sample
 * decode calls that produce ASCII-printable strings.
 *
 * @param ast               Parsed program (after preprocessing)
 * @param stringArrayPath   NodePath of the string-array function/variable
 * @param decoderPaths      NodePath(s) of the decoder function(s)
 * @param decoderName       Primary decoder identifier name (e.g. `_0x4009`)
 * @param arrayFnName       Identifier name of the string-array getter (e.g. `_0x17ce`)
 * @param arrayLength       Number of elements in the string array
 */
export function findBestRotation(
  ast: t.File,
  stringArrayPath: NodePath<t.Node>,
  decoderPaths: Array<NodePath<t.Node>>,
  decoderName: string,
  arrayFnName: string,
  arrayLength: number,
): number {
  const noRotatorCode = buildSetupCode(ast, [stringArrayPath, ...decoderPaths]);
  if (!noRotatorCode) return 0;

  const aliasNames = expandAliases(ast, new Set([decoderName]));
  // Prefer direct decoder-name calls for the test (avoids alias complexity)
  const directCalls = collectSampleCalls(ast, new Set([decoderName]));
  const aliasCalls =
    directCalls.length < 10
      ? collectSampleCalls(ast, aliasNames, 25 - directCalls.length)
      : [];
  const sampleCalls = [...directCalls, ...aliasCalls].slice(0, 25);

  logger(
    `findBestRotation: ${sampleCalls.length} calls collected, scanning 0…${arrayLength}`,
  );
  if (sampleCalls.length === 0) return 0;

  const callsCode = sampleCalls
    .map(
      ([i, k]) =>
        `${decoderName}(${i},"${k.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`,
    )
    .join(',');

  let bestRot = 0;
  let bestScore = -1;

  for (let rot = 0; rot <= arrayLength; rot++) {
    const fnBody = [
      noRotatorCode,
      `var _a=${arrayFnName}();for(var _i=0;_i<${rot};_i++)_a.push(_a.shift());`,
      `return[${callsCode}];`,
    ].join('\n');

    try {
      const vals = new Function(fnBody)() as unknown[];
      const score = (vals as unknown[]).filter(isAsciiPrintable).length;
      if (score > bestScore) {
        bestScore = score;
        bestRot = rot;
        logger(`findBestRotation: rotation=${rot} score=${score}/${sampleCalls.length}`);
        if (score === sampleCalls.length) break;
      }
    } catch {
      // ignore – wrong rotation / empty array errors are expected
    }
  }

  logger(
    `findBestRotation: selected rotation=${bestRot} (score ${bestScore}/${sampleCalls.length})`,
  );
  return bestRot;
}

/**
 * Return a modified setup-code string that pre-rotates the string array by
 * `rotation` circular positions.  The rotation is applied via an IIFE appended
 * after the standard (no-rotator) setup code.
 */
export function buildPreRotatedSetupCode(
  ast: t.File,
  stringArrayPath: NodePath<t.Node>,
  decoderPaths: Array<NodePath<t.Node>>,
  arrayFnName: string,
  rotation: number,
): string {
  const base = buildSetupCode(ast, [stringArrayPath, ...decoderPaths]);
  if (rotation === 0) return base;

  const snippet =
    `;(function(){var _a=${arrayFnName}();` +
    `for(var _i=0;_i<${rotation};_i++)_a.push(_a.shift());})();`;

  return base + snippet;
}
