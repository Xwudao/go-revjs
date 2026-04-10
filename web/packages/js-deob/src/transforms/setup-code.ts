import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import * as parser from '@babel/parser';
import { generate } from '../ast-utils';

function getTopLevelStatement(path: NodePath<t.Node>) {
  if (path.parentPath?.isProgram()) {
    return path;
  }

  return path.findParent(
    (parent): parent is NodePath<t.Node> => parent.parentPath?.isProgram() === true,
  );
}

function isImportBinding(path: NodePath<t.Node>): boolean {
  return (
    path.isImportSpecifier() ||
    path.isImportDefaultSpecifier() ||
    path.isImportNamespaceSpecifier()
  );
}

/**
 * Returns true when `inner` is a descendant of (or equal to) `outer` in the
 * AST — i.e. the binding was declared WITHIN `outer`'s subtree and is therefore
 * a local variable / parameter, not an external dependency.
 */
function isDescendantOf(inner: NodePath<t.Node>, outer: NodePath<t.Node>): boolean {
  let p: NodePath | null = inner.parentPath;
  while (p) {
    if (p.node === outer.node) return true;
    p = p.parentPath;
  }
  return false;
}

/**
 * Build setup code when the decoder/array functions are nested inside an IIFE
 * (e.g. `!function apMain(){ function _za(){} function _zb(){} ... }()`).
 *
 * Instead of pulling in the entire containing IIFE (which would execute browser-
 * dependent code), we hoist just the needed function/variable declarations
 * directly to the top level of the generated setup script.
 */
function buildHoistedSetupCode(seedPaths: NodePath<t.Node>[]): string {
  const selectedNodes = new Set<t.Node>();
  const queue: NodePath<t.Node>[] = [...seedPaths];

  while (queue.length > 0) {
    const path = queue.shift()!;
    if (selectedNodes.has(path.node)) continue;
    selectedNodes.add(path.node);

    path.traverse({
      Identifier(identPath) {
        if (!identPath.isReferencedIdentifier()) return;

        const binding = identPath.scope.getBinding(identPath.node.name);
        if (!binding || isImportBinding(binding.path)) return;

        // Do not pull in program-level globals (e.g. Babel transpiler helpers)
        if (binding.path.parentPath?.isProgram()) return;

        if (selectedNodes.has(binding.path.node)) return;

        // Skip identifiers that are declared WITHIN the current path's own subtree
        // (i.e. local variables / function parameters). Only free variables need
        // to be hoisted into the setup code.
        if (isDescendantOf(binding.path, path)) return;

        const declPath = binding.path.isDeclaration()
          ? binding.path
          : binding.path.parentPath?.isVariableDeclaration()
            ? binding.path.parentPath
            : null;

        if (declPath && !selectedNodes.has(declPath.node)) {
          queue.push(declPath);
        }
      },
    });
  }

  if (selectedNodes.size === 0) return '';

  const codes: string[] = [];
  for (const node of selectedNodes) {
    codes.push(generate(node, { compact: true, shouldPrintComment: () => false }));
  }

  const combined = codes.join(';\n');
  try {
    const setupAst = parser.parse(combined, { sourceType: 'script' });
    return generate(setupAst, { compact: true, shouldPrintComment: () => false });
  } catch {
    // If re-parsing fails (unlikely), return the raw combined code
    return combined;
  }
}

export function buildSetupCode(
  ast: t.File,
  seedPaths: Array<NodePath<t.Node> | null | undefined>,
) {
  const validPaths = seedPaths.filter((value): value is NodePath<t.Node> =>
    Boolean(value),
  );

  if (validPaths.length === 0) {
    return '';
  }

  // When the decoder / string-array declarations live inside a nested
  // function or IIFE (not directly under Program), climbing all the way
  // up to the top-level statement would include the entire IIFE wrapper,
  // which may execute browser-specific code and crash the Node sandbox.
  // Instead, hoist just the needed declarations directly.
  const allAtProgramLevel = validPaths.every((p) => p.parentPath?.isProgram());
  if (!allAtProgramLevel) {
    return buildHoistedSetupCode(validPaths);
  }

  const queue = validPaths
    .map((path) => getTopLevelStatement(path))
    .filter((value): value is NodePath<t.Node> => Boolean(value));

  const selectedStatements = new Set<t.Node>();

  while (queue.length > 0) {
    const statementPath = queue.shift()!;
    if (selectedStatements.has(statementPath.node)) {
      continue;
    }

    selectedStatements.add(statementPath.node);

    statementPath.traverse({
      Identifier(identifierPath) {
        if (!identifierPath.isReferencedIdentifier()) {
          return;
        }

        const binding = identifierPath.scope.getBinding(identifierPath.node.name);
        if (!binding || isImportBinding(binding.path)) {
          return;
        }

        const bindingStatement = getTopLevelStatement(binding.path);
        if (!bindingStatement || bindingStatement.node === statementPath.node) {
          return;
        }

        queue.push(bindingStatement);
      },
    });
  }

  const body = ast.program.body.filter((statement) => selectedStatements.has(statement));
  const setupAst = parser.parse('', { sourceType: 'script' });
  setupAst.program.body = body;

  return generate(setupAst, {
    compact: true,
    shouldPrintComment: () => false,
  });
}
