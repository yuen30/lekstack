import { useState } from 'react';

export function useLoading() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const withLoading = async <T>(key: string, promise: Promise<T>): Promise<T> => {
    setLoadingStates((prev) => ({ ...prev, [key]: true }));
    try {
      return await promise;
    } finally {
      setLoadingStates((prev) => ({ ...prev, [key]: false }));
    }
  };

  const setLoading = (key: string, isLoading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: isLoading }));
  };

  return { loadingStates, withLoading, setLoading };
}
