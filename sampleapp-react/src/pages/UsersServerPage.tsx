import { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Button, Paper, Chip, Alert, LinearProgress,
} from '@mui/material';
import { RefreshCw, Server, Plus } from 'lucide-react';
import { useServerPagination } from '../hooks/useServerPagination';
import { useAuth } from '../contexts/AuthContext';
import { UsersTable } from '../components/UsersTable';
import { SearchBar } from '../components/SearchBar';
import { ServerPaginationControls } from '../components/ServerPaginationControls';
import { StatsCards } from '../components/StatsCards';
import { AddUserModal } from '../components/AddUserModal';
import { ConfirmDialog } from '../components/guards/ConfirmDialog';
import { ErrorMessage } from '../components/ErrorMessage';
import { deleteUser, createUser } from '../api/users';
import { User } from '../types';
import { useLoading } from '../contexts/LoadingContext';

export const UsersServerPage = () => {
  const { token } = useAuth();
  const { isLoading } = useLoading();
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState<User[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const {
    data, totalCount, totalPages, error,
    pageNumber, pageSize,
    goToPage, changePageSize, refresh,
    hasNextPage, hasPrevPage, from, to,
  } = useServerPagination({ initialPageSize: 5, initialPageNumber: 1, autoLoad: true });

  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredData(data);
    } else {
      const lower = searchText.toLowerCase();
      setFilteredData(data.filter(
        u => u.login.toLowerCase().includes(lower) ||
             u.name?.toLowerCase().includes(lower) ||
             u.id.toString().includes(lower)
      ));
    }
  }, [data, searchText]);

  const handleAddUser = async (userData: { login: string; password: string; name: string }) => {
    await createUser(userData);
    await refresh();
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete.id);
      setUserToDelete(null);
      await refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Server size={32} color="#3f51b5" />
          <Typography variant="h4">Серверная пагинация</Typography>
          <Chip label={`Страница ${pageNumber} из ${totalPages}`} color="primary" size="small" />
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="success"
            startIcon={<Plus size={18} />}
            onClick={() => setAddModalOpen(true)}
            disabled={isLoading}
          >
            Создать
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshCw size={18} />}
            onClick={refresh}
            disabled={isLoading}
          >
            Обновить
          </Button>
        </Box>
      </Box>

      <StatsCards
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={pageNumber}
        pageSize={pageSize}
      />

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Paper sx={{ p: 2, mb: 2 }}>
        <SearchBar
          value={searchText}
          onChange={setSearchText}
          placeholder="Поиск по текущей странице (ID, логин, имя)..."
          disabled={isLoading}
        />
        {searchText && (
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
            <Typography variant="caption" color="text.secondary">
              Найдено на странице: {filteredData.length} из {data.length}
            </Typography>
            <Button size="small" onClick={() => setSearchText('')}>Очистить</Button>
          </Box>
        )}
      </Paper>

      {error && <ErrorMessage message={error} onRetry={refresh} />}

      <Paper sx={{ p: 2 }}>
        <UsersTable
          users={filteredData}
          sortConfig={{ key: null, direction: 'asc' }}
          onSort={() => {}}
          onDelete={setUserToDelete}
        />
        {filteredData.length === 0 && !isLoading && !error && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {searchText ? 'Ничего не найдено на текущей странице' : 'Нет данных для отображения'}
          </Alert>
        )}
      </Paper>

      {totalCount > 0 && (
        <ServerPaginationControls
          pageNumber={pageNumber}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 25, 50]}
          totalCount={totalCount}
          from={from}
          to={to}
          loading={isLoading}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
        />
      )}

      {token && (
        <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={1}>
          <Typography variant="caption" color="text.secondary">
            JWT токен активен • Серверная пагинация
          </Typography>
        </Box>
      )}

      <AddUserModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddUser}
      />

      <ConfirmDialog
        open={!!userToDelete}
        title="Удаление пользователя"
        message={`Удалить пользователя "${userToDelete?.name || userToDelete?.login}"? Это действие необратимо.`}
        confirmText="Удалить"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setUserToDelete(null)}
        severity="error"
      />
    </Container>
  );
};

export default UsersServerPage;
