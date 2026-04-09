export function isBrowser(): boolean {
  return 'window' in globalThis || 'importScripts' in globalThis;
}
