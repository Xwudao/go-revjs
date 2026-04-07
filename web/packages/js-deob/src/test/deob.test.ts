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

test('pipeline decodes wrapped concat string arrays', async () => {
  const { code } = await deob(`
    var seed = "jsjiami.com.v7";

    function arrWrap() {
      var arr = [seed, "update", "2023年01月17日05:34:29更新"].concat((function () {
        return ["info", "本站历时1年半研发的新版本V7初版，具有多态性加密，破解难度更高。"];
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
    })(arrWrap, 0x10);

    (function (w, d) {
      w[decoder(1)] = decoder(2);
      d[decoder(3)] = decoder(4);
    })(window, document);

    var version_ = "jsjiami.com.v7";
  `)

  expect(code).toContain('.update = "2023年01月17日05:34:29更新";')
  expect(code).toContain('.info = "本站历时1年半研发的新版本V7初版，具有多态性加密，破解难度更高。";')
  expect(code).not.toContain('decoder(')
  expect(code).not.toContain('jsjiami.com.v7')
})