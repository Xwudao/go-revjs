import { useEffect } from 'react';

const DEFAULT_TITLE = 'RevJS · 逆向工程中心';

/**
 * Sets the browser tab title for the current page.
 * Restores the default title when the component unmounts.
 */
export function useTitle(title: string): void {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

export { DEFAULT_TITLE };
