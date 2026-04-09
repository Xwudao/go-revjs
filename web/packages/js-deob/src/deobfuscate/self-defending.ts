import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { Transform } from '../ast-utils';
import * as m from '@codemod/matchers';
import { findParent, iife } from '../ast-utils';

// SingleCallController: https://github.com/javascript-obfuscator/javascript-obfuscator/blob/d7f73935557b2cd15a2f7cd0b01017d9cddbd015/src/custom-code-helpers/common/templates/SingleCallControllerTemplate.ts

// Works for
// self defending: https://github.com/javascript-obfuscator/javascript-obfuscator/blob/d7f73935557b2cd15a2f7cd0b01017d9cddbd015/src/custom-code-helpers/self-defending/templates/SelfDefendingTemplate.ts
// domain lock: https://github.com/javascript-obfuscator/javascript-obfuscator/blob/d7f73935557b2cd15a2f7cd0b01017d9cddbd015/src/custom-code-helpers/domain-lock/templates/DomainLockTemplate.ts
// console output: https://github.com/javascript-obfuscator/javascript-obfuscator/blob/d7f73935557b2cd15a2f7cd0b01017d9cddbd015/src/custom-code-helpers/console-output/templates/ConsoleOutputDisableTemplate.ts
// debug protection function call: https://github.com/javascript-obfuscator/javascript-obfuscator/blob/d7f73935557b2cd15a2f7cd0b01017d9cddbd015/src/custom-code-helpers/debug-protection/templates/debug-protection-function-call/DebugProtectionFunctionCallTemplate.ts

export default {
  name: 'self-defending',
  tags: ['safe'],
  scope: true,
  visitor() {
    const emptyIife = iife([], m.blockStatement([]));

    return {
      VariableDeclarator(path) {
        const match = matchSelfDefendingController(path.node);
        if (!match) return;

        const binding = path.scope.getBinding(match.callControllerName);
        if (!binding) return;

        binding.referencePaths
          .filter((ref) => ref.parent.type === 'CallExpression')
          .forEach((ref) => {
            if (ref.parentPath?.parent.type === 'CallExpression') {
              ref.parentPath.parentPath?.remove();
            } else {
              removeSelfDefendingRefs(ref as NodePath<t.Identifier>);
            }

            findParent(ref, emptyIife)?.remove();
            this.changes++;
          });

        path.remove();
        this.changes++;
      },
    };
  },
} satisfies Transform;

function isApplyLikeCall(
  node: t.Node | null | undefined,
  fnName: string,
  contextName: string,
) {
  if (!t.isCallExpression(node)) return false;
  if (!t.isMemberExpression(node.callee)) return false;
  if (!t.isIdentifier(node.callee.object, { name: fnName })) return false;
  if (node.arguments.length !== 2) return false;

  const [contextArg, argumentsArg] = node.arguments;
  return (
    t.isIdentifier(contextArg, { name: contextName }) &&
    t.isIdentifier(argumentsArg, { name: 'arguments' })
  );
}

function isTrueLike(node: t.Node | null | undefined) {
  return (
    t.isBooleanLiteral(node, { value: true }) ||
    (t.isUnaryExpression(node, { operator: '!' }) &&
      t.isNumericLiteral(node.argument, { value: 0 }))
  );
}

function isFalseLike(node: t.Node | null | undefined) {
  return (
    t.isBooleanLiteral(node, { value: false }) ||
    (t.isUnaryExpression(node, { operator: '!' }) &&
      t.isArrayExpression(node.argument) &&
      node.argument.elements.length === 0)
  );
}

function isEmptyFunction(node: t.Node | null | undefined) {
  return (
    t.isFunctionExpression(node) &&
    node.params.length === 0 &&
    node.body.body.length === 0
  );
}

function hasApplySequence(
  statements: t.Statement[],
  fnName: string,
  contextName: string,
) {
  if (statements.length !== 3) return false;

  const [resultDeclaration, nullAssignment, returnResult] = statements;
  if (
    !t.isVariableDeclaration(resultDeclaration) ||
    resultDeclaration.declarations.length !== 1
  )
    return false;
  const [resultDeclarator] = resultDeclaration.declarations;
  if (
    !t.isIdentifier(resultDeclarator.id) ||
    !isApplyLikeCall(resultDeclarator.init, fnName, contextName)
  )
    return false;

  if (
    !t.isExpressionStatement(nullAssignment) ||
    !t.isAssignmentExpression(nullAssignment.expression, { operator: '=' })
  )
    return false;
  if (
    !t.isIdentifier(nullAssignment.expression.left, { name: fnName }) ||
    !t.isNullLiteral(nullAssignment.expression.right)
  )
    return false;

  return (
    t.isReturnStatement(returnResult) &&
    t.isIdentifier(returnResult.argument, { name: resultDeclarator.id.name })
  );
}

