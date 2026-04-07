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

test('prefer the exact split property when multiple sequence strings share the same case count', () =>
  expectJS(`
    function demo() {
      var dict = {
        primary: "1|0|2",
        backup: "2|1|0",
        other: "noop"
      };
      var order = dict.primary.split("|");
      var index = 0;
      while (true) {
        switch (order[index++]) {
          case "0":
            second();
            continue;
          case "1":
            first();
            continue;
          case "2":
            return done;
        }
        break;
      }
    }
  `).toMatchInlineSnapshot(`
    function demo() {
      var dict = {
        primary: "1|0|2",
        backup: "2|1|0",
        other: "noop"
      };
      var index = 0;
      first();
      second();
      return done;
    }
  `))