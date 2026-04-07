import { parse } from '@babel/parser'
import { describe, expect, it } from 'vitest'
import { generate } from '../../ast-utils'
import { inlineVariableAliases } from '../../ast-utils/inline'
import traverse from '../../interop/babel-traverse'
import { splitVariableDeclarations } from '../../unminify/transforms'
import { applyTransform } from '../../ast-utils/transform'

describe('alias inlining block scope', () => {
  it('inlines var alias = decoder refs inside while/switch block scopes', () => {
    const code = `
(function(win, doc) {
  var alias = decoder,
      _obj = { a: alias(1), b: alias(2) };
  var seq = _obj[alias(3)].split("|");
  while(true) {
    switch(seq[0]) {
      case "0": win.x = alias(4); break;
      case "1": doc.y = alias(5); break;
    }
    break;
  }
})(window, document);

function decoder(x) { return 'r' + x; }
`
    const ast = parse(code, { sourceType: 'unambiguous' })
    applyTransform(ast, splitVariableDeclarations)

    let decoderBinding: any
    traverse(ast, {
      FunctionDeclaration(path) {
        if (path.node.id?.name === 'decoder') {
          decoderBinding = path.parentPath!.scope.getBinding('decoder')
        }
      }
    })

    inlineVariableAliases(decoderBinding)
    const result = generate(ast)
    expect(result).toContain('decoder(4)')
    expect(result).toContain('decoder(5)')
    expect(result).not.toContain('alias(')
  })
})
