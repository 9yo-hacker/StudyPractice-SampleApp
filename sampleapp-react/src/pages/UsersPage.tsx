import { Container, Typography, Box, Button, Paper, Chip } from '@mui/material';
import { RefreshCw, Users as UsersIcon, Shield } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { useLoading } from '../contexts/LoadingContext';
import { useAuth } from '../contexts/AuthContext';
import { UsersTable } from '../components/UsersTable';
import { ErrorMessage } from '../components/ErrorMessage';
import { ButtonLoader } from '../components/ButtonLoader';

export const UsersPage = () => {
  const { users, error, refetch, totalCount } = useUsers();
  const { isLoading } = useLoading();
  const { token } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <UsersIcon size={28} color="#3f51b5" />
            <Typography variant="h4">
              Пользователи {totalCount > 0 && `(${totalCount})`}
            </Typography>
            {token && (
              <Chip
                icon={<Shield size={14} />}
                label="JWT активен"
                size="small"
                color="success"
                sx={{ ml: 2 }}
              />
            )}
            {isLoading && (
              <Chip label="Загрузка..." size="small" color="primary" sx={{ ml: 1 }} />
            )}
          </Box>

          <Button
            variant="contained"
            onClick={() => refetch()}
            disabled={isLoading}
            startIcon={isLoading ? <ButtonLoader /> : <RefreshCw size={18} />}
          >
            {isLoading ? 'Загрузка...' : 'Обновить'}
          </Button>
        </Box>

        {error && <ErrorMessage message={error} onRetry={refetch} />}

        <UsersTable users={users} />

        {token && (
          <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={1}>
            <Typography variant="caption" color="text.secondary">
              JWT токен: {token.substring(0, 30)}...
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default UsersPage;
