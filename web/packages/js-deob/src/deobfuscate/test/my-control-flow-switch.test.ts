import { test } from 'vitest'
import { testTransform } from '../../../test'
import myControlFlowSwitch from '../my-control-flow-switch'

const expectJS = testTransform(myControlFlowSwitch)

test('flatten multi-statement cases in order', () =>
  expectJS(`
    function demo() {
      var order = "1|0".split("|");
      var index = 0;
      while (true) {
        switch (order[index++]) {
          case "0":
            return value;
          case "1":
            var value = 1;
            value += 1;
            continue;
        }
        break;
      }
    }
  `).toMatchInlineSnapshot(`
    function demo() {
      var index = 0;
      var value = 1;
      value += 1;
      return value;
    }
  `))

test('infer decoder-hidden sequence string by matching case count', () =>
  expectJS(`
    function demo() {
      var dict = {
        Alpha: "2|0|1",
        Bravo: "0|1",
        Other: "noop"
      };
      var order = dict[decode(10)].split("|");
      var index = 0;
      while (true) {
        switch (order[index++]) {
          case "0":
            first();
            continue;
          case "1":
            return 3;
          case "2":
            second();
            continue;
        }
        break;
      }
    }
  `).toMatchInlineSnapshot(`
    function demo() {
      var dict = {
        Alpha: "2|0|1",
        Bravo: "0|1",
        Other: "noop"
      };
      var index = 0;
      second();
      first();
      return 3;
    }
  `))