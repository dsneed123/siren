import { useEffect } from 'react';
import { handleKeyboardShortcut } from '@/core/shortcuts';

export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      handleKeyboardShortcut(e);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
};

export default useKeyboardShortcuts;
