import type { NodePath } from '@babel/traverse'
import type { Transform } from '../ast-utils'
import * as t from '@babel/types'
import { getPropName } from '../ast-utils'

function isSequenceString(value: string) {
  return /^\d+(\|\d+)*$/.test(value)
}

function inferSequenceFromObjectBinding(
  path: NodePath<t.MemberExpression>,
  expectedCaseCount: number,
): string[] {
  const splitTarget = path.node.object
  if (!t.isMemberExpression(splitTarget) || !t.isIdentifier(splitTarget.object)) {
    return []
  }

  const binding = path.scope.getBinding(splitTarget.object.name)
  if (!binding?.path.isVariableDeclarator()) {
    return []
  }

  const init = binding.path.node.init
  if (!t.isObjectExpression(init)) {
    return []
  }

  const targetPropName = getPropName(splitTarget.property)
  if (targetPropName) {
    const exactMatch = init.properties.find((property) => {
      return (
        t.isObjectProperty(property) &&
        getPropName(property.key) === targetPropName &&
        t.isStringLiteral(property.value) &&
        isSequenceString(property.value.value)
      )
    })

    if (
      exactMatch &&
      t.isObjectProperty(exactMatch) &&
      t.isStringLiteral(exactMatch.value)
    ) {
      return exactMatch.value.value.split('|')
    }
  }

  const candidates = init.properties.flatMap((property) => {
    if (!t.isObjectProperty(property) || !t.isStringLiteral(property.value)) {
      return []
    }

    if (!isSequenceString(property.value.value)) {
      return []
    }

    const parts = property.value.value.split('|')
    return parts.length === expectedCaseCount ? [parts] : []
  })

  return candidates.length === 1 ? candidates[0] : []
}

/**
 * 控制流扁平化
 * @example
 * function a() {
 *   var _0x263cfa = "1|3|2|0"["split"]("|"),
 *   _0x105b9b = 0;
 *
 *   while (true) {
 *      switch (_0x263cfa[_0x105b9b++]) {
 *        case "0":
 *          return _0x4b70fb;
 *
 *        case "1":
 *          if (_0x3d66ff !== "link" && _0x3d66ff !== "script") {
 *            return;
 *          }
 *          continue;
 *
 *        case "2":
 *          _0x4b70fb["charset"] = "utf-8";
 *          continue;
 *
 *        case "3":
 *          var _0x4b70fb = document["createElement"](_0x3d66ff);
 *          continue;
 *    }
 *    break;
 *   }
 * }
 * ⬇️
 * function a(){
 *   if (_0x3d66ff !== "link" && _0x3d66ff !== "script") {
 *     return;
 *   }
 *   var _0x4b70fb = document["createElement"](_0x3d66ff);
 *   _0x4b70fb["charset"] = "utf-8";
 *   return _0x4b70fb;
 * }
 */
export default {
  name: 'controlFlowSwitch',
  tags: ['unsafe'],
  scope: true,
  visitor() {
    return {
      SwitchStatement(switchPath) {
        // 判断父节点是否为循环节点
        const forOrWhileStatementPath = switchPath.findParent(
          (p) => p.isForStatement() || p.isWhileStatement(),
        )

        if (!forOrWhileStatementPath) return

        // 拿到函数的块语句
        const fnBlockStatementPath = forOrWhileStatementPath.findParent((p) =>
          p.isBlockStatement(),
        ) as unknown as NodePath<t.BlockStatement>
        if (!fnBlockStatementPath) return

        const expectedCaseCount = switchPath.node.cases.filter(
          (p) => p.test?.type === 'StringLiteral',
        ).length

        let shufferArr: string[] = []

        // 从整个函数的 BlockStatement 中遍历寻找 "1|3|2|0"["split"]
        fnBlockStatementPath.traverse({
          MemberExpression(path) {
            const { object, property } = path.node
            const propertyName = getPropName(property)
            if (
              (t.isStringLiteral(property) || t.isIdentifier(property)) &&
              propertyName === 'split'
            ) {
              if (t.isStringLiteral(object)) {
                const shufferString = object.value // "1|3|2|0"
                shufferArr = shufferString.split('|')

                // 顺带移除 var _0x263cfa = "1|3|2|0"["split"]("|"),
                const variableDeclarator = path.findParent((p) =>
                  p.isVariableDeclarator(),
                )

                if (variableDeclarator) variableDeclarator.remove()

                path.stop()
              } else if (t.isMemberExpression(object)) {
                shufferArr = inferSequenceFromObjectBinding(path, expectedCaseCount)

                if (shufferArr.length === 0) return

                // 顺带移除 var _0x263cfa = "1|3|2|0"["split"]("|"),
                const variableDeclarator = path.findParent((p) =>
                  p.isVariableDeclarator(),
                )

                if (variableDeclarator) variableDeclarator.remove()

                path.stop()
              }
            }
          },
        })

        if (shufferArr.length === 0) return

        // Build a map from case string → ordered statements (excluding trailing continue)
        const caseMap = new Map<string, t.Statement[]>()
        for (const c of switchPath.node.cases) {
          if (c.test?.type !== 'StringLiteral') continue
          const stmts = c.consequent
          // Drop the trailing ContinueStatement if present
          const lastNonContinue = stmts.findLastIndex((s) => !t.isContinueStatement(s))
          caseMap.set(
            (c.test as t.StringLiteral).value,
            lastNonContinue >= 0 ? stmts.slice(0, lastNonContinue + 1) : [],
          )
        }

        const sequences = shufferArr.flatMap((s) => caseMap.get(s) ?? []) // reorder and flatten all multi-statement cases

        fnBlockStatementPath.node.body.push(...sequences)

        const parentPath = switchPath.parentPath?.parentPath
        if (!parentPath) return

        // 将整个循环体都移除
        if (['WhileStatement', 'ForStatement'].includes(parentPath.type))
          parentPath.remove()
      },
    }
  },
} satisfies Transform
