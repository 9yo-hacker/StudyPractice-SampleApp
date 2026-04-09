import { useState } from 'react';
import { Container, Typography, Box, Button, Paper, Chip } from '@mui/material';
import { RefreshCw, Users as UsersIcon, ChevronUp, ChevronDown, UserPlus } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { useLoading } from '../contexts/LoadingContext';
import { useAuth } from '../contexts/AuthContext';
import { UsersTable } from '../components/UsersTable';
import { SearchBar } from '../components/SearchBar';
import { PaginationControls } from '../components/PaginationControls';
import { ErrorMessage } from '../components/ErrorMessage';
import { ButtonLoader } from '../components/ButtonLoader';
import { AddUserModal } from '../components/AddUserModal';
import { ConfirmDialog } from '../components/guards/ConfirmDialog';
import { createUser, deleteUser } from '../api/users';
import { User } from '../types';

export const UsersPage = () => {
  const {
    users, filteredCount, totalCount, error, refetch,
    sortConfig, requestSort,
    searchText, handleSearch, clearSearch,
    page, rowsPerPage, rowsPerPageOptions,
    handleChangePage, handleChangeRowsPerPage,
    from, to,
  } = useUsers();

  const { isLoading } = useLoading();
  const { token } = useAuth();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleCreate = async (data: { login: string; password: string; name: string }) => {
    await createUser(data);
    await refetch();
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      setDeleteLoading(true);
      await deleteUser(userToDelete.id);
      setUserToDelete(null);
      await refetch();
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <UsersIcon size={28} color="#3f51b5" />
            <Typography variant="h4">Пользователи</Typography>
            <Chip label={`Всего: ${totalCount}`} size="small" color="primary" variant="outlined" />
            {searchText && (
              <Chip
                label={`Найдено: ${filteredCount}`}
                size="small"
                color="success"
                variant="outlined"
                onDelete={clearSearch}
              />
            )}
          </Box>

          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              onClick={() => refetch()}
              disabled={isLoading}
              startIcon={isLoading ? <ButtonLoader /> : <RefreshCw size={18} />}
            >
              {isLoading ? 'Загрузка...' : 'Обновить'}
            </Button>
            <Button
              variant="contained"
              onClick={() => setAddModalOpen(true)}
              startIcon={<UserPlus size={18} />}
            >
              Создать
            </Button>
          </Box>
        </Box>

        <Box mb={3}>
          <SearchBar
            value={searchText}
            onChange={handleSearch}
            placeholder="Поиск по логину, имени или ID..."
            disabled={isLoading}
          />
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="body2" color="text.secondary">
            Показаны записи {from}-{to} из {filteredCount}
          </Typography>

          {sortConfig.key && (
            <Chip
              icon={sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              label={`Сортировка: ${String(sortConfig.key)} (${sortConfig.direction === 'asc' ? 'возр' : 'убыв'})`}
              size="small"
              variant="outlined"
              onDelete={() => requestSort('id')}
            />
          )}
        </Box>

        {error && <ErrorMessage message={error} onRetry={refetch} />}

        <UsersTable users={users} sortConfig={sortConfig} onSort={requestSort} onDelete={setUserToDelete} />

        {filteredCount > 0 && (
          <PaginationControls
            count={filteredCount}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={rowsPerPageOptions}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        )}

        {token && (
          <Box mt={2} p={2} bgcolor="action.hover" borderRadius={1}>
            <Typography variant="caption" color="text.secondary">
              JWT токен активен • Запросы авторизованы
            </Typography>
          </Box>
        )}
      </Paper>

      <AddUserModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleCreate}
      />

      <ConfirmDialog
        open={!!userToDelete}
        title="Удаление пользователя"
        message={`Удалить пользователя "${userToDelete?.name || userToDelete?.login}"? Это действие необратимо.`}
        confirmText={deleteLoading ? 'Удаление...' : 'Удалить'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setUserToDelete(null)}
        severity="error"
      />
    </Container>
  );
};

export default UsersPage;
