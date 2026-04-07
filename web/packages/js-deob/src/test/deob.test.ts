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
  expect(code).toContain(
    '.info = "本站历时1年半研发的新版本V7初版，具有多态性加密，破解难度更高。";',
  )
  expect(code).not.toContain('decoder(')
  expect(code).not.toContain('jsjiami.com.v7')
})

test('pipeline supports module syntax when evaluating decoder setup code', async () => {
  const { code } = await deob(`
    import { jsx as _jsx } from './jsx-runtime.js';

    const ignored = _jsx('span', {
      hidden: true,
    });

    var seed = 'jsjiami.com.v7';

    function arrWrap() {
      var arr = [seed, 'decoded value'];
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
      return source;
    })(arrWrap, 0x10);

    export const node = _jsx('div', {
      title: decoder(1),
    });
  `)

  expect(code).toMatch(
    /import\s+\{\s*jsx\s+as\s+_jsx\s*\}\s+from\s+['"]\.\/jsx-runtime\.js['"];/,
  )
  expect(code).toMatch(/_jsx\(['"]span['"], \{\s*hidden: true/s)
  expect(code).toMatch(/export const node = _jsx\(['"]div['"], \{/)
  expect(code).toMatch(/title: ['"]decoded value['"]/)
  expect(code).not.toContain('decoder(1)')
})

test('pipeline removes debug-protection variants with setup declarations', async () => {
  const { code } = await deob(`
    (function () {
      var root = typeof window !== 'undefined' ? window : this;
      root.setInterval(protect, 2000);
    })();

    function protect(flag) {
      var dict = {
        eq: function (left, right) {
          return left === right;
        },
        text: 'string',
        join: function (left, right) {
          return left + right;
        },
      };

      function inner(value) {
        if (dict.eq(typeof value, dict.text)) {
          function loop() {
            while (true) {}
          }

          return loop();
        } else if (dict.join('', value / value).length !== 1 || value % 20 === 0) {
          debugger;
        } else {
          debugger;
        }

        inner(++value);
      }

      try {
        if (flag) {
          return inner;
        } else {
          inner(0);
        }
      } catch (error) {}
    }
  `)

  expect(code).not.toContain('setInterval(protect, 2000)')
  expect(code).not.toContain('function protect')
  expect(code).not.toContain('function inner')
  expect(code).not.toContain('debugger')
})

test('pipeline decodes variable-declared string-array decoders', async () => {
  const { code } = await deob(`
    function arrWrap() {
      var arr = ['alpha', 'beta'];
      arrWrap = function () {
        return arr;
      };
      return arrWrap();
    }

    (function (source, seed) {
      return source;
    })(arrWrap, 0x10);

    var decoder = function (index, key) {
      var values = arrWrap();
      return values[index];
    };

    console.log(window[decoder(1, 'salt')]);
  `)

  expect(code).toContain('window.beta')
  expect(code).not.toContain("decoder(1, 'salt')")
})

test('pipeline removes self-defending wrappers with encoded apply access', async () => {
  const { code } = await deob(`
    var once = function () {
      var first = true;

      return function (context, fn) {
        var wrapped = first
          ? function () {
              if (fn) {
                var result = fn[_0xdeadbe(2817, '1MVw')](context, arguments);
                fn = null;
                return result;
              }
            }
          : function () {};

        first = false;
        return wrapped;
      };
    }();

    var guarded = once(this, function () {
      return 'kept';
    });

    guarded();
    console.log('done');
  `)

  expect(code).toContain('console.log("done")')
  expect(code).not.toContain('var once')
  expect(code).not.toContain('guarded()')
  expect(code).not.toContain('_0xdeadbe')
})

test('pipeline removes self-defending wrappers with noisy encoded apply branches', async () => {
  const { code } = await deob(`
    var once = function () {
      var first = true;

      return function (context, fn) {
        var wrapped = first
          ? function () {
              var cache = { unused: true };

              if (fn) {
                if (cache.unused === false) {
                  console.log('noise');
                } else {
                  var result = fn[_0xfeedaa(3532, 'N(*o')](context, arguments);
                  fn = null;
                  return result;
                }
              }
            }
          : function () {};

        first = false;
        return wrapped;
      };
    }();

    var guarded = once(this, function () {
      return 'kept';
    });

    guarded();
    console.log('done');
  `)

  expect(code).toContain('console.log("done")')
  expect(code).not.toContain('var once')
  expect(code).not.toContain('guarded()')
  expect(code).not.toContain('_0xfeedaa')
})

test('pipeline removes self-defending wrappers with setup declarations', async () => {
  const { code } = await deob(`
    var once = function () {
      var outerState = { mode: 'noop' };
      var first = true;

      return function (context, fn) {
        var localState = { enabled: true };
        var wrapped = first
          ? function () {
              if (fn) {
                if (localState.enabled === false) {
                  console.log(outerState.mode);
                } else {
                  var result = fn[_0xbeef01(3532, 'N(*o')](context, arguments);
                  fn = null;
                  return result;
                }
              }
            }
          : function () {};

        first = false;
        return wrapped;
      };
    }();

    var guarded = once(this, function () {
      return 'kept';
    });

    guarded();
    console.log('done');
  `)

  expect(code).toContain('console.log("done")')
  expect(code).not.toContain('var once')
  expect(code).not.toContain('guarded()')
  expect(code).not.toContain('_0xbeef01')
})

// jsjiami.cn.v7: rotator IIFE compares a checksum of decoded strings (runs many iterations)
// and would exceed the sandbox timeout. The pipeline must fall back to brute-force rotation.
//
// Array: ['jWy/pA==','Enkimg==','UsLVXxs=','3LB468M=','zc1G/eGF7g==','m/JC']
// Decoded after rotation=2 with keys k0..k5: hello, world, console, log, test, done
test('pipeline uses brute-force rotation fallback for jsjiami.cn.v7 slow rotator', async () => {
  const { code } = await deob(`
    function _getArr() {
      var _a = ['jWy/pA==', 'Enkimg==', 'UsLVXxs=', '3LB468M=', 'zc1G/eGF7g==', 'm/JC'];
      _getArr = function () { return _a; };
      return _getArr();
    }
    function _dec(idx, key) {
      var a = _getArr();
      idx = idx - 0;
      var enc = a[idx];
      if (!_dec.b64) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        _dec.b64 = function (b64) {
          var bs = '', i2 = 0, c1, c2, c3, d1, d2, d3, d4;
          b64 = b64.replace(/[^A-Za-z0-9+/=]/g, '');
          do {
            d1 = chars.indexOf(b64.charAt(i2++)); d2 = chars.indexOf(b64.charAt(i2++));
            d3 = chars.indexOf(b64.charAt(i2++)); d4 = chars.indexOf(b64.charAt(i2++));
            c1 = (d1 << 2) | (d2 >> 4); c2 = ((d2 & 15) << 4) | (d3 >> 2); c3 = ((d3 & 3) << 6) | d4;
            bs += String.fromCharCode(c1);
            if (d3 !== 64) bs += String.fromCharCode(c2);
            if (d4 !== 64) bs += String.fromCharCode(c3);
          } while (i2 < b64.length);
          return bs;
        };
      }
      if (!_dec.rc4) {
        _dec.rc4 = function (key, str) {
          var s = [], j = 0, x, res = '';
          for (var i = 0; i < 256; i++) s[i] = i;
          for (var i = 0; i < 256; i++) { j = (j + s[i] + key.charCodeAt(i % key.length)) % 256; x = s[i]; s[i] = s[j]; s[j] = x; }
          i = 0; j = 0;
          for (var y = 0; y < str.length; y++) { i = (i + 1) % 256; j = (j + s[i]) % 256; x = s[i]; s[i] = s[j]; s[j] = x; res += String.fromCharCode(str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]); }
          return res;
        };
      }
      return _dec.rc4(key, _dec.b64(enc));
    }
    (function (arrFn, checksum) {
      var arr = arrFn();
      var target = function () { return checksum; };
      while (true) {
        try {
          var total = _dec(0, 'k0') + _dec(1, 'k1') + _dec(2, 'k2') + _dec(3, 'k3') + _dec(4, 'k4') + _dec(5, 'k5');
          if (total === target()) break;
          arr.push(arr.shift());
        } catch (e) {
          arr.push(arr.shift());
        }
      }
    }(_getArr, 'helloworldconsolelogtestdone'));
    var result = _dec(0, 'k0') + ' ' + _dec(1, 'k1');
    console.log(result);
  `)

  expect(code).not.toContain('_dec(')
  expect(code).toContain('"hello world"')
})
