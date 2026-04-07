import type { Transform } from '../ast-utils'
import * as t from '@babel/types'

const versionMarkerPattern = /^jsjiami\.(com|cn)\.v\d+$/i

export default {
  name: 'unused-version-markers',
  tags: ['safe'],
  scope: true,
  visitor() {
    return {
      VariableDeclarator(path) {
        const { id, init } = path.node
        if (!t.isIdentifier(id) || !t.isStringLiteral(init)) return
        if (!versionMarkerPattern.test(init.value)) return

        const binding = path.scope.getBinding(id.name)
        if (!binding) return
        if (binding.referencePaths.length > 0 || binding.constantViolations.length > 0)
          return

        if (!path.parentPath?.isVariableDeclaration()) return

        if (path.parentPath.node.declarations.length === 1) {
          path.parentPath.remove()
        } else {
          path.remove()
        }

        this.changes++
      },
    }
  },
} satisfies Transform
