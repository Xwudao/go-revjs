import { test } from 'vitest'
import { testTransform } from '../../../test'
import controlFlowObject from '../control-flow-object'

const expectJS = testTransform(controlFlowObject)

test('inline literal properties even when computed decoder lookups remain', () =>
  expectJS(`
    function demo() {
      const obj = {
        Qwert: "0|1",
        Asdfg: function (a, b) {
          return a + b;
        }
      };
      obj[decode(1)](1, 2);
      return obj.Qwert.split("|");
    }
  `).toMatchInlineSnapshot(`
    function demo() {
      const obj = {
        Qwert: "0|1",
        Asdfg: function (a, b) {
          return a + b;
        }
      };
      obj[decode(1)](1, 2);
      return "0|1".split("|");
    }
  `))