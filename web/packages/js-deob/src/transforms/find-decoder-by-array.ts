import type { Binding, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { ArrayRotator } from '../deobfuscate/array-rotator';

import traverse from '../interop/babel-traverse';
import * as m from '@codemod/matchers';
import { deobLogger as logger, undefinedMatcher } from '../ast-utils';
import { Decoder } from '../deobfuscate/decoder';
import { buildSetupCode } from './setup-code';

/**
 * Checks if the array variable is passed as the first argument to an IIFE
 * Example: (function(_0x2684bf, _0x5d23f1) { ... }(arr, 0x128));
 */
function hasIIFEReference(binding: Binding): boolean {
  const iifeMatcher = m.callExpression(
    m.or(m.functionExpression(), m.arrowFunctionExpression()),
  );
  return binding.referencePaths.some((refPath) => {
    const parent = refPath.parent;
    if (!iifeMatcher.match(parent)) return false;
    const callExpr = parent as t.CallExpression;
    return callExpr.arguments[0] === refPath.node;
  });
}

/**
 * Checks if the array variable is accessed as a member expression inside a function
 * Example: var _0x3028 = function(_0x2308a4, _0x573528) {
 *     var _0x29a1e7 = arr[_0x2308a4];
 *     return _0x29a1e7;
 * };
 */
function hasMemberAccessInFunction(binding: Binding): boolean {
  return binding.referencePaths.some((refPath) => {
    if (refPath.parentKey !== 'object') return false;
    // Check if this reference is inside a function
    return refPath.findParent((p) => p.isFunction()) !== null;
  });
}

function getStringArrayLength(node: t.Node | null | undefined): number | undefined {
  if (!node) return;

  if (t.isArrayExpression(node)) {
    let length = 0;
    for (const element of node.elements) {
      if (
        element === null ||
        t.isIdentifier(element, { name: 'undefined' }) ||
        t.isIdentifier(element)
      ) {
        length++;
        continue;
      }
      if (t.isStringLiteral(element)) {
        length++;
        continue;
      }
      // Handle spread elements: [...subArray] or ...(IIFE)()
      if (t.isSpreadElement(element)) {
        const spreadLength = getStringArrayLength(element.argument);
        if (spreadLength === undefined) return;
        length += spreadLength;
        continue;
      }
      return;
    }
    return length;
  }

  if (
    t.isCallExpression(node) &&
    t.isMemberExpression(node.callee) &&
    !node.callee.computed &&
    t.isIdentifier(node.callee.property, { name: 'concat' })
  ) {
    const baseLength = getStringArrayLength(node.callee.object);
    if (baseLength === undefined) return;

    let totalLength = baseLength;
    for (const argument of node.arguments) {
      if (!t.isExpression(argument)) {
        return;
      }

      const argumentLength = getStringArrayLength(argument);
      if (argumentLength === undefined) return;
      totalLength += argumentLength;
    }

    return totalLength;
  }

  if (
    t.isCallExpression(node) &&
    (t.isFunctionExpression(node.callee) || t.isArrowFunctionExpression(node.callee)) &&
    node.arguments.length === 0
  ) {
    if (t.isBlockStatement(node.callee.body)) {
      if (node.callee.body.body.length !== 1) return;
      const [statement] = node.callee.body.body;
      if (!t.isReturnStatement(statement)) return;
      return getStringArrayLength(statement.argument);
    }

    return getStringArrayLength(node.callee.body);
  }
}

function getWrappedStringArrayInfo(path: NodePath<t.FunctionDeclaration>) {
  const { id, params, body } = path.node;
  if (!id || params.length !== 0 || body.body.length < 2) return;

  const [firstStatement] = body.body;
  if (
    !t.isVariableDeclaration(firstStatement) ||
    firstStatement.declarations.length !== 1
  ) {
    return;
  }

  const [declarator] = firstStatement.declarations;
  if (!t.isIdentifier(declarator.id)) return;

  const length = getStringArrayLength(declarator.init);
  if (length === undefined) return;

  const arrayIdentifier = declarator.id.name;
  const tailStatements = body.body.slice(1);

  const isArrayGetter = (fn: t.FunctionExpression | t.ArrowFunctionExpression) => {
    if (fn.params.length !== 0) return false;

    if (t.isBlockStatement(fn.body)) {
      if (fn.body.body.length !== 1) return false;
      const [statement] = fn.body.body;
      return (
        t.isReturnStatement(statement) &&
        t.isIdentifier(statement.argument, { name: arrayIdentifier })
      );
    }

    return t.isIdentifier(fn.body, { name: arrayIdentifier });
  };

  const isSelfAssignment = (expression: t.AssignmentExpression) => {
    return (
      t.isIdentifier(expression.left, { name: id.name }) &&
      (t.isFunctionExpression(expression.right) ||
        t.isArrowFunctionExpression(expression.right)) &&
      isArrayGetter(expression.right)
    );
  };

  if (tailStatements.length === 1) {
    const [statement] = tailStatements;
    if (
      t.isReturnStatement(statement) &&
      t.isCallExpression(statement.argument) &&
      t.isAssignmentExpression(statement.argument.callee) &&
      isSelfAssignment(statement.argument.callee)
    ) {
      return { name: id.name, length };
    }
  }

  if (tailStatements.length === 2) {
    const [assignmentStatement, returnStatement] = tailStatements;
    if (
      t.isExpressionStatement(assignmentStatement) &&
      t.isAssignmentExpression(assignmentStatement.expression) &&
      isSelfAssignment(assignmentStatement.expression) &&
      t.isReturnStatement(returnStatement) &&
      t.isCallExpression(returnStatement.argument) &&
      t.isIdentifier(returnStatement.argument.callee, { name: id.name }) &&
      returnStatement.argument.arguments.length === 0
    ) {
      return { name: id.name, length };
    }
  }
}

/**
 * Creates matchers for wrapped string array function pattern:
 * function _0x4e5f() {
 *   var _0x4d29d7 = ['vxLduuS', ...];
 *   _0x4e5f = function () { return _0x4d29d7; };
 *   return _0x4e5f();
 * }
 */
function createWrappedArrayMatcher() {
  const functionName = m.capture(m.anyString());
  const arrayIdentifier = m.capture(m.identifier());
  const arrayExpression = m.capture(
    m.arrayExpression(m.arrayOf(m.or(m.stringLiteral(), undefinedMatcher))),
  );

  // getStringArray = function () { return array; };
  const functionAssignment = m.assignmentExpression(
    '=',
    m.identifier(m.fromCapture(functionName)),
    m.functionExpression(
      undefined,
      [],
      m.blockStatement([m.returnStatement(m.fromCapture(arrayIdentifier))]),
    ),
  );

  const variableDeclaration = m.variableDeclaration(undefined, [
    m.variableDeclarator(arrayIdentifier, arrayExpression),
  ]);

  // function getStringArray() { ... }
  const matcher = m.functionDeclaration(
    m.identifier(functionName),
    [],
    m.or(
      // var array = ["hello", "world"];
      // return (getStringArray = function () { return array; })();
      m.blockStatement([
        variableDeclaration,
        m.returnStatement(m.callExpression(functionAssignment)),
      ]),
      // var array = ["hello", "world"];
      // getStringArray = function () { return array; };
      // return getStringArray();
      m.blockStatement([
        variableDeclaration,
        m.expressionStatement(functionAssignment),
        m.returnStatement(m.callExpression(m.identifier(functionName))),
      ]),
    ),
  );

  return { matcher, functionName, arrayExpression };
}

/**
 * Process references to find rotators and decoders
 */
function processReferences(
  binding: Binding,
  stringArrayName: string,
  rotators: ArrayRotator[],
  decoders: Decoder[],
) {
  binding.referencePaths.forEach((r) => {
    if (r.parentKey === 'callee') {
      const parent = r.find((p) => p.isFunctionDeclaration());
      if (parent?.isFunctionDeclaration() && parent.node.id!.name !== stringArrayName) {
        // function decoder(x){
        //   return array(x)
        // }
        decoders.push(new Decoder(parent.node.id!.name, parent.node.id!.name, parent));
      }
    }

    if (r.parentKey === 'object') {
      const parent = r.find((p) => p.isFunctionDeclaration());
      if (parent?.isFunctionDeclaration() && parent.node.id!.name !== stringArrayName) {
        // function decoder(x){
        //   return array[x]
        // }
        decoders.push(new Decoder(parent.node.id!.name, parent.node.id!.name, parent));
      }
    }

    if (r.parentKey === 'arguments') {
      const parent = r.parentPath;
      const parent_expression = parent?.findParent((p) => p.isExpressionStatement());
      if (parent_expression?.isExpressionStatement()) {
        // (function (h) {
        //     // ...
        // })(array)
        rotators.push(parent_expression);
        return;
      }

      if (parent?.parentPath?.isVariableDeclarator()) {
        // function decoder() {
        //  var a = xxx(array)
        // }
        const funcDeclaration = parent?.parentPath.findParent((p) =>
          p.isFunctionDeclaration(),
        );
        if (funcDeclaration?.isFunctionDeclaration()) {
          logger(`发现解密器 (变量派生): ${funcDeclaration.node.id!.name}`);
          decoders.push(
            new Decoder(
              funcDeclaration.node.id!.name,
              funcDeclaration.node.id!.name,
              funcDeclaration,
            ),
          );
        }
      }
    }
  });
}

function normalizeExpectedLength(expectedLength?: number) {
  return typeof expectedLength === 'number' && expectedLength > 0
    ? expectedLength
    : undefined;
}

export function findDecoderByArray(ast: t.Node, expectedLength?: number) {
  // 大数组 有可能是以函数形式包裹的
  let stringArray:
    | {
        path: NodePath<t.Node>;
        references: NodePath[];
        name: string;
        length: number;
      }
    | undefined;
  // 乱序函数
  const rotators: ArrayRotator[] = [];
  // 解密器
  const decoders: Decoder[] = [];

  // Create matcher for wrapped array function pattern
  const {
    matcher: wrappedArrayMatcher,
    functionName: wrappedFunctionName,
    arrayExpression: wrappedArrayExpression,
  } = createWrappedArrayMatcher();
  const targetLength = normalizeExpectedLength(expectedLength);

  traverse(ast, {
    // Handle wrapped string array function pattern:
    // function _0x4e5f() {
    //   var _0x4d29d7 = ['vxLduuS', ...];
    //   _0x4e5f = function () { return _0x4d29d7; };
    //   return _0x4e5f();
    // }
    FunctionDeclaration(path) {
      if (stringArray) return; // Already found

      const wrappedInfo = getWrappedStringArrayInfo(path);

      if (wrappedInfo) {
        const { name, length } = wrappedInfo;

        if (targetLength !== undefined && length !== targetLength) {
          logger(`跳过包装字符串数组函数: ${name}，长度 ${length}，期望 ${targetLength}`);
          return;
        }

        const binding = path.scope.getBinding(name);

        if (!binding) return;

        logger(`发现包装的字符串数组函数: ${name}`);

        stringArray = {
          path,
          references: binding.referencePaths,
          name,
          length,
        };

        // 通过引用 找到 数组乱序代码 与 解密函数代码
        processReferences(binding, name, rotators, decoders);

        path.skip();
        return;
      }

      if (wrappedArrayMatcher.match(path.node)) {
        const name = wrappedFunctionName.current!;
        const length = wrappedArrayExpression.current!.elements.length;

        if (targetLength !== undefined && length !== targetLength) {
          logger(`跳过包装字符串数组函数: ${name}，长度 ${length}，期望 ${targetLength}`);
          return;
        }

        const binding = path.scope.getBinding(name);

        if (!binding) return;

        logger(`发现包装的字符串数组函数: ${name}`);

        stringArray = {
          path,
          references: binding.referencePaths,
          name,
          length,
        };

        // 通过引用 找到 数组乱序代码 与 解密函数代码
        processReferences(binding, name, rotators, decoders);

        path.skip();
      }
    },

    ArrayExpression(path) {
      if (stringArray) return; // Already found by FunctionDeclaration visitor

      const stringArrayDeclaration = path.findParent(
        (p) =>
          p.isVariableDeclarator() ||
          p.isFunctionDeclaration() ||
          p.isExpressionStatement(),
      );

      if (!stringArrayDeclaration) return;

      // if (!stringArrayDeclaration?.parentPath?.isProgram())
      // return

      let stringArrayName = '';
      let stringArrayPath;
      if (stringArrayDeclaration.isVariableDeclarator()) {
        // var a = []
        stringArrayName = (stringArrayDeclaration.node.id as t.Identifier).name;
        stringArrayPath = stringArrayDeclaration.parentPath;

        // 可能会被在包裹一层
        const parent = stringArrayPath.findParent((p) => p.isFunctionDeclaration());
        if (parent && parent.isFunctionDeclaration()) {
          stringArrayName = parent.node.id!.name;
          stringArrayPath = parent;
        }
      } else if (stringArrayDeclaration.isFunctionDeclaration()) {
        // function a(){ return []}
        stringArrayName = (stringArrayDeclaration.node.id as t.Identifier).name;
        stringArrayPath = stringArrayDeclaration;
      } else if (stringArrayDeclaration.isExpressionStatement()) {
        if (stringArrayDeclaration.node.expression.type === 'AssignmentExpression') {
          // a = []
          stringArrayName = (stringArrayDeclaration.node.expression.left as t.Identifier)
            .name;
          stringArrayPath = stringArrayDeclaration;
        }
      }

      const binding = path.scope.getBinding(stringArrayName);
      if (!binding) return;

      const candidateLength = path.node.elements.length;

      if (targetLength !== undefined && candidateLength !== targetLength) {
        logger(
          `跳过字符串数组候选: ${stringArrayName || '<anonymous>'}，长度 ${candidateLength}，期望 ${targetLength}`,
        );
        return;
      }

      // Check if the array variable satisfies both conditions:
      // 1. Passed as first argument to an IIFE
      // 2. Accessed as member expression inside a function
      if (!hasIIFEReference(binding) || !hasMemberAccessInFunction(binding)) {
        return;
      }

      stringArray = {
        path: stringArrayPath!,
        references: binding.referencePaths,
        name: stringArrayName,
        length: candidateLength,
      };

      // 通过引用 找到 数组乱序代码 与 解密函数代码
      processReferences(binding, stringArrayName, rotators, decoders);

      path.skip();
    },
  });

  const setupCode =
    'program' in ast
      ? buildSetupCode(ast, [
          stringArray?.path,
          ...rotators,
          ...decoders.map((decoder) => decoder.path),
        ])
      : '';

  return {
    stringArray,
    rotators,
    decoders,
    setupCode,
  };
}
