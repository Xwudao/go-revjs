import { parse } from '@babel/parser'
import { describe, expect, it } from 'vitest'
import { evalCode } from '../..'
import { generate } from '../../ast-utils'
import { createNodeSandbox } from '../../deobfuscate'
import { decodeStrings } from '../decode-strings'
import { findDecoderByArray } from '../find-decoder-by-array'
import { findDecoderByCallCount } from '../find-decoder-by-call-count'

describe('decoder', async () => {
  it('find decoder by call count', async () => {
    const ast = parse(`
      function decoder(a){
        return atob(a)
      }
  
      decoder("SGVsbG8sIHdvcmxk")
      decoder("ZGVidWdnZXI=")
      `)

    const sandbox = createNodeSandbox()
    const { decoders, setupCode } = findDecoderByCallCount(ast, 2)

    await evalCode(sandbox, setupCode)
    await decodeStrings(sandbox, decoders)

    decoders.forEach((d) => d.path.remove())

    expect(decoders[0].name).toBe('decoder')
    expect(generate(ast)).toMatchInlineSnapshot(`
      ""Hello, world";
      "debugger";"
    `)
  })

  it('find decoder by call count when exported', async () => {
    const ast = parse(
      `
      export default function decoder(a){
        return atob(a)
      }

      decoder("SGVsbG8sIHdvcmxk")
      decoder("ZGVidWdnZXI=")
      `,
      { sourceType: 'module' },
    )

    const sandbox = createNodeSandbox()
    const { decoders, setupCode } = findDecoderByCallCount(ast, 2)

    await evalCode(sandbox, setupCode)
    await decodeStrings(sandbox, decoders)

    decoders.forEach((d) => d.path.remove())

    expect(decoders[0].name).toBe('decoder')
    expect(generate(ast)).toMatchInlineSnapshot(`
      "\"Hello, world\";\n\"debugger\";"
    `)
  })

  it('find decoder by array', async () => {
    const ast = parse(`
      var arr = ["hello,world", "debugger"]
      function decoder(i){
        return arr[i]
      }
      (function(a, b) {
        // rotator function
      })(arr, 0x128)

      decoder(0)
      decoder(1)
      `)

    const sandbox = createNodeSandbox()

    const { stringArray, decoders, rotators, setupCode } = findDecoderByArray(ast)

    await evalCode(sandbox, setupCode)
    await decodeStrings(sandbox, decoders)

    stringArray?.path.remove()
    decoders.forEach((d) => d.path.remove())
    rotators.forEach((r) => r.remove())
    expect(stringArray!.name).toBe('arr')
    expect(decoders[0].name).toBe('decoder')

    expect(generate(ast)).toMatchInlineSnapshot(`
      ""hello,world";
      "debugger";"
    `)
  })

  it('find decoder by array when exported', async () => {
    const ast = parse(
      `
      var arr = ["hello,world", "debugger"]
      export function decoder(i){
        return arr[i]
      }
      (function(a, b) {
        // rotator function
      })(arr, 0x128)

      export const first = decoder(0)
      decoder(1)
      `,
      { sourceType: 'module' },
    )

    const sandbox = createNodeSandbox()

    const { stringArray, decoders, rotators, setupCode } = findDecoderByArray(ast)

    await evalCode(sandbox, setupCode)
    await decodeStrings(sandbox, decoders)

    stringArray?.path.remove()
    decoders.forEach((d) => d.path.remove())
    rotators.forEach((r) => r.remove())
    expect(stringArray!.name).toBe('arr')
    expect(decoders[0].name).toBe('decoder')

    expect(generate(ast)).toMatchInlineSnapshot(`
      "export const first = \"hello,world\";\n\"debugger\";"
    `)
  })

  it('filters string array candidates by expected length', () => {
    const ast = parse(`
      var wrong = ["skip"]
      function wrongDecoder(i){
        return wrong[i]
      }
      (function(a, b) {
        // rotator function
      })(wrong, 0x10)

      var arr = ["hello,world", "debugger"]
      function decoder(i){
        return arr[i]
      }
      (function(a, b) {
        // rotator function
      })(arr, 0x128)
    `)

    const { stringArray, decoders } = findDecoderByArray(ast, 2)

    expect(stringArray?.name).toBe('arr')
    expect(decoders[0]?.name).toBe('decoder')
  })

  it('finds wrapped string arrays built via concat iifes', async () => {
    const ast = parse(`
      var seed = "jsjiami.com.v7"

      function arrWrap() {
        var arr = [seed, "hello"].concat((function () {
          return ["world"].concat((function () {
            return ["debugger"];
          })());
        })());
        arrWrap = function () {
          return arr;
        };
        return arrWrap();
      }

      function decoder(i) {
        var values = arrWrap();
        return values[i];
      }

      (function (source, seed) {
        // rotator function
      })(arrWrap, 0x128)

      decoder(1)
      decoder(2)
      decoder(3)
    `)

    const sandbox = createNodeSandbox()
    const { stringArray, decoders, rotators, setupCode } = findDecoderByArray(ast)

    await evalCode(sandbox, setupCode)
    await decodeStrings(sandbox, decoders)

    stringArray?.path.remove()
    decoders.forEach((d) => d.path.remove())
    rotators.forEach((r) => r.remove())

    expect(stringArray?.name).toBe('arrWrap')
    expect(stringArray?.length).toBe(4)
    expect(decoders[0]?.name).toBe('decoder')
    expect(generate(ast)).toMatchInlineSnapshot(`
      "var seed = \"jsjiami.com.v7\";\n\"hello\";\n\"world\";\n\"debugger\";"
    `)
  })
})
