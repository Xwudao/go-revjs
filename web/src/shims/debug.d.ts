declare module 'debug' {
  interface Debugger {
    (...args: unknown[]): void;
    enabled: boolean;
  }

  interface CreateDebug {
    (namespace: string): Debugger;
    log?: (...args: unknown[]) => void;
  }

  const debug: CreateDebug;

  export default debug;
}
