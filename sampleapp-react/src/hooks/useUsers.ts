import { useState, useEffect } from 'react';
import { getUsers } from '../api/users';
import { User } from '../types';
import { useLoading } from '../contexts/LoadingContext';
import { useSort } from './useSort';
import { useSearch } from './useSearch';
import { usePagination } from './usePagination';

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { withLoading } = useLoading();

  const { sortedData, sortConfig, requestSort } = useSort<User>(users, { key: 'id', direction: 'asc' });

  const { searchText, filteredData: searchedUsers, handleSearch, clearSearch } = useSearch({
    data: sortedData,
    searchFields: ['login', 'name', 'id'],
  });

  const {
    paginatedData, page, rowsPerPage, rowsPerPageOptions,
    handleChangePage, handleChangeRowsPerPage, resetPagination,
    from, to,
  } = usePagination(searchedUsers, { initialRowsPerPage: 5 });

  useEffect(() => {
    resetPagination();
  }, [searchText]);

  const loadUsers = async () => {
    try {
      setError(null);
      const data = await withLoading(getUsers());
      setUsers(data);
    } catch (err) {
      setError('Не удалось загрузить пользователей');
      console.error(err);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  return {
    users: paginatedData,
    allUsers: users,
    filteredCount: searchedUsers.length,
    totalCount: users.length,
    error,
    refetch: loadUsers,
    sortConfig,
    requestSort,
    searchText,
    handleSearch,
    clearSearch,
    page,
    rowsPerPage,
    rowsPerPageOptions,
    handleChangePage,
    handleChangeRowsPerPage,
    from,
    to,
  };
};
