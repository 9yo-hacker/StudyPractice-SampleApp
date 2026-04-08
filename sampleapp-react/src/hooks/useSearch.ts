import { useState, useMemo, useCallback } from 'react';

type UseSearchProps<T> = {
  data: T[];
  searchFields: (keyof T)[];
  initialSearch?: string;
};

export const useSearch = <T extends Record<string, unknown>>({
  data,
  searchFields,
  initialSearch = '',
}: UseSearchProps<T>) => {
  const [searchText, setSearchText] = useState(initialSearch);

  const filteredData = useMemo(() => {
    if (!searchText.trim()) return data;
    const lower = searchText.toLowerCase();
    return data.filter((item) =>
      searchFields.some((field) =>
        item[field]?.toString().toLowerCase().includes(lower)
      )
    );
  }, [data, searchText, searchFields]);

  const handleSearch = useCallback((text: string) => setSearchText(text), []);
  const clearSearch = useCallback(() => setSearchText(''), []);

  return { searchText, filteredData, handleSearch, clearSearch, setSearchText };
};
