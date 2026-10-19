import { useEffect, useRef } from 'react';

export const useFormReset = (onReset: () => void): void => {
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  useEffect(() => {
    const handleReset = (): void => {
      onResetRef.current();
    };

    handleReset();
    window.addEventListener('pageshow', handleReset);
    return () => window.removeEventListener('pageshow', handleReset);
  }, []);
};
