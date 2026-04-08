import { useState, useCallback, useEffect } from 'react';
import { getUsersPaginated } from '../api/users';
import { User, PaginatedResponse } from '../types';
import { useLoading } from '../contexts/LoadingContext';

type UseServerPaginationProps = {
  initialPageSize?: number;
  initialPageNumber?: number;
  autoLoad?: boolean;
};

export const useServerPagination = ({
  initialPageSize = 5,
  initialPageNumber = 1,
  autoLoad = true,
}: UseServerPaginationProps = {}) => {
  const [data, setData] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(initialPageNumber);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [error, setError] = useState<string | null>(null);
  const { withLoading } = useLoading();

  const loadPage = useCallback(async () => {
    try {
      setError(null);
      const response = await withLoading(
        getUsersPaginated({ pageNumber, pageSize })
      ) as PaginatedResponse<User>;
      setData(response.data);
      setTotalCount(response.count);
      setTotalPages(response.totalPages);
      return response;
    } catch (err) {
      setError('Не удалось загрузить пользователей');
      console.error(err);
      throw err;
    }
  }, [pageNumber, pageSize, withLoading]);

  useEffect(() => {
    if (autoLoad) {
      loadPage();
    }
  }, [pageNumber, pageSize, autoLoad, loadPage]);

  const goToPage = useCallback((page: number) => {
    setPageNumber(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (pageNumber < totalPages) setPageNumber(prev => prev + 1);
  }, [pageNumber, totalPages]);

  const prevPage = useCallback(() => {
    if (pageNumber > 1) setPageNumber(prev => prev - 1);
  }, [pageNumber]);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPageNumber(1);
  }, []);

  const refresh = useCallback(() => loadPage(), [loadPage]);

  return {
    data,
    totalCount,
    totalPages,
    error,
    pageNumber,
    pageSize,
    loadPage,
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    refresh,
    hasNextPage: pageNumber < totalPages,
    hasPrevPage: pageNumber > 1,
    isFirstPage: pageNumber === 1,
    isLastPage: pageNumber === totalPages,
    from: totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1,
    to: Math.min(pageNumber * pageSize, totalCount),
  };
};
