import {
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Typography, IconButton, Tooltip, Avatar, Box, Chip, Skeleton,
} from '@mui/material';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { SortableTableHeader } from './SortableTableHeader';
import { SortConfig } from '../hooks/useSort';

type UsersTableProps = {
  users: User[];
  sortConfig: SortConfig<User>;
  onSort: (field: keyof User) => void;
  onDelete?: (user: User) => void;
  loading?: boolean;
  pageSize?: number;
};

export const UsersTable = ({ users, sortConfig, onSort, onDelete, loading = false, pageSize = 5 }: UsersTableProps) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Пользователь</TableCell>
            <SortableTableHeader<User>
              field="id"
              label="ID"
              currentSort={sortConfig.key}
              direction={sortConfig.direction}
              onSort={onSort}
              width={80}
            />
            <SortableTableHeader<User>
              field="login"
              label="Логин"
              currentSort={sortConfig.key}
              direction={sortConfig.direction}
              onSort={onSort}
            />
            <TableCell align="center" width={120}>Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && Array.from({ length: pageSize }).map((_, i) => (
            <TableRow key={`skeleton-${i}`}>
              <TableCell>
                <Box display="flex" alignItems="center" gap={2}>
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="text" width={120} />
                </Box>
              </TableCell>
              <TableCell><Skeleton variant="text" width={30} /></TableCell>
              <TableCell><Skeleton variant="text" width={80} /></TableCell>
              <TableCell align="center"><Skeleton variant="text" width={60} sx={{ mx: 'auto' }} /></TableCell>
            </TableRow>
          ))}
          {!loading && users.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">Нет пользователей</Typography>
              </TableCell>
            </TableRow>
          )}
          {!loading && users.map((user) => (
            <TableRow key={user.id} hover>
              <TableCell>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    sx={{
                      width: 32, height: 32,
                      bgcolor: currentUser?.id === user.id ? 'primary.main' : 'secondary.main',
                    }}
                  >
                    {user.login.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body1">{user.name || user.login}</Typography>
                    {user.name && (
                      <Typography variant="caption" color="text.secondary">@{user.login}</Typography>
                    )}
                  </Box>
                  {currentUser?.id === user.id && (
                    <Chip label="Это вы" size="small" color="primary" variant="outlined" />
                  )}
                </Box>
              </TableCell>
              <TableCell>{user.id}</TableCell>
              <TableCell>{user.login}</TableCell>
              <TableCell align="center">
                <Tooltip title="Просмотреть профиль">
                  <IconButton size="small" onClick={() => navigate(`/profile/${user.id}`)} sx={{ mr: 1 }}>
                    <Eye size={18} />
                  </IconButton>
                </Tooltip>
                {currentUser?.id === user.id && (
                  <Tooltip title="Редактировать">
                    <IconButton size="small" onClick={() => navigate(`/profile/${user.id}/edit`)} sx={{ mr: 1 }}>
                      <Edit2 size={18} />
                    </IconButton>
                  </Tooltip>
                )}
                {onDelete && currentUser?.id !== user.id && (
                  <Tooltip title="Удалить">
                    <IconButton size="small" color="error" onClick={() => onDelete(user)}>
                      <Trash2 size={18} />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
