import { expect, test } from 'vitest'
import { deob } from '../index'

test('pipeline flattens while true blocks and inlines boolean object props', async () => {
  const { code } = await deob(`
    function demo() {
      var dict = {
        order: "1|0",
        run: function (fn) {
          return fn();
        },
        enabled: true
      };
      var seq = dict.order.split("|");
      var index = 0;
      while (true) {
        switch (seq[index++]) {
          case "0":
            return dict.enabled;
          case "1":
            dict.run(step);
            continue;
        }
        break;
      }
    }
  `)

  expect(code).toContain('step();')
  expect(code).toContain('return true;')
  expect(code).not.toContain('while (true)')
  expect(code).not.toContain('.split("|")')
})