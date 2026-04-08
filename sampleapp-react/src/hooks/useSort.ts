import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export type SortConfig<T> = {
  key: keyof T | null;
  direction: SortDirection;
};

export const useSort = <T extends Record<string, unknown>>(
  data: T[],
  initialConfig?: SortConfig<T>
) => {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>(
    initialConfig || { key: null, direction: 'asc' }
  );

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!]?.toString() || '';
      const bValue = b[sortConfig.key!]?.toString() || '';

      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [data, sortConfig]);

  const requestSort = (key: keyof T) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return { sortedData, sortConfig, requestSort };
};
