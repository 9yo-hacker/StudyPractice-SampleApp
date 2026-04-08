import { useState, useEffect } from 'react';
import { getUsers } from '../api/users';
import { User } from '../types';
import { useLoading } from '../contexts/LoadingContext';

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { withLoading } = useLoading();

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

  useEffect(() => {
    loadUsers();
  }, []);

  return {
    users,
    loading: false,
    error,
    refetch: loadUsers,
    totalCount: users.length,
  };
};