function findGuardedApplySequence(
  statements: t.Statement[],
  fnName: string,
  contextName: string,
) {
  for (const statement of statements) {
    if (
      !t.isIfStatement(statement) ||
      !t.isIdentifier(statement.test, { name: fnName })
    ) {
      continue;
    }

    if (!t.isBlockStatement(statement.consequent)) {
      return false;
    }

    if (hasApplySequence(statement.consequent.body, fnName, contextName)) {
      return true;
    }

    for (const nestedStatement of statement.consequent.body) {
      if (!t.isIfStatement(nestedStatement)) continue;

      if (
        t.isBlockStatement(nestedStatement.consequent) &&
        hasApplySequence(nestedStatement.consequent.body, fnName, contextName)
      ) {
        return true;
      }

      if (
        t.isBlockStatement(nestedStatement.alternate) &&
        hasApplySequence(nestedStatement.alternate.body, fnName, contextName)
      ) {
        return true;
      }
    }

    return false;
  }

  return false;
}

function matchSelfDefendingController(node: t.VariableDeclarator) {
  if (!t.isIdentifier(node.id)) return null;
  if (!t.isCallExpression(node.init) || node.init.arguments.length !== 0) return null;

  const callee = node.init.callee;
  if (!t.isFunctionExpression(callee) && !t.isArrowFunctionExpression(callee))
    return null;
  if (!t.isBlockStatement(callee.body) || callee.body.body.length < 2) return null;

  const returnControllerStatement = callee.body.body.at(-1);
  if (
    !t.isReturnStatement(returnControllerStatement) ||
    !t.isFunctionExpression(returnControllerStatement.argument)
  )
    return null;

  const firstCallDeclarator = callee.body.body
    .slice(0, -1)
    .flatMap((statement) =>
      t.isVariableDeclaration(statement) ? statement.declarations : [],
    )
    .find((declarator) => t.isIdentifier(declarator.id) && isTrueLike(declarator.init));
  if (!firstCallDeclarator || !t.isIdentifier(firstCallDeclarator.id)) return null;
  const firstCallName = firstCallDeclarator.id.name;

  const controller = returnControllerStatement.argument;
  if (controller.params.length !== 2) return null;
  const [contextParam, fnParam] = controller.params;
  if (!t.isIdentifier(contextParam) || !t.isIdentifier(fnParam)) return null;
  if (controller.body.body.length < 3) return null;

  const returnWrapped = controller.body.body.at(-1);
  if (!t.isReturnStatement(returnWrapped) || !t.isIdentifier(returnWrapped.argument))
    return null;
  const wrappedName = returnWrapped.argument.name;

  const flipFirstCall = controller.body.body
    .slice(0, -1)
    .findLast(
      (statement) =>
        t.isExpressionStatement(statement) &&
        t.isAssignmentExpression(statement.expression, { operator: '=' }) &&
        t.isIdentifier(statement.expression.left, { name: firstCallName }) &&
        isFalseLike(statement.expression.right),
    );
  if (!flipFirstCall || !t.isExpressionStatement(flipFirstCall)) return null;

  const wrappedDeclarator = controller.body.body
    .slice(0, controller.body.body.indexOf(flipFirstCall))
    .flatMap((statement) =>
      t.isVariableDeclaration(statement) ? statement.declarations : [],
    )
    .find(
      (declarator) =>
        t.isIdentifier(declarator.id, { name: wrappedName }) &&
        t.isConditionalExpression(declarator.init),
    );
  if (
    !wrappedDeclarator ||
    !t.isIdentifier(wrappedDeclarator.id) ||
    !t.isConditionalExpression(wrappedDeclarator.init)
  )
    return null;

  const wrappedConditional = wrappedDeclarator.init;
  if (!t.isIdentifier(wrappedConditional.test, { name: firstCallName })) return null;
  if (
    !t.isFunctionExpression(wrappedConditional.consequent) ||
    !isEmptyFunction(wrappedConditional.alternate)
  )
    return null;

  const wrappedBody = wrappedConditional.consequent.body.body;
  if (!findGuardedApplySequence(wrappedBody, fnParam.name, contextParam.name))
    return null;

  return {
    callControllerName: node.id.name,
  };
}

function removeSelfDefendingRefs(path: NodePath<t.Identifier>) {
  const varName = m.capture(m.anyString());
  const varMatcher = m.variableDeclarator(
    m.identifier(varName),
    m.callExpression(m.identifier(path.node.name), m.arrayOf(m.anyExpression())),
  );
  const callMatcher = m.expressionStatement(
    m.callExpression(m.identifier(m.fromCapture(varName)), []),
  );
  const varDecl = findParent(path, varMatcher);

  if (varDecl) {
    const binding = varDecl.scope.getBinding(varName.current!);

    binding?.referencePaths.forEach((ref) => {
      if (callMatcher.match(ref.parentPath?.parent)) {
        ref.parentPath?.parentPath?.remove();
      }
    });
    varDecl.remove();
  }
}
