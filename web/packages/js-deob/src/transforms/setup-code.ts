import type { NodePath } from '@babel/traverse'
import type * as t from '@babel/types'
import * as parser from '@babel/parser'
import { generate } from '../ast-utils'

function getTopLevelStatement(path: NodePath<t.Node>) {
  if (path.parentPath?.isProgram()) {
    return path
  }

  return path.findParent(
    (parent): parent is NodePath<t.Node> => parent.parentPath?.isProgram() === true,
  )
}

function isImportBinding(path: NodePath<t.Node>): boolean {
  return path.isImportSpecifier() || path.isImportDefaultSpecifier() || path.isImportNamespaceSpecifier()
}

export function buildSetupCode(ast: t.File, seedPaths: Array<NodePath<t.Node> | null | undefined>) {
  const queue = seedPaths
    .filter((value): value is NodePath<t.Node> => Boolean(value))
    .map(path => getTopLevelStatement(path))
    .filter((value): value is NodePath<t.Node> => Boolean(value))

  if (queue.length === 0) {
    return ''
  }

  const selectedStatements = new Set<t.Node>()

  while (queue.length > 0) {
    const statementPath = queue.shift()!
    if (selectedStatements.has(statementPath.node)) {
      continue
    }

    selectedStatements.add(statementPath.node)

    statementPath.traverse({
      Identifier(identifierPath) {
        if (!identifierPath.isReferencedIdentifier()) {
          return
        }

        const binding = identifierPath.scope.getBinding(identifierPath.node.name)
        if (!binding || isImportBinding(binding.path)) {
          return
        }

        const bindingStatement = getTopLevelStatement(binding.path)
        if (!bindingStatement || bindingStatement.node === statementPath.node) {
          return
        }

        queue.push(bindingStatement)
      },
    })
  }

  const body = ast.program.body.filter(statement => selectedStatements.has(statement))
  const setupAst = parser.parse('', { sourceType: 'script' })
  setupAst.program.body = body

  return generate(setupAst, {
    compact: true,
    shouldPrintComment: () => false,
  })
}