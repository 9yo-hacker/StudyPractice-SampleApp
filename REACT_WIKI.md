=== React-10.-Серверная-пагинация.md ===
# Sprint 10 на React (Серверная пагинация)

Реализуем серверную пагинацию для эффективной работы с большими объемами данных.

## 1. Обновляем типы (src/types.ts)

```typescript
export type User = {
  id: number;
  name: string;
  login: string;
  token?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  count: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
};

export type PaginationParams = {
  pageNumber: number;
  pageSize: number;
};
```

## 2. Обновляем API для пользователей с серверной пагинацией (src/api/users.ts)

```typescript
import { apiClient } from './client';
import { User, PaginatedResponse, PaginationParams } from '../types';

export const getUsers = async (): Promise<User[]> => {
  const response = await apiClient.get<User[]>('/Users');
  return response.data;
};

export const getUsersPaginated = async (
  params: PaginationParams
): Promise<PaginatedResponse<User>> => {
  const { data } = await apiClient.get<PaginatedResponse<User>>('/Users/option', {
    params: {
      PageSize: params.pageSize,
      PageNumber: params.pageNumber,
    },
  });
  return data;
};

export const getUserById = async (id: number): Promise<User> => {
  const response = await apiClient.get<User>(`/Users/${id}`);
  return response.data;
};

export const createUser = async (user: Partial<User>) => {
  const response = await apiClient.post('/Users', user);
  return response.data;
};

export const updateUser = async (id: number, user: Partial<User>) => {
  const response = await apiClient.put(`/Users/${id}`, user);
  return response.data;
};

export const deleteUser = async (id: number) => {
  const response = await apiClient.delete(`/Users/${id}`);
  return response.data;
};
```

## 3. Создаем хук для серверной пагинации (src/hooks/useServerPagination.ts)

```typescript
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
  const [loading, setLoading] = useState(false);
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
    if (pageNumber < totalPages) {
      setPageNumber(prev => prev + 1);
    }
  }, [pageNumber, totalPages]);

  const prevPage = useCallback(() => {
    if (pageNumber > 1) {
      setPageNumber(prev => prev - 1);
    }
  }, [pageNumber]);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPageNumber(1); // Сбрасываем на первую страницу
  }, []);

  const refresh = useCallback(() => {
    return loadPage();
  }, [loadPage]);

  return {
    // Данные
    data,
    totalCount,
    totalPages,
    loading,
    error,
    
    // Параметры
    pageNumber,
    pageSize,
    
    // Методы
    loadPage,
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    refresh,
    
    // Вспомогательные значения
    hasNextPage: pageNumber < totalPages,
    hasPrevPage: pageNumber > 1,
    isFirstPage: pageNumber === 1,
    isLastPage: pageNumber === totalPages,
    from: (pageNumber - 1) * pageSize + 1,
    to: Math.min(pageNumber * pageSize, totalCount),
  };
};
```

## 4. Создаем компонент ServerPaginationControls (src/components/ServerPaginationControls.tsx)

```typescript
import React from 'react';
import {
  Box,
  IconButton,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

type ServerPaginationControlsProps = {
  pageNumber: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions?: number[];
  totalCount: number;
  from: number;
  to: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export const ServerPaginationControls = ({
  pageNumber,
  totalPages,
  pageSize,
  pageSizeOptions = [5, 10, 25, 50],
  totalCount,
  from,
  to,
  loading = false,
  onPageChange,
  onPageSizeChange,
  hasNextPage,
  hasPrevPage,
}: ServerPaginationControlsProps) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        mt: 2,
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        bgcolor: 'background.default',
      }}
    >
      {/* Информация о записях */}
      <Typography variant="body2" color="text.secondary">
        Записи {from}-{to} из {totalCount}
      </Typography>

      {/* Навигация по страницам */}
      <Box display="flex" alignItems="center" gap={1}>
        <Tooltip title="Первая страница">
          <span>
            <IconButton
              onClick={() => onPageChange(1)}
              disabled={!hasPrevPage || loading}
              size="small"
            >
              <ChevronsLeft size={20} />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Предыдущая страница">
          <span>
            <IconButton
              onClick={() => onPageChange(pageNumber - 1)}
              disabled={!hasPrevPage || loading}
              size="small"
            >
              <ChevronLeft size={20} />
            </IconButton>
          </span>
        </Tooltip>

        <Typography variant="body2" sx={{ mx: 1 }}>
          Страница {pageNumber} из {totalPages}
        </Typography>

        <Tooltip title="Следующая страница">
          <span>
            <IconButton
              onClick={() => onPageChange(pageNumber + 1)}
              disabled={!hasNextPage || loading}
              size="small"
            >
              <ChevronRight size={20} />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Последняя страница">
          <span>
            <IconButton
              onClick={() => onPageChange(totalPages)}
              disabled={!hasNextPage || loading}
              size="small"
            >
              <ChevronsRight size={20} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Выбор количества записей на странице */}
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="page-size-label">На странице</InputLabel>
        <Select
          labelId="page-size-label"
          value={pageSize}
          label="На странице"
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={loading}
        >
          {pageSizeOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option} записей
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Paper>
  );
};
```

## 5. Создаем компонент StatsCards (src/components/StatsCards.tsx)

```typescript
import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { Users, Files, Activity } from 'lucide-react';

type StatsCardsProps = {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export const StatsCards = ({
  totalCount,
  totalPages,
  currentPage,
  pageSize,
}: StatsCardsProps) => {
  const cards = [
    {
      title: 'Всего записей',
      value: totalCount,
      icon: <Files size={24} />,
      color: '#3f51b5',
    },
    {
      title: 'Всего страниц',
      value: totalPages,
      icon: <Activity size={24} />,
      color: '#f50057',
    },
    {
      title: 'На текущей странице',
      value: Math.min(pageSize, totalCount - (currentPage - 1) * pageSize),
      icon: <Users size={24} />,
      color: '#4caf50',
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              borderLeft: `4px solid ${card.color}`,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: `${card.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.color,
              }}
            >
              {card.icon}
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {card.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {card.title}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};
```

## 6. Создаем страницу с серверной пагинацией (src/pages/UsersServerPage.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Chip,
  Alert,
  LinearProgress,
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

export const UsersServerPage = () => {
  const { token } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState<User[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const {
    data,
    totalCount,
    totalPages,
    loading,
    error,
    pageNumber,
    pageSize,
    goToPage,
    changePageSize,
    refresh,
    hasNextPage,
    hasPrevPage,
    from,
    to,
  } = useServerPagination({
    initialPageSize: 5,
    initialPageNumber: 1,
    autoLoad: true,
  });

  // Локальный поиск по текущей странице
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredData(data);
    } else {
      const searchLower = searchText.toLowerCase();
      const filtered = data.filter(
        (user) =>
          user.login.toLowerCase().includes(searchLower) ||
          user.name?.toLowerCase().includes(searchLower) ||
          user.id.toString().includes(searchLower)
      );
      setFilteredData(filtered);
    }
  }, [data, searchText]);

  const handleAddUser = async (userData: {
    login: string;
    password: string;
    name?: string;
  }) => {
    await createUser(userData);
    await refresh();
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser(userToDelete.id);
      await refresh();
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Server size={32} color="#3f51b5" />
          <Typography variant="h4">Серверная пагинация</Typography>
          <Chip
            label={`Страница ${pageNumber} из ${totalPages}`}
            color="primary"
            size="small"
          />
        </Box>

        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="success"
            startIcon={<Plus size={18} />}
            onClick={() => setAddModalOpen(true)}
            disabled={loading}
          >
            Создать
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshCw size={18} />}
            onClick={refresh}
            disabled={loading}
          >
            Обновить
          </Button>
        </Box>
      </Box>

      {/* Статистика */}
      <StatsCards
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={pageNumber}
        pageSize={pageSize}
      />

      {/* Индикатор загрузки */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Поиск */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <SearchBar
          value={searchText}
          onChange={setSearchText}
          placeholder="Поиск по текущей странице (ID, логин, имя)..."
          disabled={loading}
        />
        {searchText && (
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
            <Typography variant="caption" color="text.secondary">
              Найдено на странице: {filteredData.length} из {data.length}
            </Typography>
            <Button size="small" onClick={() => setSearchText('')}>
              Очистить
            </Button>
          </Box>
        )}
      </Paper>

      {/* Ошибка */}
      {error && <ErrorMessage message={error} onRetry={refresh} />}

      {/* Таблица */}
      <Paper sx={{ p: 2 }}>
        <UsersTable
          users={filteredData}
          sortConfig={{ key: null, direction: 'asc' }}
          onSort={() => {}}
          onDelete={handleDeleteClick}
        />

        {filteredData.length === 0 && !loading && !error && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {searchText
              ? 'Ничего не найдено на текущей странице'
              : 'Нет данных для отображения'}
          </Alert>
        )}
      </Paper>

      {/* Пагинация */}
      {totalCount > 0 && (
        <ServerPaginationControls
          pageNumber={pageNumber}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 25, 50]}
          totalCount={totalCount}
          from={from}
          to={to}
          loading={loading}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
        />
      )}

      {/* Модальное окно добавления */}
      <AddUserModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddUser}
      />

      {/* Диалог подтверждения удаления */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Подтверждение удаления"
        message={`Вы действительно хотите удалить пользователя ${userToDelete?.login}?`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        severity="error"
      />
    </Container>
  );
};
```

## 7. Обновляем UsersTable с поддержкой удаления (src/components/UsersTable.tsx)

```typescript
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Avatar,
  Box,
  Chip,
} from '@mui/material';
import { Eye, Edit2, Trash2, User as UserIcon } from 'lucide-react';
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
};

export const UsersTable = ({ users, sortConfig, onSort, onDelete }: UsersTableProps) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  if (users.length === 0) {
    return (
      <Typography color="text.secondary" align="center" py={4}>
        Нет пользователей
      </Typography>
    );
  }

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
            <TableCell align="center" width={160}>Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} hover>
              <TableCell>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: currentUser?.id === user.id ? 'primary.main' : 'secondary.main',
                    }}
                  >
                    {user.login.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body1">
                      {user.name || user.login}
                    </Typography>
                    {user.name && (
                      <Typography variant="caption" color="text.secondary">
                        @{user.login}
                      </Typography>
                    )}
                  </Box>
                  {currentUser?.id === user.id && (
                    <Chip
                      label="Это вы"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell>{user.id}</TableCell>
              <TableCell>{user.login}</TableCell>
              <TableCell align="center">
                <Tooltip title="Просмотреть профиль">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/profile/${user.id}`)}
                    sx={{ mr: 1 }}
                  >
                    <Eye size={18} />
                  </IconButton>
                </Tooltip>
                
                {currentUser?.id === user.id && (
                  <Tooltip title="Редактировать">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/profile/${user.id}/edit`)}
                      sx={{ mr: 1 }}
                    >
                      <Edit2 size={18} />
                    </IconButton>
                  </Tooltip>
                )}

                {currentUser?.id !== user.id && onDelete && (
                  <Tooltip title="Удалить">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(user)}
                      color="error"
                    >
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
```

## 8. Обновляем App.tsx с новым маршрутом

```typescript
// Добавить импорт
import { UsersServerPage } from './pages/UsersServerPage';

// Добавить маршрут в Routes
<Route path="/users-server" element={
  <AuthGuard>
    <UsersServerPage />
  </AuthGuard>
} />
```

## 9. Добавляем ссылку на страницу в HomePage

```typescript
// Добавить кнопку
<Button
  variant="outlined"
  startIcon={<Server size={20} />}
  onClick={() => navigate('/users-server')}
>
  Серверная пагинация
</Button>
```

## Тестирование функциональности

1. **Серверная пагинация**:
   - При загрузке страницы отправляется запрос с `pageSize=5&pageNumber=1`
   - При переключении страницы отправляется новый запрос
   - Общее количество элементов отображается корректно

2. **Статистика**:
   - Карточки показывают общее количество записей, страниц и записей на текущей странице
   - Обновляются при изменении параметров

3. **Поиск**:
   - Поиск работает только по текущей загруженной странице
   - Показывает количество найденных записей на странице

4. **CRUD операции**:
   - При создании/удалении пользователя данные перезагружаются
   - Текущая страница обновляется с новыми данными

5. **Навигация**:
   - Кнопки первой/последней страницы работают корректно
   - Можно изменить количество записей на странице

## Что получилось:

✅ **Серверная пагинация** - данные загружаются постранично
✅ **Статистика** - карточки с информацией о данных
✅ **Поиск по странице** - локальный поиск по загруженным данным
✅ **CRUD интеграция** - перезагрузка после операций
✅ **Удобная навигация** - кнопки и выбор размера страницы
✅ **Оптимизация** - загружаются только нужные данные
=== React-11.-Обработка-ошибок-на-фронтенде.md ===
# Sprint 11 на React (Обработка ошибок)

Создаем комплексную систему обработки ошибок с перехватчиками, глобальным обработчиком и страницами ошибок.

## 1. Создаем сервис для обработки ошибок (src/services/error.service.ts)

```typescript
import { AxiosError } from 'axios';

export type ErrorResponse = {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
  stack?: string;
};

class ErrorService {
  private listeners: Array<(error: ErrorResponse) => void> = [];
  private lastError: ErrorResponse | null = null;
  private errorCount = 0;

  handleError(error: any): ErrorResponse {
    console.error('Error caught:', error);

    let errorResponse: ErrorResponse = {
      status: error?.response?.status || 500,
      message: 'Произошла непредвиденная ошибка',
      timestamp: new Date().toISOString(),
    };

    if (error.response) {
      // Ошибка от сервера с ответом
      const { status, data } = error.response;
      errorResponse.status = status;
      errorResponse.path = error.config?.url;

      switch (status) {
        case 400:
          if (data.errors) {
            errorResponse.errors = data.errors;
            errorResponse.message = 'Ошибка валидации';
          } else {
            errorResponse.message = data.message || 'Неверный запрос';
          }
          break;

        case 401:
          errorResponse.message = 'Не авторизован';
          break;

        case 403:
          errorResponse.message = 'Доступ запрещен';
          break;

        case 404:
          errorResponse.message = 'Ресурс не найден';
          break;

        case 500:
          errorResponse.message = 'Внутренняя ошибка сервера';
          if (data.message) {
            errorResponse.message = data.message;
          }
          break;

        default:
          errorResponse.message = data.message || `Ошибка ${status}`;
          break;
      }
    } else if (error.request) {
      // Запрос был сделан, но нет ответа
      errorResponse.message = 'Сервер не отвечает. Проверьте подключение к сети.';
    } else {
      // Ошибка при настройке запроса
      errorResponse.message = error.message || 'Ошибка при выполнении запроса';
      if (error.stack) {
        errorResponse.stack = error.stack;
      }
    }

    this.lastError = errorResponse;
    this.errorCount++;
    this.notifyListeners(errorResponse);

    return errorResponse;
  }

  subscribe(listener: (error: ErrorResponse) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(error: ErrorResponse) {
    this.listeners.forEach(listener => listener(error));
  }

  getLastError(): ErrorResponse | null {
    return this.lastError;
  }

  getErrorCount(): number {
    return this.errorCount;
  }

  clearErrors() {
    this.errorCount = 0;
    this.lastError = null;
    this.listeners = [];
  }
}

export const errorService = new ErrorService();
```

## 2. Обновляем API клиент с перехватчиком ошибок (src/api/client.ts)

```typescript
import axios from 'axios';
import { errorService } from '../services/error.service';
import { authService } from '../services/auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5071/api/v1';

let activeRequests = 0;
let loadingCallback: ((loading: boolean) => void) | null = null;

export const setLoadingCallback = (callback: (loading: boolean) => void) => {
  loadingCallback = callback;
};

const updateLoadingState = () => {
  if (loadingCallback) {
    loadingCallback(activeRequests > 0);
  }
};

const getToken = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.token;
    } catch {
      return null;
    }
  }
  return null;
};

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10 секунд таймаут
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  const isAuthRequest = config.url?.includes('/Users/Login') || 
                       config.url?.includes('/Users/Register');
  
  if (token && !isAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  activeRequests++;
  updateLoadingState();
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    activeRequests--;
    updateLoadingState();
    return response;
  },
  (error) => {
    activeRequests--;
    updateLoadingState();

    // Обрабатываем ошибку через сервис
    errorService.handleError(error);

    // Специальная обработка для 401
    if (error.response?.status === 401) {
      const isAuthRequest = error.config?.url?.includes('/Users/Login');
      if (!isAuthRequest) {
        // Токен истек - выходим
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('storage'));
        // Редирект на страницу входа (будет обработан в компонентах)
        window.location.href = '/login?session=expired';
      }
    }

    return Promise.reject(error);
  }
);
```

## 3. Создаем компонент ErrorBoundary (src/components/ErrorBoundary.tsx)

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
} from '@mui/material';
import { AlertTriangle, Home, RefreshCw, Bug, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  expanded: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      expanded: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      expanded: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleExpand = () => {
    this.setState(prev => ({ expanded: !prev.expanded }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth="md" sx={{ py: 8 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Box display="flex" justifyContent="center" mb={3}>
              <AlertTriangle size={64} color="#f44336" />
            </Box>

            <Typography variant="h3" gutterBottom color="error">
              Ошибка!
            </Typography>

            <Typography variant="h5" gutterBottom>
              Что-то пошло не так
            </Typography>

            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
              Произошла критическая ошибка в приложении. Наша команда уже уведомлена.
            </Typography>

            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              <AlertTitle>Ошибка:</AlertTitle>
              {this.state.error?.message || 'Неизвестная ошибка'}
            </Alert>

            <Box display="flex" gap={2} justifyContent="center" sx={{ mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<RefreshCw size={18} />}
                onClick={this.handleReload}
              >
                Перезагрузить страницу
              </Button>
              <Button
                variant="outlined"
                startIcon={<Home size={18} />}
                onClick={this.handleGoHome}
              >
                На главную
              </Button>
            </Box>

            {this.state.errorInfo && (
              <Box>
                <Button
                  onClick={this.toggleExpand}
                  endIcon={this.state.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                >
                  {this.state.expanded ? 'Скрыть детали' : 'Показать детали'}
                </Button>
                <Collapse in={this.state.expanded}>
                  <Paper
                    variant="outlined"
                    sx={{
                      mt: 2,
                      p: 2,
                      bgcolor: '#f5f5f5',
                      textAlign: 'left',
                      overflow: 'auto',
                      maxHeight: 300,
                    }}
                  >
                    <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace' }}>
                      {this.state.error?.stack}
                      {'\n\n'}
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  </Paper>
                </Collapse>
              </Box>
            )}
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}
```

## 4. Создаем компонент ErrorAlert (src/components/ErrorAlert.tsx)

```typescript
import React, { useEffect, useState } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Box,
  Button,
  IconButton,
} from '@mui/material';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { ErrorResponse, errorService } from '../services/error.service';

export const ErrorAlert = () => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = errorService.subscribe((err) => {
      setError(err);
      setOpen(true);
    });

    return unsubscribe;
  }, []);

  const handleClose = () => {
    setOpen(false);
    setExpanded(false);
  };

  if (!error) return null;

  const getSeverity = () => {
    if (error.status < 500) return 'warning';
    return 'error';
  };

  const getTitle = () => {
    switch (error.status) {
      case 400: return 'Ошибка запроса';
      case 401: return 'Не авторизован';
      case 403: return 'Доступ запрещен';
      case 404: return 'Не найдено';
      case 500: return 'Ошибка сервера';
      default: return `Ошибка ${error.status}`;
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={error.status === 401 ? 3000 : 6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        severity={getSeverity()}
        sx={{
          width: '100%',
          maxWidth: 600,
          '& .MuiAlert-message': { width: '100%' },
        }}
        action={
          <Box display="flex" alignItems="center">
            {error.errors && (
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                color="inherit"
              >
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </IconButton>
            )}
            <IconButton size="small" onClick={handleClose} color="inherit">
              <X size={18} />
            </IconButton>
          </Box>
        }
      >
        <AlertTitle>{getTitle()}</AlertTitle>
        <Box>
          <Typography variant="body2">{error.message}</Typography>
          
          {expanded && error.errors && (
            <Box sx={{ mt: 1, pl: 2 }}>
              {Object.entries(error.errors).map(([field, messages]) => (
                <Box key={field}>
                  <Typography variant="caption" color="inherit" sx={{ fontWeight: 'bold' }}>
                    {field}:
                  </Typography>
                  <ul style={{ margin: '4px 0 8px 0', paddingLeft: 20 }}>
                    {messages.map((msg, i) => (
                      <li key={i}>
                        <Typography variant="caption">{msg}</Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Alert>
    </Snackbar>
  );
};
```

## 5. Создаем страницу 404 (src/pages/NotFoundPage.tsx)

```typescript
import React from 'react';
import { Container, Paper, Typography, Box, Button } from '@mui/material';
import { Home, ArrowLeft, FileQuestion } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <Box display="flex" justifyContent="center" mb={3}>
          <FileQuestion size={80} color="#f44336" />
        </Box>

        <Typography variant="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', color: '#f44336' }}>
          404
        </Typography>

        <Typography variant="h4" gutterBottom>
          Страница не найдена
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
          Запрашиваемая страница не существует или была перемещена.
          Проверьте правильность введенного адреса.
        </Typography>

        <Box display="flex" gap={2} justifyContent="center">
          <Button
            variant="contained"
            size="large"
            startIcon={<Home size={20} />}
            onClick={() => navigate('/')}
          >
            На главную
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<ArrowLeft size={20} />}
            onClick={() => navigate(-1)}
          >
            Назад
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};
```

## 6. Создаем страницу 500 (src/pages/ServerErrorPage.tsx)

```typescript
import React from 'react';
import { Container, Paper, Typography, Box, Button, Alert } from '@mui/material';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const ServerErrorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const error = location.state?.error;

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <Box display="flex" justifyContent="center" mb={3}>
          <AlertTriangle size={80} color="#f44336" />
        </Box>

        <Typography variant="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', color: '#f44336' }}>
          500
        </Typography>

        <Typography variant="h4" gutterBottom>
          Ошибка сервера
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
          Произошла внутренняя ошибка сервера. Пожалуйста, попробуйте позже.
          Наша команда уже уведомлена об этой проблеме.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 4, textAlign: 'left' }}>
            <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(error, null, 2)}
            </Typography>
          </Alert>
        )}

        <Box display="flex" gap={2} justifyContent="center">
          <Button
            variant="contained"
            startIcon={<Home size={20} />}
            onClick={() => navigate('/')}
          >
            На главную
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={20} />}
            onClick={() => window.location.reload()}
          >
            Обновить
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};
```

## 7. Создаем страницу демонстрации ошибок (src/pages/ErrorDemoPage.tsx)

```typescript
import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import {
  Bug,
  AlertCircle,
  WifiOff,
  Shield,
  Server,
  FileWarning,
  Loader2,
} from 'lucide-react';
import apiClient from '../api/client';
import { errorService } from '../services/error.service';

export const ErrorDemoPage = () => {
  const [userId, setUserId] = useState('999999');
  const [loading, setLoading] = useState<string | null>(null);

  const trigger404 = async () => {
    setLoading('404');
    try {
      await apiClient.get(`/Users/${userId}`);
    } catch (error) {
      // Ошибка уже обработана
    } finally {
      setLoading(null);
    }
  };

  const trigger401 = async () => {
    setLoading('401');
    try {
      await apiClient.get('/Users/admin');
    } catch (error) {
      // Ошибка уже обработана
    } finally {
      setLoading(null);
    }
  };

  const triggerValidation = async () => {
    setLoading('validation');
    try {
      await apiClient.post('/Users', {
        login: '',
        password: '123',
      });
    } catch (error) {
      // Ошибка уже обработана
    } finally {
      setLoading(null);
    }
  };

  const triggerNetwork = () => {
    errorService.handleError({
      request: {},
      message: 'Network Error',
    });
  };

  const triggerProgram = () => {
    try {
      throw new Error('Это тестовая программная ошибка');
    } catch (error) {
      errorService.handleError(error);
    }
  };

  const errorTypes = [
    {
      title: '404 Not Found',
      description: 'Запрос несуществующего пользователя',
      icon: <FileWarning size={24} />,
      color: '#ff9800',
      action: trigger404,
      loading: loading === '404',
      params: (
        <TextField
          size="small"
          label="ID пользователя"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          fullWidth
        />
      ),
    },
    {
      title: '401 Unauthorized',
      description: 'Доступ без авторизации',
      icon: <Shield size={24} />,
      color: '#f44336',
      action: trigger401,
      loading: loading === '401',
    },
    {
      title: 'Ошибка валидации',
      description: 'Неверные данные при создании',
      icon: <AlertCircle size={24} />,
      color: '#9c27b0',
      action: triggerValidation,
      loading: loading === 'validation',
    },
    {
      title: 'Ошибка сети',
      description: 'Сервер не отвечает',
      icon: <WifiOff size={24} />,
      color: '#607d8b',
      action: triggerNetwork,
    },
    {
      title: 'Программная ошибка',
      description: 'Исключение в коде',
      icon: <Bug size={24} />,
      color: '#e91e63',
      action: triggerProgram,
    },
    {
      title: '500 Server Error',
      description: 'Внутренняя ошибка сервера',
      icon: <Server size={24} />,
      color: '#d32f2f',
      action: () => window.location.href = '/500',
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Bug size={32} color="#f44336" />
          <Typography variant="h4">Демонстрация ошибок</Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            Нажмите на кнопки, чтобы увидеть различные типы ошибок. 
            Все ошибки перехватываются глобальным обработчиком и отображаются в уведомлениях.
          </Typography>
        </Alert>

        <Grid container spacing={3}>
          {errorTypes.map((type, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: `${type.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: type.color,
                      }}
                    >
                      {type.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6">{type.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {type.description}
                      </Typography>
                    </Box>
                  </Box>

                  {type.params && (
                    <Box sx={{ mb: 2 }}>
                      {type.params}
                    </Box>
                  )}

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={type.action}
                    disabled={type.loading}
                    sx={{
                      bgcolor: type.color,
                      '&:hover': {
                        bgcolor: type.color,
                        filter: 'brightness(0.9)',
                      },
                    }}
                    startIcon={type.loading ? <Loader2 className="spin" size={18} /> : null}
                  >
                    {type.loading ? 'Загрузка...' : 'Запустить'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Box>
          <Typography variant="h6" gutterBottom>
            Статистика ошибок
          </Typography>
          <Box display="flex" gap={2}>
            <Chip
              label={`Всего ошибок: ${errorService.getErrorCount()}`}
              color="primary"
            />
            {errorService.getLastError() && (
              <Chip
                label={`Последняя: ${errorService.getLastError()?.status} - ${errorService.getLastError()?.message.substring(0, 30)}...`}
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      </Paper>

      {/* Стили для анимации */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </Container>
  );
};
```

## 8. Обновляем App.tsx с ErrorBoundary и ErrorAlert

```typescript
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { GlobalLoader } from './components/GlobalLoader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorAlert } from './components/ErrorAlert';
import { AuthGuard } from './components/guards/AuthGuard';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { UsersPage } from './pages/UsersPage';
import { UsersServerPage } from './pages/UsersServerPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoadingDemoPage } from './pages/LoadingDemoPage';
import { TableDemoPage } from './pages/TableDemoPage';
import { ErrorDemoPage } from './pages/ErrorDemoPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ServerErrorPage } from './pages/ServerErrorPage';
import { setLoadingCallback } from './api/client';
import { useLoading } from './contexts/LoadingContext';

const theme = createTheme({
  palette: {
    primary: { main: '#3f51b5' },
  },
});

const LoadingBridge = () => {
  const { setLoading } = useLoading();
  useEffect(() => {
    setLoadingCallback(setLoading);
  }, [setLoading]);
  return null;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LoadingProvider>
        <AuthProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <LoadingBridge />
              <GlobalLoader message="Загрузка..." />
              <ErrorAlert />
              <Header />
              <Routes>
                {/* Публичные маршруты */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/loading-demo" element={<LoadingDemoPage />} />
                <Route path="/table-demo" element={<TableDemoPage />} />
                <Route path="/error-demo" element={<ErrorDemoPage />} />
                
                {/* Защищенные маршруты */}
                <Route path="/users" element={
                  <AuthGuard>
                    <UsersPage />
                  </AuthGuard>
                } />
                <Route path="/users-server" element={
                  <AuthGuard>
                    <UsersServerPage />
                  </AuthGuard>
                } />
                <Route path="/profile/:id" element={
                  <AuthGuard>
                    <ProfilePage />
                  </AuthGuard>
                } />
                <Route path="/profile/:id/edit" element={
                  <AuthGuard>
                    <EditProfilePage />
                  </AuthGuard>
                } />
                
                {/* Маршруты ошибок */}
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="/500" element={<ServerErrorPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </AuthProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
```

## 9. Добавляем ссылку на демо ошибок в HomePage

```typescript
// Добавить кнопку
<Button
  variant="outlined"
  color="error"
  startIcon={<Bug size={20} />}
  onClick={() => navigate('/error-demo')}
>
  Демо ошибок
</Button>
```

## Тестирование функциональности

1. **HTTP ошибки**:
   - 404 - запрос несуществующего пользователя
   - 401 - попытка доступа без авторизации
   - 400 - ошибка валидации

2. **Сетевые ошибки**:
   - Отключите сервер и выполните запрос
   - Должно появиться сообщение о недоступности сервера

3. **Программные ошибки**:
   - Нажмите кнопку программной ошибки
   - ErrorBoundary должен показать страницу с ошибкой

4. **404 страница**:
   - Перейдите на несуществующий маршрут
   - Должна открыться красивая страница 404

5. **500 страница**:
   - Перейдите на `/500` или вызовите через демо
   - Показывается с деталями ошибки

## Что получилось:

✅ **Глобальный перехватчик ошибок** - все ошибки проходят через ErrorService
✅ **ErrorBoundary** - ловит критические ошибки в компонентах
✅ **ErrorAlert** - красивые уведомления об ошибках
✅ **Страницы ошибок** - 404 и 500 с дизайном
✅ **Демо-страница** - для тестирования всех типов ошибок
✅ **Статистика** - счетчик и последняя ошибка
=== React-12.-Смена-темы-приложения.md ===
# Sprint 12 на React (Смена темы)

Реализуем переключение между светлой и темной темой приложения с сохранением выбора пользователя.

## 1. Создаем контекст темы (src/contexts/ThemeContext.tsx)

```typescript
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Светлая тема
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3f51b5',
      light: '#757de8',
      dark: '#002984',
    },
    secondary: {
      main: '#f50057',
      light: '#ff4081',
      dark: '#c51162',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#3f51b5',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

// Темная тема
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
      light: '#e3f2fd',
      dark: '#42a5f5',
    },
    secondary: {
      main: '#f48fb1',
      light: '#ffc1e3',
      dark: '#bf5f82',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e1e1e',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isDark, setIsDark] = useState(false);

  // Загружаем сохраненную тему при старте
  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode') as ThemeMode | null;
    if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
      setMode(savedMode);
    }
  }, []);

  // Определяем актуальную тему
  useEffect(() => {
    // Сохраняем выбор пользователя
    localStorage.setItem('themeMode', mode);

    if (mode === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(systemDark);
    } else {
      setIsDark(mode === 'dark');
    }
  }, [mode]);

  // Следим за изменением системной темы
  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [mode]);

  const toggleTheme = () => {
    if (mode === 'system') {
      setMode(isDark ? 'light' : 'dark');
    } else {
      setMode(isDark ? 'light' : 'dark');
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ mode, isDark, toggleTheme, setMode }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
```

## 2. Создаем компонент ThemeToggle (src/components/ThemeToggle.tsx)

```typescript
import React, { useState } from 'react';
import {
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Check,
  ChevronDown,
} from 'lucide-react';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';

type ThemeToggleProps = {
  variant?: 'icon' | 'switch' | 'dropdown' | 'full';
  showLabel?: boolean;
};

export const ThemeToggle = ({ variant = 'icon', showLabel = false }: ThemeToggleProps) => {
  const { mode, isDark, toggleTheme, setMode } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleModeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    handleClose();
  };

  const getIcon = () => {
    if (mode === 'system') return <Monitor size={20} />;
    return isDark ? <Moon size={20} /> : <Sun size={20} />;
  };

  const getLabel = () => {
    if (mode === 'system') return 'Системная';
    return isDark ? 'Темная' : 'Светлая';
  };

  // Вариант с выпадающим меню
  if (variant === 'dropdown') {
    return (
      <>
        <Tooltip title="Настройки темы">
          <IconButton onClick={handleClick} color="inherit">
            {getIcon()}
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={() => handleModeChange('light')}>
            <ListItemIcon>
              <Sun size={18} />
            </ListItemIcon>
            <ListItemText>Светлая</ListItemText>
            {mode === 'light' && <Check size={18} color="#3f51b5" />}
          </MenuItem>
          <MenuItem onClick={() => handleModeChange('dark')}>
            <ListItemIcon>
              <Moon size={18} />
            </ListItemIcon>
            <ListItemText>Темная</ListItemText>
            {mode === 'dark' && <Check size={18} color="#3f51b5" />}
          </MenuItem>
          <MenuItem onClick={() => handleModeChange('system')}>
            <ListItemIcon>
              <Monitor size={18} />
            </ListItemIcon>
            <ListItemText>Системная</ListItemText>
            {mode === 'system' && <Check size={18} color="#3f51b5" />}
          </MenuItem>
        </Menu>
      </>
    );
  }

  // Вариант с переключателем
  if (variant === 'switch') {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={isDark}
            onChange={toggleTheme}
            color="default"
            icon={<Sun size={18} />}
            checkedIcon={<Moon size={18} />}
          />
        }
        label={showLabel ? (isDark ? 'Темная' : 'Светлая') : ''}
      />
    );
  }

  // Полный вариант с кнопкой и индикатором
  if (variant === 'full') {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <Tooltip title="Переключить тему">
          <IconButton onClick={toggleTheme} color="inherit" size="small">
            {getIcon()}
          </IconButton>
        </Tooltip>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Palette size={16} color="inherit" />
          <span style={{ fontSize: '0.9rem' }}>{getLabel()}</span>
          <IconButton size="small" onClick={handleClick}>
            <ChevronDown size={16} />
          </IconButton>
        </Box>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          <MenuItem onClick={() => handleModeChange('light')}>
            <ListItemIcon>
              <Sun size={18} />
            </ListItemIcon>
            <ListItemText>Светлая</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleModeChange('dark')}>
            <ListItemIcon>
              <Moon size={18} />
            </ListItemIcon>
            <ListItemText>Темная</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleModeChange('system')}>
            <ListItemIcon>
              <Monitor size={18} />
            </ListItemIcon>
            <ListItemText>Системная</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    );
  }

  // По умолчанию - иконка
  return (
    <Tooltip title={isDark ? 'Светлая тема' : 'Темная тема'}>
      <IconButton onClick={toggleTheme} color="inherit">
        {getIcon()}
      </IconButton>
    </Tooltip>
  );
};
```

## 3. Создаем компонент ThemeSettings (src/components/ThemeSettings.tsx)

```typescript
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Paper,
  Divider,
  Alert,
  Chip,
} from '@mui/material';
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Check,
  Eye,
} from 'lucide-react';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';

type ThemeSettingsProps = {
  open: boolean;
  onClose: () => void;
};

export const ThemeSettings = ({ open, onClose }: ThemeSettingsProps) => {
  const { mode, setMode, isDark, colors } = useTheme();

  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMode(event.target.value as ThemeMode);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Palette size={24} />
          <span>Настройки темы</span>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Предпросмотр */}
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            mb: 3,
            textAlign: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <Box display="flex" justifyContent="center" mb={2}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                mb: 2,
              }}
            >
              <Eye size={30} />
            </Box>
          </Box>
          <Typography variant="h6" gutterBottom>
            {mode === 'system' ? 'Системная тема' : isDark ? 'Темная тема' : 'Светлая тема'}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {isDark 
              ? 'Темный фон, светлый текст, приглушенные цвета'
              : 'Светлый фон, темный текст, яркие цвета'}
          </Typography>
          <Box display="flex" gap={1} justifyContent="center">
            <Chip
              size="small"
              label="Primary"
              sx={{ bgcolor: 'primary.main', color: 'white' }}
            />
            <Chip
              size="small"
              label="Secondary"
              sx={{ bgcolor: 'secondary.main', color: 'white' }}
            />
          </Box>
        </Paper>

        {/* Выбор темы */}
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend">Режим темы</FormLabel>
          <RadioGroup value={mode} onChange={handleModeChange}>
            <FormControlLabel
              value="light"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Sun size={18} />
                  <span>Светлая</span>
                </Box>
              }
            />
            <FormControlLabel
              value="dark"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Moon size={18} />
                  <span>Темная</span>
                </Box>
              }
            />
            <FormControlLabel
              value="system"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Monitor size={18} />
                  <span>Системная (по умолчанию)</span>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        <Divider sx={{ my: 3 }} />

        {/* Информация */}
        <Alert severity="info">
          <Typography variant="body2">
            Выбранная тема сохраняется в localStorage и восстанавливается при следующем визите.
            {mode === 'system' && ' Сейчас используется системная тема вашего устройства.'}
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
};
```

## 4. Обновляем Header с переключателем темы (src/components/Header.tsx)

```typescript
import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Divider,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Home,
  Users,
  LogIn,
  LogOut,
  User as UserIcon,
  Settings,
  Edit,
  Shield,
  Palette,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { ThemeSettings } from './ThemeSettings';

export const Header = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const { isDark } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/');
  };

  const handleProfile = () => {
    handleClose();
    if (user) {
      navigate(`/profile/${user.id}`);
    }
  };

  const handleEditProfile = () => {
    handleClose();
    if (user) {
      navigate(`/profile/${user.id}/edit`);
    }
  };

  const handleSettings = () => {
    handleClose();
    setSettingsOpen(true);
  };

  return (
    <>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}
            onClick={() => navigate('/')}
          >
            <Palette size={24} />
            SampleApp
          </Typography>

          <Box display="flex" alignItems="center" gap={1}>
            <Button
              color="inherit"
              onClick={() => navigate('/')}
              startIcon={<Home size={18} />}
            >
              Главная
            </Button>

            {user && (
              <Button
                color="inherit"
                onClick={() => navigate('/users')}
                startIcon={<Users size={18} />}
              >
                Пользователи
              </Button>
            )}

            {/* Переключатель темы */}
            <ThemeToggle variant="dropdown" />

            {user ? (
              <>
                {token && (
                  <Tooltip title="JWT токен активен">
                    <Badge
                      variant="dot"
                      color="success"
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    >
                      <IconButton onClick={handleMenu} size="small">
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: isDark ? 'primary.dark' : 'secondary.main',
                          }}
                        >
                          {user.login.charAt(0).toUpperCase()}
                        </Avatar>
                      </IconButton>
                    </Badge>
                  </Tooltip>
                )}

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  PaperProps={{
                    sx: {
                      mt: 1.5,
                      minWidth: 200,
                      '& .MuiMenuItem-root': {
                        px: 2,
                        py: 1,
                      },
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="subtitle2" noWrap>
                      {user.name || user.login}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      @{user.login}
                    </Typography>
                  </Box>

                  <Divider />

                  <MenuItem onClick={handleProfile}>
                    <UserIcon size={16} style={{ marginRight: 12 }} />
                    Профиль
                  </MenuItem>

                  <MenuItem onClick={handleEditProfile}>
                    <Edit size={16} style={{ marginRight: 12 }} />
                    Редактировать
                  </MenuItem>

                  <MenuItem onClick={handleSettings}>
                    <Palette size={16} style={{ marginRight: 12 }} />
                    Настройки темы
                  </MenuItem>

                  <Divider />

                  <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                    <LogOut size={16} style={{ marginRight: 12 }} />
                    Выйти
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                color="inherit"
                onClick={() => navigate('/login')}
                startIcon={<LogIn size={18} />}
              >
                Вход
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Модальное окно настроек темы */}
      <ThemeSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};
```

## 5. Создаем страницу настроек темы (src/pages/ThemeSettingsPage.tsx)

```typescript
import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
  Chip,
  Alert,
  Switch,
  FormControlLabel,
  Slider,
} from '@mui/material';
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Eye,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';

export const ThemeSettingsPage = () => {
  const { mode, setMode, isDark, colors } = useTheme();

  const handleReset = () => {
    setMode('system');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Palette size={32} color="#3f51b5" />
          <Typography variant="h4">Настройки темы</Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" paragraph>
          Настройте внешний вид приложения под свои предпочтения.
          Выберите светлую, темную или системную тему.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Предпросмотр темы */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                bgcolor: 'background.paper',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Eye size={24} color="#3f51b5" />
                  <Typography variant="h6">Предпросмотр</Typography>
                </Box>

                <Box
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    bgcolor: 'background.default',
                    color: 'text.primary',
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Пример карточки
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Это пример текста в выбранной теме. Цвета автоматически адаптируются.
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Button variant="contained" color="primary" size="small">
                      Primary
                    </Button>
                    <Button variant="contained" color="secondary" size="small">
                      Secondary
                    </Button>
                    <Button variant="outlined" size="small">
                      Outlined
                    </Button>
                  </Box>
                </Box>

                <Box mt={2}>
                  <Chip
                    label={isDark ? 'Темная тема' : 'Светлая тема'}
                    color="primary"
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={mode === 'system' ? 'Системная' : mode}
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Цветовая схема
                </Typography>

                <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Primary
                    </Typography>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        bgcolor: 'primary.main',
                        borderRadius: 1,
                        mt: 0.5,
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Secondary
                    </Typography>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        bgcolor: 'secondary.main',
                        borderRadius: 1,
                        mt: 0.5,
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Background
                    </Typography>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        bgcolor: 'background.default',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        mt: 0.5,
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Paper
                    </Typography>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        mt: 0.5,
                      }}
                    />
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Выбор темы
                </Typography>

                <Box display="flex" flexDirection="column" gap={2}>
                  <Button
                    variant={mode === 'light' ? 'contained' : 'outlined'}
                    startIcon={<Sun size={18} />}
                    onClick={() => setMode('light')}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Светлая тема
                  </Button>

                  <Button
                    variant={mode === 'dark' ? 'contained' : 'outlined'}
                    startIcon={<Moon size={18} />}
                    onClick={() => setMode('dark')}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Темная тема
                  </Button>

                  <Button
                    variant={mode === 'system' ? 'contained' : 'outlined'}
                    startIcon={<Monitor size={18} />}
                    onClick={() => setMode('system')}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Системная тема
                  </Button>
                </Box>

                <Box display="flex" gap={2} mt={3}>
                  <Button
                    variant="outlined"
                    startIcon={<RotateCcw size={18} />}
                    onClick={handleReset}
                    fullWidth
                  >
                    Сбросить
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Дополнительные настройки */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Дополнительные настройки
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Анимированные переходы"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Плавные переходы при смене темы
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Адаптивный контраст"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Автоматическая настройка контрастности
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Информация */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Тема сохраняется</strong> в localStorage вашего браузера и будет
            автоматически загружаться при следующем визите.
            {mode === 'system' && ' Сейчас используется системная тема вашего устройства.'}
          </Typography>
        </Alert>

        <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
          <ThemeToggle variant="full" />
        </Box>
      </Paper>
    </Container>
  );
};
```

## 6. Обновляем App.tsx с ThemeProvider

```typescript
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { GlobalLoader } from './components/GlobalLoader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorAlert } from './components/ErrorAlert';
import { AuthGuard } from './components/guards/AuthGuard';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { UsersPage } from './pages/UsersPage';
import { UsersServerPage } from './pages/UsersServerPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoadingDemoPage } from './pages/LoadingDemoPage';
import { TableDemoPage } from './pages/TableDemoPage';
import { ErrorDemoPage } from './pages/ErrorDemoPage';
import { ThemeSettingsPage } from './pages/ThemeSettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ServerErrorPage } from './pages/ServerErrorPage';
import { setLoadingCallback } from './api/client';
import { useLoading } from './contexts/LoadingContext';

const LoadingBridge = () => {
  const { setLoading } = useLoading();
  useEffect(() => {
    setLoadingCallback(setLoading);
  }, [setLoading]);
  return null;
};

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <LoadingProvider>
        <AuthProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <LoadingBridge />
              <GlobalLoader message="Загрузка..." />
              <ErrorAlert />
              <Header />
              <Routes>
                {/* Публичные маршруты */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/loading-demo" element={<LoadingDemoPage />} />
                <Route path="/table-demo" element={<TableDemoPage />} />
                <Route path="/error-demo" element={<ErrorDemoPage />} />
                <Route path="/theme-settings" element={<ThemeSettingsPage />} />
                
                {/* Защищенные маршруты */}
                <Route path="/users" element={
                  <AuthGuard>
                    <UsersPage />
                  </AuthGuard>
                } />
                <Route path="/users-server" element={
                  <AuthGuard>
                    <UsersServerPage />
                  </AuthGuard>
                } />
                <Route path="/profile/:id" element={
                  <AuthGuard>
                    <ProfilePage />
                  </AuthGuard>
                } />
                <Route path="/profile/:id/edit" element={
                  <AuthGuard>
                    <EditProfilePage />
                  </AuthGuard>
                } />
                
                {/* Маршруты ошибок */}
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="/500" element={<ServerErrorPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </AuthProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
```

## 7. Обновляем HomePage с информацией о теме

```typescript
// Добавить в HomePage.tsx
import { useTheme } from '../contexts/ThemeContext';
import { Palette } from 'lucide-react';

// Внутри компонента:
const { isDark, toggleTheme } = useTheme();

// Добавить кнопку:
<Button
  variant="outlined"
  startIcon={<Palette size={20} />}
  onClick={() => navigate('/theme-settings')}
>
  Настройки темы
</Button>
```

## Тестирование функциональности

1. **Переключение темы**:
   - Нажмите на иконку темы в хедере
   - Тема должна плавно измениться
   - Все цвета должны адаптироваться

2. **Сохранение темы**:
   - Переключите тему на темную
   - Обновите страницу
   - Тема должна остаться темной

3. **Системная тема**:
   - Выберите "Системная" в настройках
   - Тема будет меняться при изменении системных настроек

4. **Настройки темы**:
   - Перейдите на `/theme-settings`
   - Попробуйте разные режимы
   - Посмотрите предпросмотр цветов

5. **Анимации**:
   - Иконка темы анимируется при переключении
   - Плавные переходы между темами

## Что получилось:

✅ **Три режима** - светлая, темная, системная
✅ **Сохранение** - в localStorage
✅ **Предпросмотр** - на странице настроек
✅ **Плавные переходы** - анимации при смене темы
✅ **Интеграция** - со всеми компонентами Material UI
✅ **Удобное меню** - переключение в хедере
=== React-1.-Создание-проекта-React.md ===
## 1. Создание проекта

```bash
npm create vite@latest sampleapp-react
cd sampleapp-react
npm install
npm install axios @tanstack/react-query @mui/material @emotion/react @emotion/styled lucide-react react-router-dom
```

## 2. Структура (очень простая)

```
src/
├── api/          # запросы к API
├── components/   # компоненты
├── pages/        # страницы
├── App.tsx       # главный компонент
└── main.tsx
```

## 3. Типы (src/types.ts)

```typescript
export type User = {
  id: number;
  name: string;
  login?: string;
};
```

## 4. API (src/api/users.ts)

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5071/api/v1';

export const getUsers = async () => {
  const response = await axios.get(`${API_URL}/Users`);
  return response.data;
};
```

## 5. Хук для пользователей (src/hooks/useUsers.ts)

```typescript
import { useState, useEffect } from 'react';
import { getUsers } from '../api/users';
import { User } from '../types';

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError('Не удалось загрузить пользователей');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return {
    users,
    loading,
    error,
    refetch: loadUsers,
    totalCount: users.length,
  };
};
```

## 6. Компонент Header (src/components/Header.tsx)

```typescript
import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Home, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const navigate = useNavigate();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          SampleApp
        </Typography>
        <Button color="inherit" onClick={() => navigate('/')} startIcon={<Home size={20} />}>
          Главная
        </Button>
        <Button color="inherit" onClick={() => navigate('/users')} startIcon={<Users size={20} />}>
          Пользователи
        </Button>
      </Toolbar>
    </AppBar>
  );
};
```

## 7. Компонент загрузки (src/components/LoadingSpinner.tsx)

```typescript
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export const LoadingSpinner = () => (
  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="200px" gap={2}>
    <CircularProgress />
    <Typography color="text.secondary">Загрузка...</Typography>
  </Box>
);
```

## 8. Компонент ошибки (src/components/ErrorMessage.tsx)

```typescript
import React from 'react';
import { Alert, AlertTitle, Button } from '@mui/material';
import { RefreshCw } from 'lucide-react';

type Props = {
  message: string;
  onRetry?: () => void;
};

export const ErrorMessage = ({ message, onRetry }: Props) => (
  <Alert
    severity="error"
    action={
      onRetry && (
        <Button color="inherit" size="small" onClick={onRetry} startIcon={<RefreshCw size={18} />}>
          Повторить
        </Button>
      )
    }
  >
    <AlertTitle>Ошибка</AlertTitle>
    {message}
  </Alert>
);
```

## 9. Таблица пользователей (src/components/UsersTable.tsx)

```typescript
import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import { User } from '../types';

type Props = {
  users: User[];
};

export const UsersTable = ({ users }: Props) => {
  if (users.length === 0) {
    return (
      <Typography color="text.secondary" align="center" py={4}>
        Нет пользователей
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Имя</TableCell>
            <TableCell>Логин</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} hover>
              <TableCell>{user.id}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.login || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
```

## 10. Страница пользователей (src/pages/UsersPage.tsx)

```typescript
import React from 'react';
import { Container, Typography, Button, Box, Paper } from '@mui/material';
import { RefreshCw, Users as UsersIcon } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { UsersTable } from '../components/UsersTable';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

export const UsersPage = () => {
  const { users, loading, error, refetch, totalCount } = useUsers();

  if (loading) {
    return (
      <Container sx={{ py: 4 }}>
        <LoadingSpinner />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <UsersIcon size={28} color="#3f51b5" />
            <Typography variant="h4">Пользователи {totalCount > 0 && `(${totalCount})`}</Typography>
          </Box>
          <Button variant="contained" startIcon={<RefreshCw size={18} />} onClick={refetch}>
            Обновить
          </Button>
        </Box>

        {error && <ErrorMessage message={error} onRetry={refetch} />}

        <UsersTable users={users} />
      </Paper>
    </Container>
  );
};
```

## 11. Главная страница (src/pages/HomePage.tsx)

```typescript
import React from 'react';
import { Container, Typography, Box, Paper, Avatar } from '@mui/material';
import { Home, Users, Sparkles } from 'lucide-react';

export const HomePage = () => (
  <Container maxWidth="md" sx={{ py: 4 }}>
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <Box display="flex" justifyContent="center" gap={2} mb={3}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60 }}>
          <Home size={30} />
        </Avatar>
        <Avatar sx={{ bgcolor: 'secondary.main', width: 60, height: 60 }}>
          <Users size={30} />
        </Avatar>
        <Avatar sx={{ bgcolor: 'success.main', width: 60, height: 60 }}>
          <Sparkles size={30} />
        </Avatar>
      </Box>

      <Typography variant="h2" gutterBottom>
        Добро пожаловать!
      </Typography>
      <Typography variant="h5" color="text.secondary" paragraph>
        SampleApp на React
      </Typography>
      <Typography variant="body1">Демонстрационное приложение для работы с пользователями</Typography>
    </Paper>
  </Container>
);
```

## 12. Главный компонент App (src/App.tsx)

```typescript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { UsersPage } from './pages/UsersPage';

const theme = createTheme({
  palette: {
    primary: { main: '#3f51b5' },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/users" element={<UsersPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
```

## 13. Точка входа (src/main.tsx)

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## 14. Переменные окружения

**.env:**
```env
VITE_API_URL=http://localhost:5071/api/v1
```

## 15. package.json (скрипты)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

## Запуск

```bash
npm run dev
```

## Что получилось:

✅ **Все просто** - никакой сложной архитектуры
✅ **Понятные названия** - сразу ясно, что делает каждый файл
✅ **Минимум кода** - только то, что нужно для спринта
✅ **Работает из коробки** - запустил и сразу видно пользователей

## Сравнение с Angular:

| Angular | React (эта версия) |
|---------|-------------------|
| `ng g c home` | Создали файл `HomePage.tsx` вручную |
| `@Injectable()` сервисы | Простой хук `useUsers` |
| `HttpClient` с Observable | `axios` + async/await |
| `RouterModule` | `react-router-dom` |
| `*ngFor` | `map` в JSX |
| `*ngIf` | Тернарные операторы |
| Модули | Простые импорты/экспорты |
=== React-2.-Регистрация-и-аутентификация.md ===
## 1. Устанавливаем зависимости

```bash
npm install react-hook-form
```

## 2. Типы (src/types.ts)

```typescript
export type User = {
  id: number;
  name: string;
  login: string;
  token?: string;
};

export type LoginData = {
  login: string;
  password: string;
};

export type RegisterData = {
  login: string;
  password: string;
  name?: string;
};
```

## 3. API для авторизации (src/api/auth.ts)

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5071/api/v1';

export const login = async (login: string, password: string) => {
  const response = await axios.post(`${API_URL}/Users/Login`, { login, password });
  return response.data;
};

export const register = async (data: { login: string; password: string; name?: string }) => {
  const response = await axios.post(`${API_URL}/Users`, data);
  return response.data;
};
```

## 4. Контекст авторизации (src/contexts/AuthContext.tsx)

```typescript
import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '../types';
import { login as loginApi, register as registerApi } from '../api/auth';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (data: { login: string; password: string; name?: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем localStorage при загрузке
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (login: string, password: string) => {
    const user = await loginApi(login, password);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const register = async (data: { login: string; password: string; name?: string }) => {
    await registerApi(data);
    // После регистрации не логиним автоматически
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

## 5. Компонент входа (src/components/LoginForm.tsx)

```typescript
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { TextField, Button, Box, InputAdornment, IconButton, Alert } from '@mui/material';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type FormData = {
  login: string;
  password: string;
};

export const LoginForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError('');
      await login(data.login, data.password);
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Логин"
          {...register('login', { required: 'Логин обязателен' })}
          error={!!errors.login}
          helperText={errors.login?.message}
          disabled={loading}
          fullWidth
        />

        <TextField
          label="Пароль"
          type={showPassword ? 'text' : 'password'}
          {...register('password', { required: 'Пароль обязателен' })}
          error={!!errors.password}
          helperText={errors.password?.message}
          disabled={loading}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button 
          type="submit" 
          variant="contained" 
          startIcon={<LogIn size={20} />}
          disabled={loading}
          fullWidth
        >
          {loading ? 'Вход...' : 'Войти'}
        </Button>
      </Box>
    </form>
  );
};
```

## 6. Компонент регистрации (src/components/RegisterForm.tsx)

```typescript
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { TextField, Button, Box, InputAdornment, IconButton, Alert } from '@mui/material';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type FormData = {
  login: string;
  password: string;
  name: string;
};

export const RegisterForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError('');
      await registerUser(data);
      onSuccess?.();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      if (errors) {
        const messages = Object.values(errors).flat().join('. ');
        setError(messages);
      } else {
        setError(err.response?.data?.message || 'Ошибка регистрации');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Имя"
          {...register('name')}
          disabled={loading}
          fullWidth
        />

        <TextField
          label="Логин"
          {...register('login', { required: 'Логин обязателен' })}
          error={!!errors.login}
          helperText={errors.login?.message}
          disabled={loading}
          fullWidth
        />

        <TextField
          label="Пароль"
          type={showPassword ? 'text' : 'password'}
          {...register('password', { 
            required: 'Пароль обязателен',
            minLength: { value: 3, message: 'Минимум 3 символа' },
            maxLength: { value: 8, message: 'Максимум 8 символов' }
          })}
          error={!!errors.password}
          helperText={errors.password?.message}
          disabled={loading}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button 
          type="submit" 
          variant="contained" 
          startIcon={<UserPlus size={20} />}
          disabled={loading}
          fullWidth
        >
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </Button>
      </Box>
    </form>
  );
};
```

## 7. Страница входа (src/pages/LoginPage.tsx)

```typescript
import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { Lock } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <Lock size={48} color="#3f51b5" />
          <Typography variant="h4" sx={{ mt: 2 }}>Вход</Typography>
        </Box>

        <LoginForm onSuccess={() => navigate('/')} />

        <Box textAlign="center" mt={2}>
          <Typography variant="body2">
            Нет аккаунта?{' '}
            <Button color="primary" onClick={() => navigate('/register')}>
              Зарегистрироваться
            </Button>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};
```

## 8. Страница регистрации (src/pages/RegisterPage.tsx)

```typescript
import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { RegisterForm } from '../components/RegisterForm';
import { UserPlus } from 'lucide-react';

export const RegisterPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <UserPlus size={48} color="#3f51b5" />
          <Typography variant="h4" sx={{ mt: 2 }}>Регистрация</Typography>
        </Box>

        <RegisterForm onSuccess={() => navigate('/login')} />

        <Box textAlign="center" mt={2}>
          <Typography variant="body2">
            Уже есть аккаунт?{' '}
            <Button color="primary" onClick={() => navigate('/login')}>
              Войти
            </Button>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};
```

## 9. Обновляем Header (src/components/Header.tsx)

```typescript
import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Menu, MenuItem, Avatar } from '@mui/material';
import { Home, Users, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          SampleApp
        </Typography>

        <Button color="inherit" onClick={() => navigate('/')} startIcon={<Home size={20} />}>
          Главная
        </Button>

        {user && (
          <Button color="inherit" onClick={() => navigate('/users')} startIcon={<Users size={20} />}>
            Пользователи
          </Button>
        )}

        {user ? (
          <>
            <Button color="inherit" onClick={handleMenu} startIcon={<UserIcon size={20} />}>
              {user.login}
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
              <MenuItem onClick={handleLogout}>
                <LogOut size={16} style={{ marginRight: 8 }} />
                Выйти
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Button color="inherit" onClick={() => navigate('/login')} startIcon={<LogIn size={20} />}>
            Вход
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};
```

## 10. Обновляем App.tsx

```typescript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { UsersPage } from './pages/UsersPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

const theme = createTheme({
  palette: {
    primary: { main: '#3f51b5' },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
```

## 11. Обновляем HomePage (src/pages/HomePage.tsx)

```typescript
import React from 'react';
import { Container, Typography, Box, Paper, Avatar, Button } from '@mui/material';
import { Home, Users, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Box display="flex" justifyContent="center" gap={2} mb={3}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60 }}>
            <Home size={30} />
          </Avatar>
          <Avatar sx={{ bgcolor: 'secondary.main', width: 60, height: 60 }}>
            <Users size={30} />
          </Avatar>
          <Avatar sx={{ bgcolor: 'success.main', width: 60, height: 60 }}>
            <Sparkles size={30} />
          </Avatar>
        </Box>

        <Typography variant="h2" gutterBottom>
          {user ? `Добро пожаловать, ${user.login}!` : 'Добро пожаловать!'}
        </Typography>
        
        <Typography variant="h5" color="text.secondary" paragraph>
          SampleApp на React
        </Typography>

        {!user && (
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="contained" startIcon={<LogIn size={20} />} onClick={() => navigate('/login')}>
              Войти
            </Button>
            <Button variant="outlined" startIcon={<UserPlus size={20} />} onClick={() => navigate('/register')}>
              Регистрация
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};
```

## Запуск

```bash
npm run dev
```

## Что получилось:

✅ **Авторизация** - вход по логину/паролю
✅ **Регистрация** - создание нового пользователя  
✅ **Сохранение сессии** - пользователь не сбрасывается при обновлении
✅ **Защита маршрутов** - страница пользователей только для авторизованных
✅ **Выход** - кнопка выхода из системы

## Маршруты:

- `/` - главная (приветствие)
- `/users` - список пользователей (только для авторизованных)
- `/login` - вход
- `/register` - регистрация

## Что использовали:

- `react-hook-form` - для работы с формами
- `localStorage` - для хранения сессии
- `Context` - для глобального состояния авторизации
=== React-3.-Работа-с-формами.md ===
# Sprint 3 (Валидация форм)

Добавляем валидацию форм с кастомными валидаторами и обратной связью.

## 1. Утилиты для валидации (src/utils/validators.ts)

```typescript
// Запрет на логин admin
export const validateLoginNotAdmin = (value: string) => {
  if (value === 'admin') {
    return 'Недопустимый логин пользователя';
  }
  return undefined;
};

// Проверка длины пароля
export const validatePassword = (value: string) => {
  if (!value) return 'Пароль обязателен';
  if (value.length < 3) return 'Минимум 3 символа';
  if (value.length > 8) return 'Максимум 8 символов';
  if (value === '123') return 'Слишком простой пароль';
  return undefined;
};

// Проверка логина
export const validateLogin = (value: string) => {
  if (!value) return 'Логин обязателен';
  if (value.length < 3) return 'Минимум 3 символа';
  if (value === 'admin') return 'Недопустимый логин пользователя';
  return undefined;
};

// Проверка имени
export const validateName = (value: string) => {
  if (value && value.length < 2) return 'Минимум 2 символа';
  return undefined;
};
```

## 2. Компонент FormInput (src/components/FormInput.tsx)

```typescript
import React, { useState } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Eye, EyeOff } from 'lucide-react';

type FormInputProps = {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  error?: string;
  touched?: boolean;
  required?: boolean;
  disabled?: boolean;
};

export const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  required,
  disabled,
}: FormInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  const fieldType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const endAdornment = isPassword ? (
    <InputAdornment position="end">
      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
      </IconButton>
    </InputAdornment>
  ) : null;

  return (
    <TextField
      fullWidth
      label={label}
      name={name}
      type={fieldType}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      error={touched && !!error}
      helperText={touched && error}
      required={required}
      disabled={disabled}
      InputProps={endAdornment ? { endAdornment } : undefined}
    />
  );
};
```

## 3. Компонент PasswordStrength (src/components/PasswordStrength.tsx)

```typescript
import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

type PasswordStrengthProps = {
  password: string;
};

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const getStrength = () => {
    if (!password) return 0;
    if (password.length < 4) return 25;
    if (password.length < 6) return 50;
    if (password.length < 8) return 75;
    return 100;
  };

  const getColor = () => {
    if (!password) return 'primary';
    if (password.length < 4) return 'error';
    if (password.length < 6) return 'warning';
    return 'success';
  };

  const getLabel = () => {
    if (!password) return '';
    if (password.length < 4) return 'Слабый';
    if (password.length < 6) return 'Средний';
    if (password.length < 8) return 'Хороший';
    return 'Отличный';
  };

  const strength = getStrength();
  const color = getColor();
  const label = getLabel();

  if (!password) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="text.secondary">
          Сложность пароля:
        </Typography>
        <Typography variant="caption" color={`${color}.main`}>
          {label}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={strength}
        color={color}
        sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
      />
    </Box>
  );
};
```

## 4. Компонент FormDebug (src/components/FormDebug.tsx)

```typescript
import React from 'react';
import { Paper, Typography, Box, Chip } from '@mui/material';

type FormDebugProps = {
  values: any;
  errors: any;
  touched: any;
  isValid: boolean;
  isDirty: boolean;
};

export const FormDebug = ({ values, errors, touched, isValid, isDirty }: FormDebugProps) => {
  if (import.meta.env.PROD) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 3, bgcolor: '#f5f5f5' }}>
      <Typography variant="subtitle2" gutterBottom>
        Отладка формы
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Chip 
          label={`Статус: ${isValid ? '✅ Валидна' : '❌ Невалидна'}`} 
          size="small"
          color={isValid ? 'success' : 'error'}
        />
        <Chip 
          label={`Изменена: ${isDirty ? '✅ Да' : '❌ Нет'}`} 
          size="small"
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <Box>
          <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
            Значения:
          </Typography>
          <pre style={{ fontSize: 12, margin: 0 }}>
            {JSON.stringify(values, null, 2)}
          </pre>
        </Box>

        <Box>
          <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
            Ошибки:
          </Typography>
          <pre style={{ fontSize: 12, margin: 0, color: '#d32f2f' }}>
            {JSON.stringify(errors, null, 2)}
          </pre>
        </Box>

        <Box>
          <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
            Touched:
          </Typography>
          <pre style={{ fontSize: 12, margin: 0 }}>
            {JSON.stringify(touched, null, 2)}
          </pre>
        </Box>
      </Box>
    </Paper>
  );
};
```

## 5. Обновляем компонент RegisterForm (src/components/RegisterForm.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Box, Button, Alert } from '@mui/material';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FormInput } from './FormInput';
import { PasswordStrength } from './PasswordStrength';
import { FormDebug } from './FormDebug';
import { validateLogin, validatePassword, validateName } from '../utils/validators';

type FormData = {
  login: string;
  password: string;
  name: string;
};

export const RegisterForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showDebug, setShowDebug] = useState(import.meta.env.DEV);
  
  const { register, handleSubmit, watch, formState, setError, clearErrors } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      login: '',
      password: '',
      name: '',
    },
  });

  const { errors, touchedFields, isValid, isDirty } = formState;
  const loginValue = watch('login');
  const passwordValue = watch('password');

  // Очищаем ошибку для логина при изменении
  useEffect(() => {
    if (loginValue !== 'admin') {
      clearErrors('login');
    }
  }, [loginValue, clearErrors]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setServerError('');
      await registerUser(data);
      onSuccess?.();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      if (errors) {
        if (errors.Login) {
          setError('login', { type: 'manual', message: errors.Login[0] });
        }
        if (errors.Password) {
          setError('password', { type: 'manual', message: errors.Password[0] });
        }
        setServerError('Проверьте правильность заполнения полей');
      } else {
        setServerError(err.response?.data?.message || 'Ошибка регистрации');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {serverError && <Alert severity="error">{serverError}</Alert>}

        {/* Имя */}
        <FormInput
          label="Имя"
          name="name"
          value={watch('name')}
          onChange={register('name', { validate: validateName }).onChange}
          onBlur={register('name').onBlur}
          error={errors.name?.message}
          touched={touchedFields.name}
          disabled={loading}
        />

        {/* Логин */}
        <FormInput
          label="Логин"
          name="login"
          value={loginValue}
          onChange={register('login', { validate: validateLogin }).onChange}
          onBlur={register('login').onBlur}
          error={errors.login?.message}
          touched={touchedFields.login}
          required
          disabled={loading}
        />

        {/* Предупреждение для admin */}
        {loginValue === 'admin' && touchedFields.login && !errors.login && (
          <Alert severity="warning" sx={{ mt: -1 }}>
            Недопустимый логин пользователя!
          </Alert>
        )}

        {/* Пароль */}
        <FormInput
          label="Пароль"
          name="password"
          type="password"
          value={passwordValue}
          onChange={register('password', { validate: validatePassword }).onChange}
          onBlur={register('password').onBlur}
          error={errors.password?.message}
          touched={touchedFields.password}
          required
          disabled={loading}
        />

        {/* Индикатор сложности пароля */}
        <PasswordStrength password={passwordValue} />

        {/* Индикатор несохраненных изменений */}
        {isDirty && (
          <Alert severity="info" sx={{ mt: 1 }}>
            ✏️ У вас есть несохраненные изменения
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          startIcon={<UserPlus size={20} />}
          disabled={!isValid || loading}
          sx={{ mt: 1 }}
        >
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </Button>

        {/* Кнопка отладки (только для разработки) */}
        {import.meta.env.DEV && (
          <Button variant="text" size="small" onClick={() => setShowDebug(!showDebug)}>
            {showDebug ? 'Скрыть отладку' : 'Показать отладку'}
          </Button>
        )}

        {/* Отладочная информация */}
        {showDebug && (
          <FormDebug
            values={watch()}
            errors={errors}
            touched={touchedFields}
            isValid={isValid}
            isDirty={isDirty}
          />
        )}
      </Box>
    </form>
  );
};
```

## 6. Обновляем компонент LoginForm (src/components/LoginForm.tsx)

```typescript
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Box, Button, Alert } from '@mui/material';
import { LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FormInput } from './FormInput';

type FormData = {
  login: string;
  password: string;
};

export const LoginForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors, touchedFields, isValid } } = useForm<FormData>({
    mode: 'onChange',
  });

  const validateLogin = (value: string) => {
    if (!value) return 'Логин обязателен';
    return undefined;
  };

  const validatePassword = (value: string) => {
    if (!value) return 'Пароль обязателен';
    if (value.length < 3) return 'Минимум 3 символа';
    return undefined;
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError('');
      await login(data.login, data.password);
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <FormInput
          label="Логин"
          name="login"
          value={watch('login')}
          onChange={register('login', { validate: validateLogin }).onChange}
          onBlur={register('login').onBlur}
          error={errors.login?.message}
          touched={touchedFields.login}
          required
          disabled={loading}
        />

        <FormInput
          label="Пароль"
          name="password"
          type="password"
          value={watch('password')}
          onChange={register('password', { validate: validatePassword }).onChange}
          onBlur={register('password').onBlur}
          error={errors.password?.message}
          touched={touchedFields.password}
          required
          disabled={loading}
        />

        <Button
          type="submit"
          variant="contained"
          startIcon={<LogIn size={20} />}
          disabled={!isValid || loading}
        >
          {loading ? 'Вход...' : 'Войти'}
        </Button>
      </Box>
    </form>
  );
};

// Нужно добавить watch из react-hook-form
import { useWatch } from 'react-hook-form';

const watch = (name: string) => {
  return useWatch({ name });
};
```

## 7. Добавляем асинхронный валидатор (задание со звездочкой)

**src/api/validation.ts:**
```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5071/api/v1';

export const checkLoginUnique = async (login: string) => {
  try {
    const response = await axios.get(`${API_URL}/Users/check-login?login=${login}`);
    return response.data.isUnique;
  } catch (error) {
    console.error('Error checking login uniqueness:', error);
    return false;
  }
};
```

**src/hooks/useDebounce.ts:**
```typescript
import { useState, useEffect } from 'react';

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
```

**Обновляем RegisterForm с асинхронной валидацией:**
```typescript
// Добавить импорты
import { checkLoginUnique } from '../api/validation';
import { useDebounce } from '../hooks/useDebounce';
import { CircularProgress } from '@mui/material';

// Внутри компонента RegisterForm добавить:
const [checkingLogin, setCheckingLogin] = useState(false);
const debouncedLogin = useDebounce(loginValue, 500);

useEffect(() => {
  const checkLogin = async () => {
    if (!debouncedLogin || debouncedLogin.length < 3 || debouncedLogin === 'admin') return;
    
    setCheckingLogin(true);
    try {
      const isUnique = await checkLoginUnique(debouncedLogin);
      if (!isUnique) {
        setError('login', { type: 'manual', message: 'Этот логин уже занят' });
      } else {
        clearErrors('login');
      }
    } catch (error) {
      console.error('Error checking login:', error);
    } finally {
      setCheckingLogin(false);
    }
  };

  checkLogin();
}, [debouncedLogin, setError, clearErrors]);

// Добавить индикатор загрузки в поле логина:
<FormInput
  label="Логин"
  name="login"
  value={loginValue}
  onChange={register('login', { validate: validateLogin }).onChange}
  onBlur={register('login').onBlur}
  error={errors.login?.message}
  touched={touchedFields.login}
  required
  disabled={loading}
  endAdornment={checkingLogin && <CircularProgress size={20} />}
/>
```

## 8. Обновляем страницу регистрации (src/pages/RegisterPage.tsx)

```typescript
import React from 'react';
import { Container, Paper, Typography, Box, Alert } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { RegisterForm } from '../components/RegisterForm';
import { UserPlus } from 'lucide-react';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const success = location.state?.success;

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <UserPlus size={48} color="#3f51b5" />
          <Typography variant="h4" sx={{ mt: 2 }}>Регистрация</Typography>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Регистрация успешна! Теперь вы можете войти.
          </Alert>
        )}

        <RegisterForm onSuccess={() => navigate('/login', { state: { registered: true } })} />

        <Box textAlign="center" mt={2}>
          <Typography variant="body2">
            Уже есть аккаунт?{' '}
            <Button color="primary" onClick={() => navigate('/login')}>
              Войти
            </Button>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};
```

## 9. Обновляем страницу входа (src/pages/LoginPage.tsx)

```typescript
import React, { useEffect } from 'react';
import { Container, Paper, Typography, Box, Alert } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { Lock } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const registered = location.state?.registered;

  useEffect(() => {
    // Очищаем state после показа сообщения
    if (registered) {
      window.history.replaceState({}, document.title);
    }
  }, [registered]);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <Lock size={48} color="#3f51b5" />
          <Typography variant="h4" sx={{ mt: 2 }}>Вход</Typography>
        </Box>

        {registered && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Регистрация успешна! Теперь вы можете войти.
          </Alert>
        )}

        <LoginForm onSuccess={() => navigate('/')} />

        <Box textAlign="center" mt={2}>
          <Typography variant="body2">
            Нет аккаунта?{' '}
            <Button color="primary" onClick={() => navigate('/register')}>
              Зарегистрироваться
            </Button>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};
```

## Запуск

```bash
npm run dev
```

## Что получилось:

✅ **Валидация всех полей** - логин, пароль, имя
✅ **Кастомные валидаторы** - запрет на логин "admin"
✅ **Визуальная обратная связь** - подсветка ошибок
✅ **Индикатор сложности пароля** - показывает надежность
✅ **Предупреждение о несохраненных изменениях**
✅ **Отладочная информация** (только в dev режиме)
✅ **Асинхронная проверка логина** (задание со звездочкой)

## Правила валидации:

- **Логин**: обязателен, минимум 3 символа, нельзя "admin"
- **Пароль**: обязателен, 3-8 символов, нельзя "123"
- **Имя**: опционально, минимум 2 символа если указано
=== React-4.-Создание-лоадера.md ===
# Sprint 4 на React (Глобальный лоадер)

Создаем глобальный индикатор загрузки для отслеживания HTTP запросов.

## 1. Контекст загрузки (src/contexts/LoadingContext.tsx)

```typescript
import React, { createContext, useState, useContext, ReactNode } from 'react';

type LoadingContextType = {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  withLoading: <T>(promise: Promise<T>) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const withLoading = async <T,>(promise: Promise<T>): Promise<T> => {
    try {
      setIsLoading(true);
      return await promise;
    } finally {
      // Добавляем небольшую задержку для плавности
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  };

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading, withLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};
```

## 2. Компонент глобального лоадера (src/components/GlobalLoader.tsx)

```typescript
import React from 'react';
import { Backdrop, CircularProgress, Box, Typography } from '@mui/material';
import { useLoading } from '../contexts/LoadingContext';

type GlobalLoaderProps = {
  message?: string;
};

export const GlobalLoader = ({ message = 'Загрузка...' }: GlobalLoaderProps) => {
  const { isLoading } = useLoading();

  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        flexDirection: 'column',
        gap: 2,
      }}
      open={isLoading}
    >
      <CircularProgress color="inherit" size={50} />
      {message && <Typography variant="h6">{message}</Typography>}
    </Backdrop>
  );
};
```

## 3. Компонент лоадера для кнопок (src/components/ButtonLoader.tsx)

```typescript
import React from 'react';
import { Box, CircularProgress } from '@mui/material';

type ButtonLoaderProps = {
  size?: number;
  color?: string;
};

export const ButtonLoader = ({ size = 20, color = '#fff' }: ButtonLoaderProps) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress size={size} sx={{ color }} />
  </Box>
);
```

## 4. Обновляем API клиент с автоматическим лоадером (src/api/client.ts)

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5071/api/v1';

// Создаем отдельный инстанс для отслеживания запросов
let activeRequests = 0;
let loadingCallback: ((loading: boolean) => void) | null = null;

export const setLoadingCallback = (callback: (loading: boolean) => void) => {
  loadingCallback = callback;
};

const updateLoadingState = () => {
  if (loadingCallback) {
    loadingCallback(activeRequests > 0);
  }
};

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Интерцептор для отслеживания запросов
apiClient.interceptors.request.use((config) => {
  activeRequests++;
  updateLoadingState();
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    activeRequests--;
    updateLoadingState();
    return response;
  },
  (error) => {
    activeRequests--;
    updateLoadingState();
    return Promise.reject(error);
  }
);
```

## 5. Обновляем API для пользователей (src/api/users.ts)

```typescript
import { apiClient } from './client';
import { User } from '../types';

// Добавляем задержку для демонстрации лоадера (как в Angular примере)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getUsers = async (): Promise<User[]> => {
  await delay(1000); // Имитация задержки
  const response = await apiClient.get<User[]>('/Users');
  return response.data;
};

export const getUserById = async (id: number): Promise<User> => {
  await delay(800);
  const response = await apiClient.get<User>(`/Users/${id}`);
  return response.data;
};

export const createUser = async (user: Partial<User>) => {
  await delay(1200);
  const response = await apiClient.post('/Users', user);
  return response.data;
};

export const updateUser = async (id: number, user: Partial<User>) => {
  await delay(1200);
  const response = await apiClient.put(`/Users/${id}`, user);
  return response.data;
};

export const deleteUser = async (id: number) => {
  await delay(1000);
  const response = await apiClient.delete(`/Users/${id}`);
  return response.data;
};
```

## 6. Обновляем хук useUsers (src/hooks/useUsers.ts)

```typescript
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
    loading: false, // Используем глобальный лоадер
    error,
    refetch: loadUsers,
    totalCount: users.length,
  };
};
```

## 7. Обновляем страницу пользователей (src/pages/UsersPage.tsx)

```typescript
import React from 'react';
import { Container, Typography, Box, Button, Paper, Chip } from '@mui/material';
import { RefreshCw, Users as UsersIcon } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { useLoading } from '../contexts/LoadingContext';
import { UsersTable } from '../components/UsersTable';
import { ErrorMessage } from '../components/ErrorMessage';
import { ButtonLoader } from '../components/ButtonLoader';

export const UsersPage = () => {
  const { users, error, refetch, totalCount } = useUsers();
  const { isLoading } = useLoading();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <UsersIcon size={28} color="#3f51b5" />
            <Typography variant="h4">
              Пользователи {totalCount > 0 && `(${totalCount})`}
            </Typography>
            {isLoading && (
              <Chip 
                label="Загрузка..." 
                size="small" 
                color="primary"
                sx={{ ml: 2 }}
              />
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
      </Paper>
    </Container>
  );
};
```

## 8. Создаем демо-страницу для тестирования лоадера (src/pages/LoadingDemoPage.tsx)

```typescript
import React, { useState } from 'react';
import { Container, Typography, Box, Paper, Button, Stack, Alert, LinearProgress } from '@mui/material';
import { Loader2, Zap, Layers, Info } from 'lucide-react';
import { useLoading } from '../contexts/LoadingContext';
import { getUsers, getUserById, createUser } from '../api/users';
import { ButtonLoader } from '../components/ButtonLoader';

export const LoadingDemoPage = () => {
  const { withLoading, isLoading } = useLoading();
  const [result, setResult] = useState<string>('');
  const [localLoading, setLocalLoading] = useState(false);

  const simulateRequest = async () => {
    setLocalLoading(true);
    setResult('');
    try {
      await withLoading(getUsers());
      setResult('✅ Данные успешно загружены');
    } catch (error) {
      setResult('❌ Ошибка загрузки');
    } finally {
      setLocalLoading(false);
    }
  };

  const simulateMultipleRequests = async () => {
    setLocalLoading(true);
    setResult('');
    try {
      await withLoading(Promise.all([
        getUsers(),
        getUserById(1),
        createUser({ login: 'test', password: '123' })
      ]));
      setResult('✅ Все запросы выполнены');
    } catch (error) {
      setResult('❌ Ошибка при выполнении запросов');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Loader2 size={32} color="#3f51b5" />
          <Typography variant="h4">Демонстрация лоадера</Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            Глобальный лоадер появляется при любом HTTP запросе и блокирует интерфейс.
            Счетчик запросов отслеживает множественные запросы.
          </Typography>
        </Alert>

        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Состояние загрузки
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Box sx={{ flex: 1 }}>
                <LinearProgress 
                  variant={isLoading ? 'indeterminate' : 'determinate'} 
                  value={isLoading ? 0 : 100}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography>
                {isLoading ? 'Активен' : 'Не активен'}
              </Typography>
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Тестовые запросы
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                onClick={simulateRequest}
                disabled={localLoading}
                startIcon={localLoading ? <ButtonLoader /> : <Zap size={18} />}
              >
                Одиночный запрос
              </Button>
              
              <Button
                variant="contained"
                color="secondary"
                onClick={simulateMultipleRequests}
                disabled={localLoading}
                startIcon={localLoading ? <ButtonLoader /> : <Layers size={18} />}
              >
                Множественные запросы
              </Button>
            </Stack>

            {result && (
              <Alert severity={result.includes('✅') ? 'success' : 'error'} sx={{ mt: 2 }}>
                {result}
              </Alert>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, bgcolor: '#f5f5f5' }}>
            <Box display="flex" gap={2}>
              <Info size={20} color="#666" />
              <Typography variant="body2" color="text.secondary">
                Глобальный лоадер автоматически отслеживает все HTTP запросы через axios интерцепторы.
                При множественных запросах лоадер остается активным до завершения последнего.
              </Typography>
            </Box>
          </Paper>
        </Stack>
      </Paper>
    </Container>
  );
};
```

## 9. Обновляем App.tsx с провайдерами

```typescript
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { GlobalLoader } from './components/GlobalLoader';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { UsersPage } from './pages/UsersPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoadingDemoPage } from './pages/LoadingDemoPage';
import { setLoadingCallback } from './api/client';
import { useLoading } from './contexts/LoadingContext';

const theme = createTheme({
  palette: {
    primary: { main: '#3f51b5' },
  },
});

// Компонент для подключения лоадера к API
const LoadingBridge = () => {
  const { setLoading } = useLoading();
  
  useEffect(() => {
    setLoadingCallback(setLoading);
  }, [setLoading]);
  
  return null;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LoadingProvider>
        <AuthProvider>
          <BrowserRouter>
            <LoadingBridge />
            <GlobalLoader message="Загрузка данных..." />
            <Header />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/loading-demo" element={<LoadingDemoPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
```

## 10. Обновляем HomePage с ссылкой на демо

```typescript
// В HomePage.tsx добавить кнопку
<Button
  variant="outlined"
  startIcon={<Loader2 size={20} />}
  onClick={() => navigate('/loading-demo')}
  sx={{ mt: 2 }}
>
  Демо лоадера
</Button>
```

## 11. Добавляем защиту от множественных кликов в LoginForm

```typescript
// В LoginForm.tsx обновляем кнопку
<Button
  type="submit"
  variant="contained"
  startIcon={loading ? <ButtonLoader /> : <LogIn size={20} />}
  disabled={!isValid || loading}
  fullWidth
>
  {loading ? 'Вход...' : 'Войти'}
</Button>
```

## Запуск

```bash
npm run dev
```

## Что получилось:

✅ **Глобальный лоадер** - появляется при любом HTTP запросе
✅ **Счетчик запросов** - лоадер активен пока есть активные запросы
✅ **Блокировка интерфейса** - нельзя кликать пока грузится
✅ **Задержка 1 секунда** - как в Angular примере
✅ **Лоадер для кнопок** - отдельные индикаторы в кнопках
✅ **Демо-страница** - для тестирования разных сценариев

## Как это работает:

1. **axios.interceptors** отслеживают все запросы
2. **Счетчик activeRequests** увеличивается/уменьшается
3. **LoadingContext** управляет глобальным состоянием
4. **GlobalLoader** отображается поверх всего приложения
5. **withLoading** хелпер для ручного управления
=== React-5.-Работа-с-jwt.md ===
# Sprint 5 на React (JWT авторизация)

Добавляем JWT токены, автоматическое добавление в заголовки и защиту маршрутов.

## 1. Обновляем типы (src/types.ts)

```typescript
export type User = {
  id: number;
  name: string;
  login: string;
  token: string; // JWT токен
};

export type LoginData = {
  login: string;
  password: string;
};

export type RegisterData = {
  login: string;
  password: string;
  name?: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};
```

## 2. Обновляем API клиент с JWT интерцептором (src/api/client.ts)

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5071/api/v1';

let activeRequests = 0;
let loadingCallback: ((loading: boolean) => void) | null = null;

export const setLoadingCallback = (callback: (loading: boolean) => void) => {
  loadingCallback = callback;
};

const updateLoadingState = () => {
  if (loadingCallback) {
    loadingCallback(activeRequests > 0);
  }
};

// Функция для получения токена из localStorage
const getToken = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.token;
    } catch {
      return null;
    }
  }
  return null;
};

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// JWT интерцептор - добавляет токен к каждому запросу
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  
  // Не добавляем токен для запросов авторизации
  const isAuthRequest = config.url?.includes('/Users/Login') || config.url?.includes('/Users/Register');
  
  if (token && !isAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('JWT токен добавлен к запросу');
  }

  activeRequests++;
  updateLoadingState();
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    activeRequests--;
    updateLoadingState();
    return response;
  },
  (error) => {
    activeRequests--;
    updateLoadingState();

    // Если получили 401 - токен истек или недействителен
    if (error.response?.status === 401) {
      console.log('Получена ошибка 401 Unauthorized');
      // Можно автоматически выйти
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('storage')); // Уведомляем другие вкладки
    }

    return Promise.reject(error);
  }
);
```

## 3. Обновляем API для авторизации (src/api/auth.ts)

```typescript
import { apiClient } from './client';
import { User } from '../types';

export const login = async (login: string, password: string): Promise<User> => {
  const response = await apiClient.post('/Users/Login', { login, password });
  return response.data;
};

export const register = async (data: { login: string; password: string; name?: string }) => {
  const response = await apiClient.post('/Users', data);
  return response.data;
};
```

## 4. Обновляем контекст авторизации (src/contexts/AuthContext.tsx)

```typescript
import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '../types';
import { login as loginApi, register as registerApi } from '../api/auth';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (data: { login: string; password: string; name?: string }) => Promise<void>;
  logout: () => void;
  token: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Загружаем пользователя из localStorage при старте
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        console.log('Пользователь загружен из localStorage');
      } catch (error) {
        console.error('Ошибка парсинга пользователя', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Следим за изменениями в localStorage (для нескольких вкладок)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        if (e.newValue) {
          setUser(JSON.parse(e.newValue));
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (login: string, password: string) => {
    const user = await loginApi(login, password);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const register = async (data: { login: string; password: string; name?: string }) => {
    await registerApi(data);
    // После регистрации не логиним автоматически
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout,
      token: user?.token || null 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

## 5. Создаем компонент ProtectedRoute (src/components/ProtectedRoute.tsx)

```typescript
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    // Сохраняем текущий URL для редиректа после входа
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};
```

## 6. Обновляем страницу пользователей с защитой (src/pages/UsersPage.tsx)

```typescript
import React from 'react';
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
  const { user, token } = useAuth();

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
              <Chip 
                label="Загрузка..." 
                size="small" 
                color="primary"
                sx={{ ml: 2 }}
              />
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
```

## 7. Обновляем страницу профиля (src/pages/ProfilePage.tsx)

```typescript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Box, Paper, Avatar, 
  Chip, CircularProgress, Alert, Button, Divider 
} from '@mui/material';
import { User as UserIcon, Shield, Mail, Calendar, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserById } from '../api/users';
import { User } from '../types';

export const ProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getUserById(parseInt(id));
        setUser(data);
      } catch (err) {
        setError('Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id]);

  const isOwnProfile = currentUser?.id === user?.id;

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Пользователь не найден'}</Alert>
        <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Назад
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Назад
      </Button>

      <Paper sx={{ p: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <Avatar sx={{ width: 100, height: 100, bgcolor: isOwnProfile ? 'primary.main' : 'secondary.main', mb: 2 }}>
            <UserIcon size={50} />
          </Avatar>
          
          <Typography variant="h4" gutterBottom>
            {user.name || user.login}
          </Typography>
          
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            @{user.login}
          </Typography>

          {isOwnProfile && (
            <Chip 
              icon={<Shield size={14} />}
              label="Это вы" 
              color="primary" 
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" flexDirection="column" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <UserIcon size={20} color="#666" />
            <Typography variant="body1">
              <strong>ID:</strong> {user.id}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
            <Mail size={20} color="#666" />
            <Typography variant="body1">
              <strong>Логин:</strong> {user.login}
            </Typography>
          </Box>

          {user.token && (
            <Box display="flex" alignItems="center" gap={2}>
              <Shield size={20} color="#4caf50" />
              <Typography variant="body1">
                <strong>JWT токен:</strong> активен
              </Typography>
            </Box>
          )}
        </Box>

        {isOwnProfile && currentUser?.token && (
          <Box mt={3} p={2} bgcolor="#f5f5f5" borderRadius={1}>
            <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
              Ваш JWT токен:
            </Typography>
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
              {currentUser.token}
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};
```

## 8. Обновляем Header с отображением токена (src/components/Header.tsx)

```typescript
import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Menu, MenuItem, Avatar, Chip, Box } from '@mui/material';
import { Home, Users, LogIn, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Header = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/');
  };

  const handleProfile = () => {
    handleClose();
    if (user) {
      navigate(`/profile/${user.id}`);
    }
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          SampleApp
        </Typography>

        <Button color="inherit" onClick={() => navigate('/')} startIcon={<Home size={20} />}>
          Главная
        </Button>

        {user && (
          <Button color="inherit" onClick={() => navigate('/users')} startIcon={<Users size={20} />}>
            Пользователи
          </Button>
        )}

        {user ? (
          <>
            {token && (
              <Chip 
                icon={<Shield size={14} />}
                label="JWT"
                size="small"
                sx={{ 
                  mr: 2, 
                  bgcolor: 'success.main',
                  color: 'white',
                  '& .MuiChip-icon': { color: 'white' }
                }}
              />
            )}
            
            <Button color="inherit" onClick={handleMenu} startIcon={<UserIcon size={20} />}>
              {user.login}
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
              <MenuItem onClick={handleProfile}>
                <UserIcon size={16} style={{ marginRight: 8 }} />
                Профиль
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <LogOut size={16} style={{ marginRight: 8 }} />
                Выйти
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Button color="inherit" onClick={() => navigate('/login')} startIcon={<LogIn size={20} />}>
            Вход
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};
```

## 9. Обновляем App.tsx с защищенными маршрутами

```typescript
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { GlobalLoader } from './components/GlobalLoader';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoadingDemoPage } from './pages/LoadingDemoPage';
import { setLoadingCallback } from './api/client';
import { useLoading } from './contexts/LoadingContext';

const theme = createTheme({
  palette: {
    primary: { main: '#3f51b5' },
  },
});

const LoadingBridge = () => {
  const { setLoading } = useLoading();
  useEffect(() => {
    setLoadingCallback(setLoading);
  }, [setLoading]);
  return null;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LoadingProvider>
        <AuthProvider>
          <BrowserRouter>
            <LoadingBridge />
            <GlobalLoader message="Загрузка..." />
            <Header />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/loading-demo" element={<LoadingDemoPage />} />
              
              {/* Защищенные маршруты */}
              <Route path="/users" element={
                <ProtectedRoute>
                  <UsersPage />
                </ProtectedRoute>
              } />
              <Route path="/profile/:id" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
```

## 10. Обновляем HomePage с информацией о токене

```typescript
// В HomePage.tsx добавить отображение токена для авторизованных пользователей
{user && token && (
  <Box mt={3} p={2} bgcolor="#f5f5f5" borderRadius={1}>
    <Typography variant="caption" display="block" color="text.secondary">
      JWT токен активен
    </Typography>
  </Box>
)}
```

## Тестирование функциональности

1. **Сохранение сессии** - после входа обновите страницу, пользователь должен остаться
2. **JWT в запросах** - откройте DevTools → Network, проверьте заголовок `Authorization`
3. **Защита маршрутов** - попробуйте зайти на `/users` без авторизации
4. **Редирект после входа** - после входа должно вернуть на запрошенную страницу
5. **Профиль** - проверьте отображение своего и чужого профиля

## Что получилось:

✅ **JWT токены** - автоматически добавляются к запросам
✅ **Сохранение в localStorage** - пользователь не сбрасывается при обновлении
✅ **Защита маршрутов** - недоступны без авторизации
✅ **Редирект с returnUrl** - после входа возвращает на запрошенную страницу
✅ **Отображение токена** - показываем в интерфейсе
✅ **Обработка 401 ошибок** - автоматический выход при недействительном токене
=== React-6.-Guard.md ===
# Sprint 6 на React (Защитники маршрутов)

Добавляем защиту маршрутов (Auth Guard) и защиту от несохраненных изменений (CanDeactivate).

## 1. Создаем компонент AuthGuard (src/components/guards/AuthGuard.tsx)

```typescript
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CircularProgress, Box, Alert } from '@mui/material';

type AuthGuardProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

export const AuthGuard = ({ children, redirectTo = '/login' }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    // Сохраняем текущий URL для редиректа после входа
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};
```

## 2. Создаем хук для защиты от несохраненных изменений (src/hooks/usePreventUnsavedChanges.ts)

```typescript
import { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

type UsePreventUnsavedChangesProps = {
  isDirty: boolean;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export const usePreventUnsavedChanges = ({
  isDirty,
  message = 'У вас есть несохраненные изменения. Вы действительно хотите покинуть страницу?',
  onConfirm,
  onCancel,
}: UsePreventUnsavedChangesProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const unblockRef = useRef<() => void>();

  // Блокируем навигацию внутри приложения
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);

  // Функция для проверки перед навигацией
  const checkBeforeNavigate = useCallback(
    (to: string) => {
      if (!isDirty) return true;

      const confirmLeave = window.confirm(message);
      if (confirmLeave) {
        onConfirm?.();
        return true;
      } else {
        onCancel?.();
        return false;
      }
    },
    [isDirty, message, onConfirm, onCancel]
  );

  // Перехватываем клики по ссылкам
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && isDirty && link.href && link.href.startsWith(window.location.origin)) {
        e.preventDefault();
        const path = link.href.replace(window.location.origin, '');
        
        if (checkBeforeNavigate(path)) {
          navigate(path);
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isDirty, navigate, checkBeforeNavigate]);

  return {
    checkBeforeNavigate,
  };
};
```

## 3. Создаем компонент ConfirmDialog (src/components/guards/ConfirmDialog.tsx)

```typescript
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { AlertTriangle } from 'lucide-react';

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  severity?: 'error' | 'warning' | 'info';
};

export const ConfirmDialog = ({
  open,
  title = 'Подтверждение',
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
  severity = 'warning',
}: ConfirmDialogProps) => {
  const getColor = () => {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'primary';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AlertTriangle color={severity === 'error' ? '#f44336' : '#ff9800'} size={24} />
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          {cancelText}
        </Button>
        <Button onClick={onConfirm} color={getColor()} variant="contained" autoFocus>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

## 4. Создаем компонент для защиты формы регистрации (src/components/guards/PreventUnsavedChanges.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import { usePreventUnsavedChanges } from '../../hooks/usePreventUnsavedChanges';
import { ConfirmDialog } from './ConfirmDialog';

type PreventUnsavedChangesProps = {
  isDirty: boolean;
  message?: string;
  children: React.ReactNode;
  onConfirm?: () => void;
};

export const PreventUnsavedChanges = ({
  isDirty,
  message = 'У вас есть несохраненные изменения. Вы действительно хотите покинуть страницу?',
  children,
  onConfirm,
}: PreventUnsavedChangesProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const { checkBeforeNavigate } = usePreventUnsavedChanges({
    isDirty,
    message,
    onConfirm: () => {
      if (pendingNavigation) {
        window.location.href = pendingNavigation;
      }
      onConfirm?.();
    },
  });

  // Перехватываем навигацию через history API
  useEffect(() => {
    if (!isDirty) return;

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      setShowDialog(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty]);

  const handleConfirm = () => {
    setShowDialog(false);
    if (pendingNavigation) {
      window.location.href = pendingNavigation;
    }
  };

  return (
    <>
      {children}
      <ConfirmDialog
        open={showDialog}
        title="Несохраненные изменения"
        message={message}
        confirmText="Покинуть страницу"
        cancelText="Остаться"
        onConfirm={handleConfirm}
        onCancel={() => setShowDialog(false)}
        severity="warning"
      />
    </>
  );
};
```

## 5. Обновляем страницу регистрации с защитой (src/pages/RegisterPage.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import { Container, Paper, Typography, Box, Alert } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { RegisterForm } from '../components/RegisterForm';
import { PreventUnsavedChanges } from '../components/guards/PreventUnsavedChanges';

type FormData = {
  login: string;
  password: string;
  name: string;
};

export const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  
  const { register, handleSubmit, watch, formState, setError, clearErrors } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      login: '',
      password: '',
      name: '',
    },
  });

  const { errors, touchedFields, isValid, isDirty } = formState;
  const loginValue = watch('login');

  // Очищаем ошибку для логина при изменении
  useEffect(() => {
    if (loginValue !== 'admin') {
      clearErrors('login');
    }
  }, [loginValue, clearErrors]);

  const validateLogin = (value: string) => {
    if (!value) return 'Логин обязателен';
    if (value.length < 3) return 'Минимум 3 символа';
    if (value === 'admin') return 'Недопустимый логин пользователя';
    return undefined;
  };

  const validatePassword = (value: string) => {
    if (!value) return 'Пароль обязателен';
    if (value.length < 3) return 'Минимум 3 символа';
    if (value.length > 8) return 'Максимум 8 символов';
    return undefined;
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setServerError('');
      await registerUser(data);
      navigate('/login', { state: { registered: true } });
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      if (errors) {
        if (errors.Login) {
          setError('login', { type: 'manual', message: errors.Login[0] });
        }
        setServerError('Проверьте правильность заполнения полей');
      } else {
        setServerError(err.response?.data?.message || 'Ошибка регистрации');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PreventUnsavedChanges isDirty={isDirty && !loading}>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <UserPlus size={48} color="#3f51b5" />
            <Typography variant="h4" sx={{ mt: 2 }}>Регистрация</Typography>
          </Box>

          {location.state?.success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Регистрация успешна! Теперь вы можете войти.
            </Alert>
          )}

          {serverError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Поля формы (как в RegisterForm) */}
              <Button
                type="submit"
                variant="contained"
                disabled={!isValid || loading}
              >
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </Button>
            </Box>
          </form>

          {isDirty && (
            <Alert severity="info" sx={{ mt: 2 }}>
              ✏️ У вас есть несохраненные изменения
            </Alert>
          )}

          <Box textAlign="center" mt={2}>
            <Typography variant="body2">
              Уже есть аккаунт?{' '}
              <Button color="primary" onClick={() => navigate('/login')}>
                Войти
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </PreventUnsavedChanges>
  );
};
```

## 6. Создаем страницу 404 (src/pages/NotFoundPage.tsx)

```typescript
import React from 'react';
import { Container, Paper, Typography, Box, Button } from '@mui/material';
import { Home, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <AlertCircle size={80} color="#f44336" />
        
        <Typography variant="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', color: '#f44336' }}>
          404
        </Typography>
        
        <Typography variant="h4" gutterBottom>
          Страница не найдена
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
          Запрашиваемая страница не существует или была перемещена.
        </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={<Home size={20} />}
          onClick={() => navigate('/')}
        >
          На главную
        </Button>
      </Paper>
    </Container>
  );
};
```

## 7. Создаем страницу 500 (src/pages/ServerErrorPage.tsx)

```typescript
import React from 'react';
import { Container, Paper, Typography, Box, Button, Alert } from '@mui/material';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const ServerErrorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const error = location.state?.error;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <AlertTriangle size={80} color="#f44336" />
        
        <Typography variant="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', color: '#f44336' }}>
          500
        </Typography>
        
        <Typography variant="h4" gutterBottom>
          Ошибка сервера
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Произошла внутренняя ошибка сервера. Пожалуйста, попробуйте позже.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 4, textAlign: 'left' }}>
            <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
              {JSON.stringify(error, null, 2)}
            </Typography>
          </Alert>
        )}

        <Box display="flex" gap={2} justifyContent="center">
          <Button
            variant="contained"
            startIcon={<Home size={20} />}
            onClick={() => navigate('/')}
          >
            На главную
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={20} />}
            onClick={() => window.location.reload()}
          >
            Обновить
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};
```

## 8. Обновляем App.tsx с защищенными маршрутами

```typescript
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { GlobalLoader } from './components/GlobalLoader';
import { AuthGuard } from './components/guards/AuthGuard';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoadingDemoPage } from './pages/LoadingDemoPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ServerErrorPage } from './pages/ServerErrorPage';
import { setLoadingCallback } from './api/client';
import { useLoading } from './contexts/LoadingContext';

const theme = createTheme({
  palette: {
    primary: { main: '#3f51b5' },
  },
});

const LoadingBridge = () => {
  const { setLoading } = useLoading();
  useEffect(() => {
    setLoadingCallback(setLoading);
  }, [setLoading]);
  return null;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LoadingProvider>
        <AuthProvider>
          <BrowserRouter>
            <LoadingBridge />
            <GlobalLoader message="Загрузка..." />
            <Header />
            <Routes>
              {/* Публичные маршруты */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/loading-demo" element={<LoadingDemoPage />} />
              
              {/* Защищенные маршруты */}
              <Route path="/users" element={
                <AuthGuard>
                  <UsersPage />
                </AuthGuard>
              } />
              <Route path="/profile/:id" element={
                <AuthGuard>
                  <ProfilePage />
                </AuthGuard>
              } />
              
              {/* Маршруты ошибок */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="/500" element={<ServerErrorPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
```

## 9. Обновляем LoginPage с обработкой returnUrl

```typescript
// В LoginPage.tsx добавить:
import { useLocation } from 'react-router-dom';

// Внутри компонента:
const location = useLocation();
const from = location.state?.from || '/';

const onSuccess = () => {
  navigate(from, { replace: true });
};
```

## 10. Добавляем тестовую страницу для демонстрации защитников

```typescript
// src/pages/GuardsDemoPage.tsx
import React, { useState } from 'react';
import { Container, Paper, Typography, Box, Button, TextField, Alert } from '@mui/material';
import { Shield, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { usePreventUnsavedChanges } from '../hooks/usePreventUnsavedChanges';

export const GuardsDemoPage = () => {
  const [text, setText] = useState('');
  const navigate = useNavigate();
  const isDirty = text.length > 0;

  usePreventUnsavedChanges({
    isDirty,
    message: 'У вас есть несохраненный текст. Вы действительно хотите уйти?',
  });

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Shield size={32} color="#3f51b5" />
          <Typography variant="h4">Демо защитников</Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Введите текст и попробуйте уйти со страницы - появится предупреждение.
          </Typography>
        </Alert>

        <TextField
          fullWidth
          label="Введите что-нибудь"
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          rows={4}
          sx={{ mb: 3 }}
        />

        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            component={Link}
            to="/"
          >
            На главную (с защитой)
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => navigate('/users')}
          >
            К пользователям (с защитой)
          </Button>
        </Box>

        {isDirty && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <AlertTriangle size={16} /> Есть несохраненные изменения!
          </Alert>
        )}
      </Paper>
    </Container>
  );
};
```

## Тестирование функциональности

1. **AuthGuard**:
   - Попробуйте зайти на `/users` без авторизации → редирект на `/login`
   - После входа должно вернуть на `/users`

2. **PreventUnsavedChanges**:
   - Зайдите на `/register`, заполните любое поле
   - Попробуйте перейти по ссылке "Уже есть аккаунт?" → появится предупреждение
   - Попробуйте обновить страницу → предупреждение браузера

3. **404 страница**:
   - Зайдите на несуществующий URL → покажет 404

4. **500 страница**:
   - Можно вызвать через демо ошибок

## Что получилось:

✅ **AuthGuard** - защита маршрутов от неавторизованных
✅ **returnUrl** - редирект обратно после входа
✅ **PreventUnsavedChanges** - защита от потери данных
✅ **Кастомный ConfirmDialog** - красивое подтверждение
✅ **Страницы ошибок** - 404 и 500
✅ **Демо-страница** - для тестирования защитников
=== React-7.-Профиль-пользователя.md ===
# Sprint 7 на React (Профиль пользователя)

Добавляем профиль пользователя с меню в хедере и динамическими маршрутами.

## 1. Обновляем API для пользователей (src/api/users.ts)

```typescript
import { apiClient } from './client';
import { User } from '../types';

export const getUsers = async (): Promise<User[]> => {
  const response = await apiClient.get<User[]>('/Users');
  return response.data;
};

export const getUserById = async (id: number): Promise<User> => {
  const response = await apiClient.get<User>(`/Users/${id}`);
  return response.data;
};

export const createUser = async (user: Partial<User>) => {
  const response = await apiClient.post('/Users', user);
  return response.data;
};

export const updateUser = async (id: number, user: Partial<User>) => {
  const response = await apiClient.put(`/Users/${id}`, user);
  return response.data;
};

export const deleteUser = async (id: number) => {
  const response = await apiClient.delete(`/Users/${id}`);
  return response.data;
};
```

## 2. Обновляем компонент Header с меню профиля (src/components/Header.tsx)

```typescript
import React, { useState } from 'react';
import { 
  AppBar, Toolbar, Typography, Button, 
  Menu, MenuItem, Avatar, Box, Divider,
  IconButton, Tooltip
} from '@mui/material';
import { 
  Home, Users, LogIn, LogOut, 
  User as UserIcon, Settings, Edit,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Header = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/');
  };

  const handleProfile = () => {
    handleClose();
    if (user) {
      navigate(`/profile/${user.id}`);
    }
  };

  const handleEditProfile = () => {
    handleClose();
    if (user) {
      navigate(`/profile/${user.id}/edit`);
    }
  };

  const handleSettings = () => {
    handleClose();
    navigate('/settings');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ flexGrow: 1, cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          SampleApp
        </Typography>

        <Button 
          color="inherit" 
          onClick={() => navigate('/')} 
          startIcon={<Home size={20} />}
          sx={{ mr: 1 }}
        >
          Главная
        </Button>

        {user && (
          <Button 
            color="inherit" 
            onClick={() => navigate('/users')} 
            startIcon={<Users size={20} />}
            sx={{ mr: 1 }}
          >
            Пользователи
          </Button>
        )}

        {user ? (
          <>
            {token && (
              <Tooltip title="JWT токен активен">
                <Shield size={20} color="#4caf50" style={{ marginRight: 8 }} />
              </Tooltip>
            )}
            
            <Tooltip title="Профиль">
              <IconButton
                onClick={handleMenu}
                size="small"
                sx={{ ml: 1 }}
                aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  {user.login.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={Boolean(anchorEl)}
              onClose={handleClose}
              onClick={handleClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  minWidth: 200,
                  '& .MuiMenuItem-root': {
                    px: 2,
                    py: 1,
                  },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" noWrap>
                  {user.name || user.login}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  @{user.login}
                </Typography>
              </Box>
              
              <Divider />
              
              <MenuItem onClick={handleProfile}>
                <UserIcon size={16} style={{ marginRight: 12 }} />
                Профиль
              </MenuItem>
              
              <MenuItem onClick={handleEditProfile}>
                <Edit size={16} style={{ marginRight: 12 }} />
                Редактировать
              </MenuItem>
              
              <MenuItem onClick={handleSettings}>
                <Settings size={16} style={{ marginRight: 12 }} />
                Настройки
              </MenuItem>
              
              <Divider />
              
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <LogOut size={16} style={{ marginRight: 12 }} />
                Выйти
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Button 
            color="inherit" 
            onClick={() => navigate('/login')} 
            startIcon={<LogIn size={20} />}
          >
            Вход
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};
```

## 3. Создаем страницу профиля (src/pages/ProfilePage.tsx)

```typescript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  User as UserIcon,
  Mail,
  Calendar,
  Shield,
  Edit,
  ArrowLeft,
  Share2,
  Star,
  Award,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserById } from '../api/users';
import { User } from '../types';

export const ProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getUserById(parseInt(id));
        setUser(data);
      } catch (err) {
        setError('Не удалось загрузить профиль пользователя');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleEdit = () => {
    if (user) {
      navigate(`/profile/${user.id}/edit`);
    }
  };

  const handleShare = () => {
    // В реальном приложении здесь был бы функционал шаринга
    alert('Ссылка на профиль скопирована');
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Пользователь не найден'}
        </Alert>
        <Button startIcon={<ArrowLeft size={18} />} onClick={handleBack}>
          Назад
        </Button>
      </Container>
    );
  }

  const isOwnProfile = currentUser?.id === user.id;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Кнопка назад */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Button startIcon={<ArrowLeft size={18} />} onClick={handleBack}>
          Назад
        </Button>
        <Box>
          <Tooltip title="Поделиться">
            <IconButton onClick={handleShare}>
              <Share2 size={20} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Основная информация */}
      <Paper sx={{ p: 4, mb: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <Avatar
            sx={{
              width: 120,
              height: 120,
              bgcolor: isOwnProfile ? 'primary.main' : 'secondary.main',
              mb: 2,
              fontSize: '3rem',
            }}
          >
            {user.login.charAt(0).toUpperCase()}
          </Avatar>

          <Typography variant="h4" gutterBottom>
            {user.name || user.login}
          </Typography>

          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            @{user.login}
          </Typography>

          <Box display="flex" gap={1} mt={1}>
            {isOwnProfile && (
              <Chip
                icon={<Star size={14} />}
                label="Это вы"
                color="primary"
                size="small"
              />
            )}
            {user.token && (
              <Chip
                icon={<Shield size={14} />}
                label="JWT активен"
                color="success"
                size="small"
              />
            )}
          </Box>

          {isOwnProfile && (
            <Button
              variant="outlined"
              startIcon={<Edit size={18} />}
              onClick={handleEdit}
              sx={{ mt: 2 }}
            >
              Редактировать профиль
            </Button>
          )}
        </Box>
      </Paper>

      {/* Детальная информация */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <UserIcon size={20} color="#3f51b5" />
                <Typography variant="h6">Основная информация</Typography>
              </Box>

              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                    ID:
                  </Typography>
                  <Typography variant="body1">{user.id}</Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                    Логин:
                  </Typography>
                  <Typography variant="body1">{user.login}</Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                    Имя:
                  </Typography>
                  <Typography variant="body1">{user.name || 'Не указано'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Award size={20} color="#3f51b5" />
                <Typography variant="h6">Статистика</Typography>
              </Box>

              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                    Статус:
                  </Typography>
                  <Chip
                    size="small"
                    label={user.token ? "Активен" : "Не активен"}
                    color={user.token ? "success" : "default"}
                  />
                </Box>

                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                    Токен:
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {user.token ? `${user.token.substring(0, 15)}...` : 'Нет'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* JWT токен (только для своего профиля) */}
        {isOwnProfile && currentUser?.token && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Shield size={20} color="#4caf50" />
                  <Typography variant="h6">Ваш JWT токен</Typography>
                </Box>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: '#f5f5f5',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    wordBreak: 'break-all',
                  }}
                >
                  {currentUser.token}
                </Paper>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Используется для авторизации запросов к API
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};
```

## 4. Создаем страницу редактирования профиля (src/pages/EditProfilePage.tsx)

```typescript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Avatar,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
} from '@mui/material';
import { ArrowLeft, Save, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserById, updateUser } from '../api/users';
import { User } from '../types';
import { usePreventUnsavedChanges } from '../hooks/usePreventUnsavedChanges';

export const EditProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    login: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.id === Number(id);
  const isDirty = 
    formData.name !== (user?.name || '') || 
    formData.login !== user?.login;

  usePreventUnsavedChanges({
    isDirty: isDirty && !saving,
    message: 'У вас есть несохраненные изменения. Вы действительно хотите покинуть страницу?',
  });

  useEffect(() => {
    // Проверяем, что пользователь редактирует свой профиль
    if (!isOwnProfile) {
      navigate('/users', { replace: true });
      return;
    }

    const loadUser = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getUserById(parseInt(id));
        setUser(data);
        setFormData({
          name: data.name || '',
          login: data.login,
        });
      } catch (err) {
        setError('Не удалось загрузить данные профиля');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id, isOwnProfile, navigate]);

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.login.trim()) {
      alert('Логин не может быть пустым');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await updateUser(Number(id), {
        name: formData.name,
        login: formData.login,
      });

      // Обновляем данные в контексте если нужно
      if (currentUser) {
        const updatedUser = { ...currentUser, name: formData.name, login: formData.login };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      navigate(`/profile/${id}`);
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      if (errors) {
        const messages = Object.values(errors).flat().join('. ');
        setError(messages);
      } else {
        setError(err.response?.data?.message || 'Ошибка при обновлении профиля');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error && !user) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Назад
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Назад
      </Button>

      <Paper sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
            <UserIcon size={32} />
          </Avatar>
          <Box>
            <Typography variant="h5">Редактирование профиля</Typography>
            <Typography variant="body2" color="text.secondary">
              ID: {user?.id}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box display="flex" flexDirection="column" gap={3}>
            <TextField
              fullWidth
              label="Имя"
              value={formData.name}
              onChange={handleChange('name')}
              disabled={saving}
            />

            <TextField
              fullWidth
              label="Логин"
              value={formData.login}
              onChange={handleChange('login')}
              disabled={saving}
              required
            />

            {isDirty && (
              <Alert severity="info">
                ✏️ У вас есть несохраненные изменения
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              startIcon={<Save size={18} />}
              disabled={!isDirty || saving}
              size="large"
            >
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};
```

## 5. Обновляем таблицу пользователей с ссылками на профили (src/components/UsersTable.tsx)

```typescript
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Avatar,
  Box,
} from '@mui/material';
import { Eye, Edit2, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';

type UsersTableProps = {
  users: User[];
};

export const UsersTable = ({ users }: UsersTableProps) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  if (users.length === 0) {
    return (
      <Typography color="text.secondary" align="center" py={4}>
        Нет пользователей
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Пользователь</TableCell>
            <TableCell>ID</TableCell>
            <TableCell>Логин</TableCell>
            <TableCell align="center">Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} hover>
              <TableCell>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: currentUser?.id === user.id ? 'primary.main' : 'secondary.main',
                    }}
                  >
                    {user.login.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography>
                    {user.name || user.login}
                    {currentUser?.id === user.id && (
                      <Typography component="span" color="primary" sx={{ ml: 1 }}>
                        (это вы)
                      </Typography>
                    )}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>{user.id}</TableCell>
              <TableCell>{user.login}</TableCell>
              <TableCell align="center">
                <Tooltip title="Просмотреть профиль">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/profile/${user.id}`)}
                    sx={{ mr: 1 }}
                  >
                    <Eye size={18} />
                  </IconButton>
                </Tooltip>
                {currentUser?.id === user.id && (
                  <Tooltip title="Редактировать">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/profile/${user.id}/edit`)}
                    >
                      <Edit2 size={18} />
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
```

## 6. Обновляем App.tsx с новыми маршрутами

```typescript
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { GlobalLoader } from './components/GlobalLoader';
import { AuthGuard } from './components/guards/AuthGuard';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoadingDemoPage } from './pages/LoadingDemoPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ServerErrorPage } from './pages/ServerErrorPage';
import { setLoadingCallback } from './api/client';
import { useLoading } from './contexts/LoadingContext';

const theme = createTheme({
  palette: {
    primary: { main: '#3f51b5' },
  },
});

const LoadingBridge = () => {
  const { setLoading } = useLoading();
  useEffect(() => {
    setLoadingCallback(setLoading);
  }, [setLoading]);
  return null;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LoadingProvider>
        <AuthProvider>
          <BrowserRouter>
            <LoadingBridge />
            <GlobalLoader message="Загрузка..." />
            <Header />
            <Routes>
              {/* Публичные маршруты */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/loading-demo" element={<LoadingDemoPage />} />
              
              {/* Защищенные маршруты */}
              <Route path="/users" element={
                <AuthGuard>
                  <UsersPage />
                </AuthGuard>
              } />
              
              <Route path="/profile/:id" element={
                <AuthGuard>
                  <ProfilePage />
                </AuthGuard>
              } />
              
              <Route path="/profile/:id/edit" element={
                <AuthGuard>
                  <EditProfilePage />
                </AuthGuard>
              } />
              
              {/* Маршруты ошибок */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="/500" element={<ServerErrorPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
```

## 7. Обновляем HomePage с приветствием пользователя

```typescript
// В HomePage.tsx добавить:
import { useAuth } from '../contexts/AuthContext';

// Внутри компонента:
const { user } = useAuth();

// В JSX заменить приветствие:
{user ? (
  <>
    <Typography variant="h2" gutterBottom>
      Добро пожаловать, {user.login}!
    </Typography>
    <Typography variant="h5" color="text.secondary" paragraph>
      ID: {user.id} • {user.name || 'Без имени'}
    </Typography>
  </>
) : (
  <Typography variant="h2" gutterBottom>
    Добро пожаловать!
  </Typography>
)}
```

## Тестирование функциональности

1. **Меню профиля**:
   - Авторизуйтесь → нажмите на аватар в хедере
   - Должны увидеть меню с пунктами "Профиль", "Редактировать", "Выйти"

2. **Просмотр профиля**:
   - Нажмите "Профиль" в меню → откроется страница профиля
   - Проверьте отображение информации и JWT токена (для своего профиля)

3. **Редактирование профиля**:
   - Нажмите "Редактировать" в меню или на странице профиля
   - Измените данные → появится предупреждение о несохраненных изменениях
   - Сохраните → вернетесь на страницу профиля

4. **Навигация по пользователям**:
   - На странице пользователей нажмите на иконку глаза у любого пользователя
   - Откроется его профиль (с ограниченной информацией)

## Что получилось:

✅ **Меню профиля** - аватар с выпадающим меню
✅ **Страница профиля** - просмотр информации о пользователе
✅ **Редактирование профиля** - только для своего профиля
✅ **Защита маршрутов** - недоступны без авторизации
✅ **Защита от потери данных** - предупреждение при несохраненных изменениях
✅ **Навигация** - удобные ссылки между страницами
=== React-8.-Сортировка,-поиск-и-пагинация.md ===
# Sprint 8 на React (Сортировка, пагинация и поиск)

Добавляем сортировку, пагинацию и поиск в таблицу пользователей.

## 1. Создаем кастомные хуки для сортировки, пагинации и поиска

**src/hooks/useSort.ts**
```typescript
import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export type SortConfig<T> = {
  key: keyof T | null;
  direction: SortDirection;
};

export const useSort = <T extends Record<string, any>>(
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

      if (sortConfig.direction === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }, [data, sortConfig]);

  const requestSort = (key: keyof T) => {
    let direction: SortDirection = 'asc';
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  return {
    sortedData,
    sortConfig,
    requestSort,
  };
};
```

**src/hooks/usePagination.ts**
```typescript
import { useState, useMemo } from 'react';

type UsePaginationProps = {
  initialPage?: number;
  initialRowsPerPage?: number;
  rowsPerPageOptions?: number[];
};

export const usePagination = <T>(
  data: T[],
  {
    initialPage = 0,
    initialRowsPerPage = 5,
    rowsPerPageOptions = [5, 10, 25, 50],
  }: UsePaginationProps = {}
) => {
  const [page, setPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return data.slice(start, end);
  }, [data, page, rowsPerPage]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const resetPagination = () => {
    setPage(0);
  };

  return {
    paginatedData,
    page,
    rowsPerPage,
    rowsPerPageOptions,
    handleChangePage,
    handleChangeRowsPerPage,
    resetPagination,
    totalCount: data.length,
    totalPages: Math.ceil(data.length / rowsPerPage),
    from: page * rowsPerPage + 1,
    to: Math.min((page + 1) * rowsPerPage, data.length),
  };
};
```

**src/hooks/useSearch.ts**
```typescript
import { useState, useMemo, useCallback } from 'react';

type UseSearchProps<T> = {
  data: T[];
  searchFields: (keyof T)[];
  initialSearch?: string;
};

export const useSearch = <T extends Record<string, any>>({
  data,
  searchFields,
  initialSearch = '',
}: UseSearchProps<T>) => {
  const [searchText, setSearchText] = useState(initialSearch);

  const filteredData = useMemo(() => {
    if (!searchText.trim()) return data;

    const searchLower = searchText.toLowerCase();
    return data.filter((item) =>
      searchFields.some((field) => {
        const value = item[field]?.toString().toLowerCase() || '';
        return value.includes(searchLower);
      })
    );
  }, [data, searchText, searchFields]);

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchText('');
  }, []);

  return {
    searchText,
    filteredData,
    handleSearch,
    clearSearch,
    setSearchText,
  };
};
```

## 2. Создаем компонент SearchBar (src/components/SearchBar.tsx)

```typescript
import React from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Search, X } from 'lucide-react';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export const SearchBar = ({
  value,
  onChange,
  placeholder = 'Поиск...',
  disabled = false,
}: SearchBarProps) => {
  return (
    <TextField
      fullWidth
      variant="outlined"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search size={20} color="#999" />
          </InputAdornment>
        ),
        endAdornment: value && (
          <InputAdornment position="end">
            <IconButton onClick={() => onChange('')} size="small" edge="end">
              <X size={18} />
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
        },
      }}
    />
  );
};
```

## 3. Создаем компонент SortableTableHeader (src/components/SortableTableHeader.tsx)

```typescript
import React from 'react';
import { TableCell, TableSortLabel, Box } from '@mui/material';
import { SortDirection } from '../hooks/useSort';

type SortableTableHeaderProps<T> = {
  field: keyof T;
  label: string;
  currentSort: keyof T | null;
  direction: SortDirection;
  onSort: (field: keyof T) => void;
  width?: string | number;
};

export const SortableTableHeader = <T extends Record<string, any>>({
  field,
  label,
  currentSort,
  direction,
  onSort,
  width,
}: SortableTableHeaderProps<T>) => {
  return (
    <TableCell width={width}>
      <TableSortLabel
        active={currentSort === field}
        direction={currentSort === field ? direction : 'asc'}
        onClick={() => onSort(field)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
};
```

## 4. Создаем компонент PaginationControls (src/components/PaginationControls.tsx)

```typescript
import React from 'react';
import { TablePagination, Box } from '@mui/material';

type PaginationControlsProps = {
  count: number;
  page: number;
  rowsPerPage: number;
  rowsPerPageOptions: number[];
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  labelRowsPerPage?: string;
};

export const PaginationControls = ({
  count,
  page,
  rowsPerPage,
  rowsPerPageOptions,
  onPageChange,
  onRowsPerPageChange,
  labelRowsPerPage = 'Строк на странице:',
}: PaginationControlsProps) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={count}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        labelRowsPerPage={labelRowsPerPage}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} из ${count}`
        }
        showFirstButton
        showLastButton
      />
    </Box>
  );
};
```

## 5. Обновляем компонент UsersTable с сортировкой (src/components/UsersTable.tsx)

```typescript
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Avatar,
  Box,
  Chip,
} from '@mui/material';
import { Eye, Edit2, User as UserIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { SortableTableHeader } from './SortableTableHeader';
import { SortConfig } from '../hooks/useSort';

type UsersTableProps = {
  users: User[];
  sortConfig: SortConfig<User>;
  onSort: (field: keyof User) => void;
};

export const UsersTable = ({ users, sortConfig, onSort }: UsersTableProps) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  if (users.length === 0) {
    return (
      <Typography color="text.secondary" align="center" py={4}>
        Нет пользователей
      </Typography>
    );
  }

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
          {users.map((user) => (
            <TableRow key={user.id} hover>
              <TableCell>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: currentUser?.id === user.id ? 'primary.main' : 'secondary.main',
                    }}
                  >
                    {user.login.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body1">
                      {user.name || user.login}
                    </Typography>
                    {user.name && (
                      <Typography variant="caption" color="text.secondary">
                        @{user.login}
                      </Typography>
                    )}
                  </Box>
                  {currentUser?.id === user.id && (
                    <Chip
                      label="Это вы"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell>{user.id}</TableCell>
              <TableCell>{user.login}</TableCell>
              <TableCell align="center">
                <Tooltip title="Просмотреть профиль">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/profile/${user.id}`)}
                    sx={{ mr: 1 }}
                  >
                    <Eye size={18} />
                  </IconButton>
                </Tooltip>
                {currentUser?.id === user.id && (
                  <Tooltip title="Редактировать">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/profile/${user.id}/edit`)}
                    >
                      <Edit2 size={18} />
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
```

## 6. Обновляем хук useUsers с поиском и сортировкой (src/hooks/useUsers.ts)

```typescript
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

  // Сортировка
  const { sortedData, sortConfig, requestSort } = useSort<User>(users, {
    key: 'id',
    direction: 'asc',
  });

  // Поиск
  const {
    searchText,
    filteredData: searchedUsers,
    handleSearch,
    clearSearch,
  } = useSearch({
    data: sortedData,
    searchFields: ['login', 'name', 'id'],
  });

  // Пагинация
  const {
    paginatedData,
    page,
    rowsPerPage,
    rowsPerPageOptions,
    handleChangePage,
    handleChangeRowsPerPage,
    resetPagination,
    totalCount,
    from,
    to,
  } = usePagination(searchedUsers, { initialRowsPerPage: 5 });

  // Сброс пагинации при поиске
  useEffect(() => {
    resetPagination();
  }, [searchText, resetPagination]);

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
    // Данные
    users: paginatedData,
    allUsers: users,
    filteredCount: searchedUsers.length,
    totalCount: users.length,
    error,
    refetch: loadUsers,
    
    // Сортировка
    sortConfig,
    requestSort,
    
    // Поиск
    searchText,
    handleSearch,
    clearSearch,
    
    // Пагинация
    page,
    rowsPerPage,
    rowsPerPageOptions,
    handleChangePage,
    handleChangeRowsPerPage,
    from,
    to,
  };
};
```

## 7. Обновляем страницу пользователей (src/pages/UsersPage.tsx)

```typescript
import React from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Chip,
  Stack,
  Badge,
} from '@mui/material';
import {
  RefreshCw,
  Users as UsersIcon,
  Filter,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { useLoading } from '../contexts/LoadingContext';
import { useAuth } from '../contexts/AuthContext';
import { UsersTable } from '../components/UsersTable';
import { SearchBar } from '../components/SearchBar';
import { PaginationControls } from '../components/PaginationControls';
import { ErrorMessage } from '../components/ErrorMessage';
import { ButtonLoader } from '../components/ButtonLoader';

export const UsersPage = () => {
  const {
    users,
    filteredCount,
    totalCount,
    error,
    refetch,
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
  } = useUsers();

  const { isLoading } = useLoading();
  const { token } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* Заголовок */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <UsersIcon size={28} color="#3f51b5" />
            <Typography variant="h4">
              Пользователи
            </Typography>
            <Chip
              label={`Всего: ${totalCount}`}
              size="small"
              color="primary"
              variant="outlined"
            />
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
          
          <Button
            variant="contained"
            onClick={() => refetch()}
            disabled={isLoading}
            startIcon={isLoading ? <ButtonLoader /> : <RefreshCw size={18} />}
          >
            {isLoading ? 'Загрузка...' : 'Обновить'}
          </Button>
        </Box>

        {/* Поиск */}
        <Box mb={3}>
          <SearchBar
            value={searchText}
            onChange={handleSearch}
            placeholder="Поиск по логину, имени или ID..."
            disabled={isLoading}
          />
        </Box>

        {/* Информация о текущей странице */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="body2" color="text.secondary">
            Показаны записи {from}-{to} из {filteredCount}
          </Typography>
          
          {sortConfig.key && (
            <Chip
              icon={sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              label={`Сортировка по ${sortConfig.key} (${sortConfig.direction === 'asc' ? 'возр' : 'убыв'})`}
              size="small"
              variant="outlined"
              onDelete={() => requestSort('id')}
            />
          )}
        </Box>

        {error && <ErrorMessage message={error} onRetry={refetch} />}

        {/* Таблица */}
        <UsersTable
          users={users}
          sortConfig={sortConfig}
          onSort={requestSort}
        />

        {/* Пагинация */}
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

        {/* Информация о JWT */}
        {token && (
          <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={1}>
            <Typography variant="caption" color="text.secondary">
              JWT токен активен • Запросы авторизованы
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};
```

## 8. Создаем демо-страницу для тестирования (src/pages/TableDemoPage.tsx)

```typescript
import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import {
  Table2,
  Search,
  ArrowUpDown,
  LayoutList,
} from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { UsersTable } from '../components/UsersTable';
import { SearchBar } from '../components/SearchBar';
import { PaginationControls } from '../components/PaginationControls';

export const TableDemoPage = () => {
  const {
    users,
    filteredCount,
    totalCount,
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
  } = useUsers();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom align="center">
        Демо таблицы
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" paragraph align="center">
        Сортировка, поиск и пагинация в действии
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <ArrowUpDown size={20} color="#3f51b5" />
                <Typography variant="h6">Сортировка</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Нажмите на заголовки столбцов для сортировки.
                Активный столбец подсвечивается.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Search size={20} color="#3f51b5" />
                <Typography variant="h6">Поиск</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Поиск по логину, имени или ID.
                Количество результатов обновляется в реальном времени.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <LayoutList size={20} color="#3f51b5" />
                <Typography variant="h6">Пагинация</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Настраиваемое количество строк на странице.
                Показывает текущий диапазон записей.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Table2 size={24} color="#3f51b5" />
          <Typography variant="h5">Таблица пользователей</Typography>
          <Box flex={1} />
          <Chip
            label={`Всего: ${totalCount}`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`На странице: ${users.length}`}
            color="secondary"
            variant="outlined"
          />
        </Box>

        <SearchBar
          value={searchText}
          onChange={handleSearch}
          placeholder="Поиск по таблице..."
        />

        <Box display="flex" justifyContent="space-between" alignItems="center" my={2}>
          <Typography variant="body2" color="text.secondary">
            Показаны {from}-{to} из {filteredCount}
          </Typography>
          {searchText && (
            <Button size="small" onClick={clearSearch}>
              Очистить поиск
            </Button>
          )}
        </Box>

        <UsersTable
          users={users}
          sortConfig={sortConfig}
          onSort={requestSort}
        />

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

        {filteredCount === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Ничего не найдено. Попробуйте изменить параметры поиска.
          </Alert>
        )}
      </Paper>
    </Container>
  );
};
```

## 9. Обновляем App.tsx с новым маршрутом

```typescript
// Добавить импорт
import { TableDemoPage } from './pages/TableDemoPage';

// Добавить маршрут
<Route path="/table-demo" element={<TableDemoPage />} />
```

## 10. Обновляем HomePage с ссылкой на демо

```typescript
// Добавить кнопку в HomePage
<Button
  variant="outlined"
  startIcon={<Table2 size={20} />}
  onClick={() => navigate('/table-demo')}
>
  Демо таблицы
</Button>
```

## Тестирование функциональности

1. **Сортировка**:
   - Нажмите на заголовки столбцов "ID" или "Логин"
   - Данные должны сортироваться по выбранному полю
   - Иконка показывает направление сортировки

2. **Поиск**:
   - Введите текст в поле поиска
   - Таблица должна фильтроваться в реальном времени
   - Показывается количество найденных записей
   - Можно очистить поиск крестиком или кнопкой

3. **Пагинация**:
   - Используйте кнопки для переключения страниц
   - Измените количество строк на странице
   - Показывается текущий диапазон записей

4. **Интеграция**:
   - Поиск и сортировка работают вместе
   - Пагинация сбрасывается при изменении поиска
   - Все функции оптимизированы через useMemo

## Что получилось:

✅ **Сортировка** - по всем столбцам таблицы
✅ **Поиск** - фильтрация в реальном времени
✅ **Пагинация** - настраиваемое количество строк
✅ **Индикаторы** - показывают текущее состояние
✅ **Оптимизация** - useMemo для производительности
✅ **Демо-страница** - для тестирования всех функций
=== React-9.-Добавление,-обновление-и-удаление-пользователей.md ===
# Sprint 9 на React (CRUD операции)

Добавляем создание, удаление и обновление пользователей.

## 1. Создаем компонент модального окна для добавления пользователя (src/components/AddUserModal.tsx)

```typescript
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { UserPlus, Eye, EyeOff, X } from 'lucide-react';

type AddUserModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (user: { login: string; password: string; name?: string }) => Promise<void>;
};

export const AddUserModal = ({ open, onClose, onSave }: AddUserModalProps) => {
  const [formData, setFormData] = useState({
    login: '',
    password: '',
    name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.login.trim()) {
      newErrors.login = 'Логин обязателен';
    }
    if (!formData.password.trim()) {
      newErrors.password = 'Пароль обязателен';
    }
    if (formData.password && formData.password.length < 3) {
      newErrors.password = 'Минимум 3 символа';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Очищаем ошибку поля при изменении
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      setServerError('');
      await onSave(formData);
      handleClose();
    } catch (err: any) {
      setServerError(err.message || 'Ошибка при создании пользователя');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ login: '', password: '', name: '' });
      setErrors({});
      setServerError('');
      onClose();
    }
  };

  const isValid = formData.login.trim() && formData.password.trim() && formData.password.length >= 3;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <UserPlus size={24} />
            <span>Создание пользователя</span>
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={loading}>
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
          {serverError && (
            <Alert severity="error" onClose={() => setServerError(''
=== React-Native-10.-Серверная-пагинация.md ===
В этом спринте мы реализуем серверную пагинацию для эффективной работы с большими объемами данных.

## 1. Установка дополнительных зависимостей

```bash
npm install react-native-vector-icons
npm install @react-native-async-storage/async-storage
npm install react-native-safe-area-context
npm install react-native-screens
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-gesture-handler
npm install react-native-modal
npm install react-native-paper

# Для iOS
cd ios && pod install && cd ..
```

## 2. Обновление сервиса Users с поддержкой серверной пагинации

**src/services/users.service.ts:**
```typescript
import User from '../models/user.entity';
import api from './api.config';

// Интерфейс для ответа с пагинацией
export interface PaginatedResult<T> {
    data: T[];
    count: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
}

class UsersService {
    // Получение всех пользователей (для небольших объемов)
    async getAll(): Promise<User[]> {
        try {
            const response = await api.get<User[]>('/Users');
            return response.data;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    }

    // Получение пользователей с серверной пагинацией
    async getAllWithPagination(pageSize: number, pageNumber: number): Promise<PaginatedResult<User>> {
        try {
            const params = new URLSearchParams();
            params.append('PageSize', pageSize.toString());
            params.append('PageNumber', pageNumber.toString());

            console.log(`Запрос пользователей: pageSize=${pageSize}, pageNumber=${pageNumber}`);
            const response = await api.get<PaginatedResult<User>>(`/Users/option?${params.toString()}`);
            console.log('Получен ответ:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching paginated users:', error);
            throw error;
        }
    }

    async get(id: number): Promise<User> {
        try {
            const response = await api.get<User>(`/Users/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching user ${id}:`, error);
            throw error;
        }
    }

    async create(user: Partial<User>): Promise<User> {
        try {
            const response = await api.post<User>('/Users', user);
            return response.data;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async update(user: User): Promise<User> {
        try {
            const response = await api.put<User>(`/Users/${user.id}`, user);
            return response.data;
        } catch (error) {
            console.error(`Error updating user ${user.id}:`, error);
            throw error;
        }
    }

    async del(id: number): Promise<boolean> {
        try {
            await api.delete(`/Users/${id}`);
            return true;
        } catch (error) {
            console.error(`Error deleting user ${id}:`, error);
            throw error;
        }
    }
}

export const usersService = new UsersService();
```

## 3. Создание хука для серверной пагинации

**src/hooks/useServerPagination.ts:**
```typescript
import { useState, useCallback, useEffect } from 'react';
import { usersService, PaginatedResult } from '../services/users.service';
import User from '../models/user.entity';

interface UseServerPaginationProps {
    initialPageSize?: number;
    initialPageNumber?: number;
    autoLoad?: boolean;
}

interface UseServerPaginationReturn {
    // Данные
    data: User[];
    totalItems: number;
    totalPages: number;
    loading: boolean;
    error: string | null;
    
    // Параметры пагинации
    pageNumber: number;
    pageSize: number;
    
    // Методы навигации
    loadPage: () => Promise<PaginatedResult<User> | undefined>;
    goToPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    changePageSize: (newSize: number) => void;
    refresh: () => Promise<PaginatedResult<User> | undefined>;
    reset: () => void;
    
    // Вспомогательные значения
    hasNextPage: boolean;
    hasPrevPage: boolean;
    isFirstPage: boolean;
    isLastPage: boolean;
    from: number;
    to: number;
}

export const useServerPagination = ({
    initialPageSize = 5,
    initialPageNumber = 1,
    autoLoad = true
}: UseServerPaginationProps = {}): UseServerPaginationReturn => {
    const [pageNumber, setPageNumber] = useState(initialPageNumber);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [data, setData] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadPage = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const result = await usersService.getAllWithPagination(pageSize, pageNumber);
            
            setData(result.data);
            setTotalItems(result.count);
            setTotalPages(result.totalPages);
            
            return result;
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Ошибка загрузки данных';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [pageNumber, pageSize]);

    // Автоматическая загрузка при изменении параметров
    useEffect(() => {
        if (autoLoad) {
            loadPage();
        }
    }, [pageNumber, pageSize, autoLoad]);

    const goToPage = useCallback((page: number) => {
        if (page >= 1 && page <= totalPages) {
            setPageNumber(page);
        }
    }, [totalPages]);

    const nextPage = useCallback(() => {
        if (pageNumber < totalPages) {
            setPageNumber(prev => prev + 1);
        }
    }, [pageNumber, totalPages]);

    const prevPage = useCallback(() => {
        if (pageNumber > 1) {
            setPageNumber(prev => prev - 1);
        }
    }, [pageNumber]);

    const changePageSize = useCallback((newSize: number) => {
        setPageSize(newSize);
        setPageNumber(1); // Сбрасываем на первую страницу
    }, []);

    const refresh = useCallback(() => {
        return loadPage();
    }, [loadPage]);

    const reset = useCallback(() => {
        setPageNumber(initialPageNumber);
        setPageSize(initialPageSize);
        setData([]);
        setError(null);
    }, [initialPageNumber, initialPageSize]);

    return {
        // Данные
        data,
        totalItems,
        totalPages,
        loading,
        error,
        
        // Параметры пагинации
        pageNumber,
        pageSize,
        
        // Методы навигации
        loadPage,
        goToPage,
        nextPage,
        prevPage,
        changePageSize,
        refresh,
        reset,
        
        // Вспомогательные значения
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
        isFirstPage: pageNumber === 1,
        isLastPage: pageNumber === totalPages,
        from: (pageNumber - 1) * pageSize + 1,
        to: Math.min(pageNumber * pageSize, totalItems)
    };
};
```

## 4. Создание компонента ServerPagination

**src/components/ServerPagination.tsx:**
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ServerPaginationProps {
    pageNumber: number;
    totalPages: number;
    pageSize: number;
    pageSizeOptions: number[];
    loading: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    from: number;
    to: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export const ServerPagination: React.FC<ServerPaginationProps> = ({
    pageNumber,
    totalPages,
    pageSize,
    pageSizeOptions,
    loading,
    onPageChange,
    onPageSizeChange,
    from,
    to,
    totalItems,
    hasNextPage,
    hasPrevPage
}) => {
    const [showPageSizeSelector, setShowPageSizeSelector] = React.useState(false);

    return (
        <View style={styles.container}>
            <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                    {from}-{to} из {totalItems}
                </Text>
                {loading && <ActivityIndicator size="small" color="#3f51b5" />}
            </View>

            <View style={styles.controlsContainer}>
                <TouchableOpacity
                    style={[styles.pageButton, !hasPrevPage && styles.pageButtonDisabled]}
                    onPress={() => onPageChange(1)}
                    disabled={!hasPrevPage || loading}
                >
                    <Icon name="first-page" size={20} color={!hasPrevPage || loading ? '#ccc' : '#666'} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.pageButton, !hasPrevPage && styles.pageButtonDisabled]}
                    onPress={() => onPageChange(pageNumber - 1)}
                    disabled={!hasPrevPage || loading}
                >
                    <Icon name="chevron-left" size={20} color={!hasPrevPage || loading ? '#ccc' : '#666'} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.pageInfoButton}
                    onPress={() => setShowPageSizeSelector(true)}
                    disabled={loading}
                >
                    <Text style={styles.pageInfoText}>
                        {pageNumber} / {totalPages}
                    </Text>
                    <Icon name="arrow-drop-down" size={20} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.pageButton, !hasNextPage && styles.pageButtonDisabled]}
                    onPress={() => onPageChange(pageNumber + 1)}
                    disabled={!hasNextPage || loading}
                >
                    <Icon name="chevron-right" size={20} color={!hasNextPage || loading ? '#ccc' : '#666'} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.pageButton, !hasNextPage && styles.pageButtonDisabled]}
                    onPress={() => onPageChange(totalPages)}
                    disabled={!hasNextPage || loading}
                >
                    <Icon name="last-page" size={20} color={!hasNextPage || loading ? '#ccc' : '#666'} />
                </TouchableOpacity>
            </View>

            {/* Модальное окно выбора количества строк на странице */}
            <Modal
                visible={showPageSizeSelector}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPageSizeSelector(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPageSizeSelector(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Строк на странице</Text>
                        <FlatList
                            data={pageSizeOptions}
                            keyExtractor={(item) => item.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        pageSize === item && styles.optionItemSelected
                                    ]}
                                    onPress={() => {
                                        onPageSizeChange(item);
                                        setShowPageSizeSelector(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        pageSize === item && styles.optionTextSelected
                                    ]}>
                                        {item}
                                    </Text>
                                    {pageSize === item && (
                                        <Icon name="check" size={20} color="#3f51b5" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    infoText: {
        fontSize: 12,
        color: '#666',
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pageButton: {
        padding: 8,
        borderRadius: 4,
    },
    pageButtonDisabled: {
        opacity: 0.5,
    },
    pageInfoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        marginHorizontal: 8,
        gap: 4,
    },
    pageInfoText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        width: '80%',
        maxWidth: 300,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    optionItemSelected: {
        backgroundColor: '#f0f0f0',
    },
    optionText: {
        fontSize: 14,
        color: '#333',
    },
    optionTextSelected: {
        color: '#3f51b5',
        fontWeight: '500',
    },
});
```

## 5. Создание экрана с серверной пагинацией

**src/screens/UsersServerPaginationScreen.tsx:**
```tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../services/users.service';
import { messageService } from '../services/message.service';
import { useAuth } from '../contexts/AuthContext';
import { AuthGuard } from '../components/guards/AuthGuard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchBar } from '../components/SearchBar';
import { AddUserModal } from '../components/AddUserModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ServerPagination } from '../components/ServerPagination';
import { useServerPagination } from '../hooks/useServerPagination';
import User from '../models/user.entity';

interface UsersServerPaginationScreenProps {
    navigation: any;
}

const UsersServerPaginationContent: React.FC<UsersServerPaginationScreenProps> = ({ navigation }) => {
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [searchText, setSearchText] = useState('');
    const [filteredData, setFilteredData] = useState<User[]>([]);
    const { currentUser } = useAuth();

    // Используем хук серверной пагинации
    const {
        data,
        totalItems,
        totalPages,
        loading,
        error,
        pageNumber,
        pageSize,
        loadPage,
        goToPage,
        changePageSize,
        refresh,
        from,
        to,
        hasNextPage,
        hasPrevPage
    } = useServerPagination({
        initialPageSize: 5,
        initialPageNumber: 1,
        autoLoad: true
    });

    // Локальный поиск по загруженной странице
    useEffect(() => {
        if (!searchText.trim()) {
            setFilteredData(data);
        } else {
            const searchLower = searchText.toLowerCase();
            const filtered = data.filter(user => 
                user.login.toLowerCase().includes(searchLower) ||
                (user.name && user.name.toLowerCase().includes(searchLower)) ||
                user.id.toString().includes(searchLower)
            );
            setFilteredData(filtered);
        }
    }, [data, searchText]);

    // CRUD операции с перезагрузкой текущей страницы
    const handleAddUser = async (newUser: Partial<User>) => {
        try {
            setAddModalVisible(false);
            await usersService.create(newUser as User);
            messageService.message('Пользователь успешно создан');
            await refresh();
        } catch (err: any) {
            const errors = err.response?.data?.errors;
            if (errors) {
                const messages = Object.values(errors).flat().join('\n');
                messageService.error(messages);
            } else {
                messageService.error(err.response?.data?.message || 'Ошибка при создании пользователя');
            }
        }
    };

    const handleDeletePress = (user: User) => {
        setUserToDelete(user);
        setDeleteDialogVisible(true);
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;

        try {
            setDeleteDialogVisible(false);
            await usersService.del(userToDelete.id);
            messageService.message(`Пользователь ${userToDelete.login} удален`);
            await refresh();
        } catch (err: any) {
            messageService.error(err.response?.data?.message || 'Ошибка при удалении пользователя');
        } finally {
            setUserToDelete(null);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogVisible(false);
        setUserToDelete(null);
    };

    const handleUserPress = (user: User) => {
        navigation.navigate('Profile', { userId: user.id });
    };

    const handleEditPress = (user: User) => {
        navigation.navigate('Edit', { userId: user.id });
    };

    const clearSearch = () => {
        setSearchText('');
    };

    const renderUserItem = ({ item, index }: { item: User; index: number }) => (
        <View style={[
            styles.userCard,
            index % 2 === 0 ? styles.cardEven : styles.cardOdd
        ]}>
            <TouchableOpacity
                style={styles.userInfoContainer}
                onPress={() => handleUserPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.userAvatar, currentUser?.id === item.id && styles.currentUserAvatar]}>
                    <Text style={styles.userAvatarText}>
                        {item.name?.charAt(0).toUpperCase() || item.login.charAt(0).toUpperCase()}
                    </Text>
                    {currentUser?.id === item.id && (
                        <View style={styles.currentUserBadge}>
                            <Icon name="star" size={12} color="#fff" />
                        </View>
                    )}
                </View>
                
                <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                        {item.name || 'Без имени'}
                    </Text>
                    <Text style={styles.userLogin}>@{item.login}</Text>
                    <Text style={styles.userId}>ID: {item.id}</Text>
                </View>
            </TouchableOpacity>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditPress(item)}
                >
                    <Icon name="edit" size={20} color="#3f51b5" />
                </TouchableOpacity>

                {currentUser?.id !== item.id && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeletePress(item)}
                    >
                        <Icon name="delete" size={20} color="#f44336" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.statsContainer}>
                <View style={styles.statsLeft}>
                    <Text style={styles.statsText}>
                        Страница {pageNumber} из {totalPages}
                    </Text>
                    <Text style={styles.statsText}>
                        Всего: {totalItems}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setAddModalVisible(true)}
                    disabled={loading}
                >
                    <Icon name="add" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Создать</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <SearchBar
                    value={searchText}
                    onChangeText={setSearchText}
                    onClear={clearSearch}
                    placeholder="Поиск по текущей странице..."
                />
            </View>

            {searchText ? (
                <View style={styles.searchInfo}>
                    <Text style={styles.searchInfoText}>
                        Найдено на странице: {filteredData.length} из {data.length}
                    </Text>
                    <TouchableOpacity onPress={clearSearch}>
                        <Text style={styles.clearSearchText}>Сбросить</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
        </View>
    );

    const renderFooter = () => (
        <ServerPagination
            pageNumber={pageNumber}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={[5, 10, 25, 50]}
            loading={loading}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
            from={from}
            to={to}
            totalItems={totalItems}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
        />
    );

    if (loading && data.length === 0) {
        return <LoadingSpinner fullScreen text="Загрузка пользователей..." />;
    }

    if (error && data.length === 0) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="error-outline" size={60} color="#f44336" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={refresh}>
                    <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredData}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderUserItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={refresh} />
                }
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="people-outline" size={80} color="#ccc" />
                        <Text style={styles.emptyText}>
                            {searchText ? 'Пользователи не найдены на этой странице' : 'Нет пользователей'}
                        </Text>
                        {searchText && (
                            <TouchableOpacity onPress={clearSearch}>
                                <Text style={styles.clearSearchText}>Очистить поиск</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                stickyHeaderIndices={[0]}
            />

            {/* Модальное окно добавления пользователя */}
            <AddUserModal
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                onSave={handleAddUser}
            />

            {/* Диалог подтверждения удаления */}
            <ConfirmDialog
                visible={deleteDialogVisible}
                title="Подтверждение удаления"
                message={`Вы действительно хотите удалить пользователя ${userToDelete?.login}? Это действие нельзя отменить.`}
                confirmText="Удалить"
                cancelText="Отмена"
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
                severity="error"
            />
        </View>
    );
};

const UsersServerPaginationScreen: React.FC<UsersServerPaginationScreenProps> = ({ navigation }) => {
    return (
        <AuthGuard navigation={navigation} redirectTo="Auth">
            <UsersServerPaginationContent navigation={navigation} />
        </AuthGuard>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    listContent: {
        paddingBottom: 16,
    },
    headerContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    statsLeft: {
        flex: 1,
    },
    statsText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4caf50',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    searchContainer: {
        marginBottom: 8,
    },
    searchInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 8,
    },
    searchInfoText: {
        fontSize: 11,
        color: '#666',
        fontStyle: 'italic',
    },
    clearSearchText: {
        fontSize: 11,
        color: '#3f51b5',
        fontWeight: '500',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    cardEven: {
        backgroundColor: '#fff',
    },
    cardOdd: {
        backgroundColor: '#fafafa',
    },
    userInfoContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3f51b5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
    },
    currentUserAvatar: {
        backgroundColor: '#f50057',
    },
    userAvatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    currentUserBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#ffc107',
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    userLogin: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    userId: {
        fontSize: 12,
        color: '#999',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 8,
    },
    actionButton: {
        padding: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 16,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3f51b5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default UsersServerPaginationScreen;
```

## 6. Создание информационных карточек для статистики

**src/components/StatsCard.tsx:**
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface StatsCardProps {
    title: string;
    value: number;
    icon: string;
    color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    icon,
    color = '#3f51b5'
}) => {
    return (
        <View style={[styles.card, { borderColor: color }]}>
            <Icon name={icon} size={24} color={color} />
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.title}>{title}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        minWidth: 100,
    },
    value: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 8,
        marginBottom: 4,
    },
    title: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
});
```

## 7. Обновление навигации

**src/App.tsx:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

import { AuthProvider } from './contexts/AuthContext';
import { LoadingOverlay } from './components/LoadingOverlay';
import HomeScreen from './screens/HomeScreen';
import UsersScreen from './screens/UsersScreen';
import UsersAdvancedScreen from './screens/UsersAdvancedScreen';
import UsersServerPaginationScreen from './screens/UsersServerPaginationScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import AuthScreen from './screens/AuthScreen';
import SignScreen from './screens/SignScreen';
import LoadingDemoScreen from './screens/LoadingDemoScreen';
import Header from './components/Header';

export type RootStackParamList = {
    Home: undefined;
    Users: undefined;
    UsersAdvanced: undefined;
    UsersServerPagination: undefined;
    Profile: { userId: number };
    Edit: { userId: number };
    Auth: { registered?: boolean; returnUrl?: string } | undefined;
    Sign: undefined;
    LoadingDemo: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
    return (
        <SafeAreaProvider>
            <StatusBar backgroundColor="#3f51b5" barStyle="light-content" />
            <AuthProvider>
                <NavigationContainer>
                    <LoadingOverlay text="Загрузка..." showProgress />
                    <Stack.Navigator
                        screenOptions={({ navigation, route }) => ({
                            header: () => (
                                <Header
                                    navigation={navigation}
                                    showBack={route.name !== 'Home'}
                                    title={route.name === 'Home' ? 'Главная' : 
                                           route.name === 'Users' ? 'Пользователи' :
                                           route.name === 'UsersAdvanced' ? 'Расширенный' :
                                           route.name === 'UsersServerPagination' ? 'Серверная пагинация' :
                                           route.name === 'Profile' ? 'Профиль' :
                                           route.name === 'Edit' ? 'Редактирование' :
                                           route.name === 'Auth' ? 'Вход' : 
                                           route.name === 'Sign' ? 'Регистрация' : 
                                           'Демо лоадера'}
                                />
                            ),
                        })}
                    >
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="Users" component={UsersScreen} />
                        <Stack.Screen name="UsersAdvanced" component={UsersAdvancedScreen} />
                        <Stack.Screen name="UsersServerPagination" component={UsersServerPaginationScreen} />
                        <Stack.Screen name="Profile" component={ProfileScreen} />
                        <Stack.Screen name="Edit" component={EditProfileScreen} />
                        <Stack.Screen name="Auth" component={AuthScreen} />
                        <Stack.Screen name="Sign" component={SignScreen} />
                        <Stack.Screen name="LoadingDemo" component={LoadingDemoScreen} />
                    </Stack.Navigator>
                </NavigationContainer>
            </AuthProvider>
        </SafeAreaProvider>
    );
};

export default App;
```

## 8. Обновление HomeScreen с ссылкой на серверную пагинацию

**src/screens/HomeScreen.tsx:**
```tsx
// Добавить в featuresContainer:
<TouchableOpacity
    style={styles.featureItem}
    onPress={() => navigation.navigate('UsersServerPagination')}
>
    <Icon name="storage" size={24} color="#3f51b5" />
    <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>Серверная пагинация</Text>
        <Text style={styles.featureDescription}>
            Эффективная загрузка больших объемов данных
        </Text>
    </View>
    <Icon name="chevron-right" size={24} color="#999" />
</TouchableOpacity>
```

## Тестирование функциональности

1. **Серверная пагинация**:
   - При загрузке экрана отправляется запрос с параметрами `PageSize=5&PageNumber=1`
   - При изменении страницы отправляется новый запрос
   - Отображается общее количество элементов

2. **Навигация по страницам**:
   - Используйте кнопки первой/предыдущей/следующей/последней страницы
   - Кнопки блокируются когда нет доступных страниц

3. **Изменение размера страницы**:
   - Нажмите на текущий размер страницы
   - Выберите новое значение из списка
   - Страница сбросится на первую

4. **CRUD с серверной пагинацией**:
   - При создании пользователя данные перезагружаются
   - При удалении пользователя данные перезагружаются
   - Текущая страница обновляется с новыми данными

5. **Локальный поиск**:
   - Поиск работает только по загруженной странице
   - Отображается количество найденных записей
   - Можно сбросить поиск

## Сравнение Angular vs React Native подходов для серверной пагинации

| Angular | React Native |
|---------|--------------|
| `HttpParams` | `URLSearchParams` |
| `signal<number>(5)` | `useState` + кастомный хук |
| `(page)="onPageChange($event)"` | `onPageChange` callback |
| `[pageIndex]="pageNumber() - 1"` | `pageNumber` напрямую |
| Отдельный метод в сервисе | `getAllWithPagination` метод |
| `loadData()` после CRUD | `refresh()` из хука |

## Команды Git

```bash
# Проверка статуса
git status

# Создание ветки sprint10
git checkout -b sprint10

# Добавление всех изменений
git add -A

# Создание коммита
git commit -m "Выполнен sprint10: Серверная пагинация"

# Переключение на master
git checkout master

# Ребейз sprint10 в master
git rebase sprint10
```

Эта реализация полностью воспроизводит функциональность Angular на React Native с:
- Серверной пагинацией через API параметры
- Корректной синхронизацией номеров страниц
- Перезагрузкой данных после CRUD операций
- Локальным поиском по загруженной странице
- Информацией о текущей странице и общем количестве
- Адаптивным интерфейсом для мобильных устройств
=== React-Native-11.-Обработка-ошибок.md ===
В этом спринте мы создадим комплексную систему обработки ошибок с использованием interceptors, глобального обработчика и компонентов для отображения ошибок.

## 1. Установка дополнительных зависимостей

```bash
npm install react-native-vector-icons
npm install @react-native-async-storage/async-storage
npm install react-native-safe-area-context
npm install react-native-screens
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-gesture-handler
npm install react-native-modal
npm install axios

# Для iOS
cd ios && pod install && cd ..
```

## 2. Создание сервиса для обработки ошибок

**src/services/error.service.ts:**
```typescript
import { Alert, Platform } from 'react-native';
import { messageService } from './message.service';

export interface ErrorResponse {
    status: number;
    message: string;
    errors?: Record<string, string[]>;
    timestamp?: string;
    path?: string;
    stack?: string;
}

class ErrorService {
    private listeners: Array<(error: ErrorResponse) => void> = [];
    private errorCount: number = 0;
    private lastError: ErrorResponse | null = null;

    handleError(error: any): ErrorResponse {
        console.error('Error caught:', error);

        let errorResponse: ErrorResponse = {
            status: error?.response?.status || 500,
            message: 'Произошла непредвиденная ошибка',
            timestamp: new Date().toISOString()
        };

        if (error.response) {
            // Ошибка от сервера с ответом
            const { status, data } = error.response;
            errorResponse.status = status;
            errorResponse.path = error.config?.url;

            // Обработка разных статусов
            switch (status) {
                case 400:
                    if (data.errors) {
                        errorResponse.errors = data.errors;
                        errorResponse.message = 'Ошибка валидации';
                        
                        // Собираем все ошибки валидации в одно сообщение
                        const validationErrors: string[] = [];
                        Object.keys(data.errors).forEach(key => {
                            if (data.errors[key]) {
                                validationErrors.push(...data.errors[key]);
                            }
                        });
                        messageService.error(validationErrors.join('\n'));
                    } else {
                        errorResponse.message = data.message || 'Неверный запрос';
                        messageService.error(errorResponse.message);
                    }
                    break;

                case 401:
                    errorResponse.message = 'Не авторизован';
                    messageService.error('Пользователь не авторизован');
                    break;

                case 403:
                    errorResponse.message = 'Доступ запрещен';
                    messageService.error('У вас нет прав для выполнения этого действия');
                    break;

                case 404:
                    errorResponse.message = 'Ресурс не найден';
                    messageService.error('Запрашиваемый ресурс не найден');
                    break;

                case 500:
                    errorResponse.message = 'Внутренняя ошибка сервера';
                    messageService.error('Произошла ошибка на сервере');
                    break;

                default:
                    errorResponse.message = data.message || `Ошибка ${status}`;
                    messageService.error(errorResponse.message);
                    break;
            }
        } else if (error.request) {
            // Запрос был сделан, но нет ответа
            errorResponse.message = 'Сервер не отвечает';
            messageService.error('Сервер не отвечает. Проверьте подключение к сети.');
        } else {
            // Ошибка при настройке запроса
            errorResponse.message = error.message || 'Ошибка при выполнении запроса';
            messageService.error(errorResponse.message);
        }

        // Сохраняем последнюю ошибку
        this.lastError = errorResponse;
        this.errorCount++;

        // Уведомляем всех подписчиков
        this.notifyListeners(errorResponse);

        return errorResponse;
    }

    subscribe(listener: (error: ErrorResponse) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(error: ErrorResponse) {
        this.listeners.forEach(listener => listener(error));
    }

    getLastError(): ErrorResponse | null {
        return this.lastError;
    }

    getErrorCount(): number {
        return this.errorCount;
    }

    clearErrors() {
        this.errorCount = 0;
        this.lastError = null;
        this.listeners = [];
    }
}

export const errorService = new ErrorService();
```

## 3. Создание Error Interceptor для Axios

**src/interceptors/error.interceptor.ts:**
```typescript
import { AxiosError } from 'axios';
import { errorService } from '../services/error.service';
import { authService } from '../services/auth.service';
import { Platform } from 'react-native';

export const errorInterceptor = (error: AxiosError) => {
    // Обрабатываем ошибку через сервис
    errorService.handleError(error);

    // Специальная обработка для 401 ошибки
    if (error.response?.status === 401) {
        // Проверяем, не является ли запрос запросом на авторизацию
        const isAuthRequest = error.config?.url?.includes('/Users/Login');
        
        if (!isAuthRequest) {
            // Токен истек или недействителен
            authService.logout();
            
            // Здесь мы не делаем автоматический редирект,
            // так как это должно обрабатываться в компонентах
        }
    }

    return Promise.reject(error);
};
```

## 4. Создание компонента ErrorBoundary

**src/components/ErrorBoundary.tsx**
```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    handleReload = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <SafeAreaView style={styles.container}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.iconContainer}>
                            <Icon name="bug-report" size={80} color="#f44336" />
                        </View>

                        <Text style={styles.title}>Что-то пошло не так</Text>

                        <Text style={styles.message}>
                            Произошла критическая ошибка в приложении.
                        </Text>

                        {this.state.error && (
                            <View style={styles.errorDetails}>
                                <Text style={styles.errorText}>
                                    {this.state.error.toString()}
                                </Text>
                            </View>
                        )}

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.reloadButton}
                                onPress={this.handleReload}
                            >
                                <Icon name="refresh" size={20} color="#fff" />
                                <Text style={styles.reloadButtonText}>
                                    Перезагрузить
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    iconContainer: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    errorDetails: {
        backgroundColor: '#ffebee',
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
        width: '100%',
    },
    errorText: {
        fontSize: 12,
        color: '#f44336',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    reloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3f51b5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    reloadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
```

## 5. Создание компонента ErrorAlert

**src/components/ErrorAlert.tsx**
```tsx
import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ErrorAlertProps {
    visible: boolean;
    title?: string;
    message: string;
    details?: string;
    onClose: () => void;
    autoClose?: boolean;
    duration?: number;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
    visible,
    title = 'Ошибка',
    message,
    details,
    onClose,
    autoClose = true,
    duration = 5000
}) => {
    const [showDetails, setShowDetails] = React.useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    friction: 8,
                }),
            ]).start();

            if (autoClose) {
                const timer = setTimeout(() => {
                    handleClose();
                }, duration);
                return () => clearTimeout(timer);
            }
        } else {
            fadeAnim.setValue(0);
            slideAnim.setValue(-100);
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
            setShowDetails(false);
        });
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={handleClose}
        >
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <Animated.View
                    style={[
                        styles.alert,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <View style={styles.header}>
                        <View style={styles.titleContainer}>
                            <Icon name="error" size={24} color="#f44336" />
                            <Text style={styles.title}>{title}</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose}>
                            <Icon name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.message}>{message}</Text>

                    {details && (
                        <View style={styles.detailsContainer}>
                            <TouchableOpacity
                                style={styles.detailsHeader}
                                onPress={() => setShowDetails(!showDetails)}
                            >
                                <Text style={styles.detailsHeaderText}>
                                    {showDetails ? 'Скрыть детали' : 'Показать детали'}
                                </Text>
                                <Icon
                                    name={showDetails ? 'expand-less' : 'expand-more'}
                                    size={20}
                                    color="#666"
                                />
                            </TouchableOpacity>

                            {showDetails && (
                                <View style={styles.details}>
                                    <Text style={styles.detailsText}>{details}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alert: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxWidth: 400,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    message: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
        lineHeight: 20,
    },
    detailsContainer: {
        marginTop: 8,
    },
    detailsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    detailsHeaderText: {
        fontSize: 12,
        color: '#3f51b5',
    },
    details: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
    },
    detailsText: {
        fontSize: 11,
        color: '#666',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
});
```

## 6. Создание страницы 404 (Not Found)

**src/screens/NotFoundScreen.tsx**
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface NotFoundScreenProps {
    navigation: any;
}

const NotFoundScreen: React.FC<NotFoundScreenProps> = ({ navigation }) => {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Icon name="error-outline" size={120} color="#f44336" />
                </View>

                <Text style={styles.errorCode}>404</Text>

                <Text style={styles.title}>Страница не найдена</Text>

                <Text style={styles.message}>
                    Запрашиваемая страница не существует или была перемещена.
                </Text>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.homeButton}
                        onPress={() => navigation.navigate('Home')}
                    >
                        <Icon name="home" size={20} color="#fff" />
                        <Text style={styles.homeButtonText}>На главную</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-back" size={20} color="#3f51b5" />
                        <Text style={styles.backButtonText}>Назад</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    iconContainer: {
        marginBottom: 20,
    },
    errorCode: {
        fontSize: 72,
        fontWeight: 'bold',
        color: '#f44336',
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center',
        lineHeight: 22,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    homeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3f51b5',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    homeButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
        borderWidth: 1,
        borderColor: '#3f51b5',
    },
    backButtonText: {
        color: '#3f51b5',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default NotFoundScreen;
```

## 7. Создание страницы 500 (Server Error)

**src/screens/ServerErrorScreen.tsx**
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ServerErrorScreenProps {
    navigation: any;
    route: any;
}

const ServerErrorScreen: React.FC<ServerErrorScreenProps> = ({ navigation, route }) => {
    const { error, message } = route.params || {};
    const [showDetails, setShowDetails] = React.useState(false);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.iconContainer}>
                    <Icon name="warning" size={120} color="#f44336" />
                </View>

                <Text style={styles.errorCode}>500</Text>

                <Text style={styles.title}>Ошибка сервера</Text>

                <Text style={styles.message}>
                    Произошла внутренняя ошибка сервера. Пожалуйста, попробуйте позже.
                </Text>

                {error && (
                    <View style={styles.errorDetails}>
                        <TouchableOpacity
                            style={styles.detailsHeader}
                            onPress={() => setShowDetails(!showDetails)}
                        >
                            <Text style={styles.detailsHeaderText}>
                                {showDetails ? 'Скрыть детали' : 'Показать детали'}
                            </Text>
                            <Icon
                                name={showDetails ? 'expand-less' : 'expand-more'}
                                size={20}
                                color="#666"
                            />
                        </TouchableOpacity>

                        {showDetails && (
                            <View style={styles.details}>
                                <Text style={styles.detailsText}>
                                    Код ошибки: {error}
                                </Text>
                                {message && (
                                    <Text style={styles.detailsText}>
                                        Сообщение: {message}
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.homeButton}
                        onPress={() => navigation.navigate('Home')}
                    >
                        <Icon name="home" size={20} color="#fff" />
                        <Text style={styles.homeButtonText}>На главную</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="refresh" size={20} color="#3f51b5" />
                        <Text style={styles.retryButtonText}>Попробовать снова</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    iconContainer: {
        marginBottom: 20,
    },
    errorCode: {
        fontSize: 72,
        fontWeight: 'bold',
        color: '#f44336',
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center',
        lineHeight: 22,
    },
    errorDetails: {
        width: '100%',
        marginBottom: 30,
    },
    detailsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
    },
    detailsHeaderText: {
        fontSize: 14,
        color: '#3f51b5',
    },
    details: {
        backgroundColor: '#ffebee',
        borderRadius: 8,
        padding: 16,
        marginTop: 8,
    },
    detailsText: {
        fontSize: 12,
        color: '#f44336',
        marginBottom: 4,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    homeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3f51b5',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    homeButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
        borderWidth: 1,
        borderColor: '#3f51b5',
    },
    retryButtonText: {
        color: '#3f51b5',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default ServerErrorScreen;
```

## 8. Создание экрана демонстрации ошибок

**src/screens/ErrorDemoScreen.tsx**
```tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../services/api.config';
import { errorService } from '../services/error.service';
import { messageService } from '../services/message.service';
import { ErrorAlert } from '../components/ErrorAlert';
import { useAuth } from '../contexts/AuthContext';

interface ErrorDemoScreenProps {
    navigation: any;
}

const ErrorDemoScreen: React.FC<ErrorDemoScreenProps> = ({ navigation }) => {
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [userId, setUserId] = useState('999999');
    const [errorAlertVisible, setErrorAlertVisible] = useState(false);
    const { logout } = useAuth();

    // Демонстрация 404 ошибки
    const triggerNotFound = async () => {
        try {
            await api.get(`/Users/${userId}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Пользователь не найден');
            setErrorDetails(`Статус: ${err.response?.status}\nURL: ${err.config?.url}`);
            setErrorAlertVisible(true);
        }
    };

    // Демонстрация 401 ошибки
    const triggerUnauthorized = async () => {
        try {
            await api.get('/Users/admin');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Не авторизован');
            setErrorDetails(`Статус: ${err.response?.status}\nСообщение: Требуется авторизация`);
            setErrorAlertVisible(true);
            
            // Через 2 секунды перенаправляем на вход
            setTimeout(() => {
                logout();
                navigation.navigate('Auth');
            }, 2000);
        }
    };

    // Демонстрация ошибки валидации
    const triggerValidationError = async () => {
        try {
            await api.post('/Users', {
                login: '',
                password: '123'
            });
        } catch (err: any) {
            const errors = err.response?.data?.errors;
            if (errors) {
                const errorMessages: string[] = [];
                Object.keys(errors).forEach(key => {
                    errorMessages.push(`${key}: ${errors[key].join(', ')}`);
                });
                setError('Ошибка валидации');
                setErrorDetails(errorMessages.join('\n'));
                setErrorAlertVisible(true);
                
                messageService.error(errorMessages.join('\n'));
            }
        }
    };

    // Демонстрация сетевой ошибки
    const triggerNetworkError = () => {
        errorService.handleError({
            request: {},
            message: 'Network Error'
        });
        setError('Сервер не отвечает');
        setErrorDetails('Проверьте подключение к сети и убедитесь, что сервер запущен');
        setErrorAlertVisible(true);
    };

    // Демонстрация программной ошибки
    const triggerProgramError = () => {
        try {
            throw new Error('Это тестовая программная ошибка');
        } catch (err: any) {
            setError(err.message);
            setErrorDetails(`Стек вызовов:\n${err.stack}`);
            setErrorAlertVisible(true);
        }
    };

    // Переход на несуществующий экран
    const goToNotFound = () => {
        navigation.navigate('NotFound' as never);
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Icon name="bug-report" size={50} color="#f44336" />
                    <Text style={styles.title}>Демонстрация ошибок</Text>
                    <Text style={styles.subtitle}>
                        Нажмите на кнопки, чтобы увидеть различные типы ошибок
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>HTTP ошибки</Text>
                    
                    <View style={styles.card}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>ID пользователя:</Text>
                            <TextInput
                                style={styles.input}
                                value={userId}
                                onChangeText={setUserId}
                                keyboardType="numeric"
                                placeholder="Введите ID"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, styles.errorButton]}
                            onPress={triggerNotFound}
                        >
                            <Icon name="error" size={20} color="#fff" />
                            <Text style={styles.buttonText}>404 Not Found</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.warningButton]}
                            onPress={triggerUnauthorized}
                        >
                            <Icon name="lock" size={20} color="#fff" />
                            <Text style={styles.buttonText}>401 Unauthorized</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ошибки валидации</Text>
                    
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={[styles.button, styles.warningButton]}
                            onPress={triggerValidationError}
                        >
                            <Icon name="warning" size={20} color="#fff" />
                            <Text style={styles.buttonText}>Ошибка валидации</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Сетевые ошибки</Text>
                    
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={[styles.button, styles.infoButton]}
                            onPress={triggerNetworkError}
                        >
                            <Icon name="wifi-off" size={20} color="#fff" />
                            <Text style={styles.buttonText}>Ошибка сети</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Программные ошибки</Text>
                    
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={[styles.button, styles.secondaryButton]}
                            onPress={triggerProgramError}
                        >
                            <Icon name="bug-report" size={20} color="#fff" />
                            <Text style={styles.buttonText}>Программная ошибка</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.outlineButton]}
                            onPress={goToNotFound}
                        >
                            <Icon name="error-outline" size={20} color="#3f51b5" />
                            <Text style={[styles.buttonText, styles.outlineButtonText]}>
                                404 - Страница не найдена
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.infoCard}>
                    <Icon name="info" size={20} color="#2196f3" />
                    <Text style={styles.infoText}>
                        Все ошибки перехватываются глобальным обработчиком и отображаются через систему уведомлений.
                    </Text>
                </View>

                {/* Компонент для отображения ошибок */}
                <ErrorAlert
                    visible={errorAlertVisible}
                    title="Произошла ошибка"
                    message={error || ''}
                    details={errorDetails || undefined}
                    onClose={() => setErrorAlertVisible(false)}
                    autoClose={true}
                />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 12,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        gap: 12,
    },
    inputContainer: {
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 8,
        gap: 8,
    },
    errorButton: {
        backgroundColor: '#f44336',
    },
    warningButton: {
        backgroundColor: '#ff9800',
    },
    infoButton: {
        backgroundColor: '#2196f3',
    },
    secondaryButton: {
        backgroundColor: '#9c27b0',
    },
    outlineButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#3f51b5',
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    outlineButtonText: {
        color: '#3f51b5',
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e3f2fd',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#2196f3',
        lineHeight: 20,
    },
});

export default ErrorDemoScreen;
```

## 9. Обновление навигации

**src/App.tsx:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

import { AuthProvider } from './contexts/AuthContext';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';
import HomeScreen from './screens/HomeScreen';
import UsersScreen from './screens/UsersScreen';
import UsersAdvancedScreen from './screens/UsersAdvancedScreen';
import UsersServerPaginationScreen from './screens/UsersServerPaginationScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import AuthScreen from './screens/AuthScreen';
import SignScreen from './screens/SignScreen';
import LoadingDemoScreen from './screens/LoadingDemoScreen';
import ErrorDemoScreen from './screens/ErrorDemoScreen';
import NotFoundScreen from './screens/NotFoundScreen';
import ServerErrorScreen from './screens/ServerErrorScreen';
import Header from './components/Header';

export type RootStackParamList = {
    Home: undefined;
    Users: undefined;
    UsersAdvanced: undefined;
    UsersServerPagination: undefined;
    Profile: { userId: number };
    Edit: { userId: number };
    Auth: { registered?: boolean; returnUrl?: string } | undefined;
    Sign: undefined;
    LoadingDemo: undefined;
    ErrorDemo: undefined;
    NotFound: undefined;
    ServerError: { error?: string; message?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
    return (
        <SafeAreaProvider>
            <StatusBar backgroundColor="#3f51b5" barStyle="light-content" />
            <ErrorBoundary>
                <AuthProvider>
                    <NavigationContainer>
                        <LoadingOverlay text="Загрузка..." showProgress />
                        <Stack.Navigator
                            screenOptions={({ navigation, route }) => ({
                                header: () => (
                                    <Header
                                        navigation={navigation}
                                        showBack={route.name !== 'Home'}
                                        title={route.name === 'Home' ? 'Главная' : 
                                               route.name === 'Users' ? 'Пользователи' :
                                               route.name === 'UsersAdvanced' ? 'Расширенный' :
                                               route.name === 'UsersServerPagination' ? 'Серверная пагинация' :
                                               route.name === 'Profile' ? 'Профиль' :
                                               route.name === 'Edit' ? 'Редактирование' :
                                               route.name === 'Auth' ? 'Вход' : 
                                               route.name === 'Sign' ? 'Регистрация' : 
                                               route.name === 'LoadingDemo' ? 'Демо лоадера' :
                                               route.name === 'ErrorDemo' ? 'Демо ошибок' :
                                               route.name === 'NotFound' ? '404' :
                                               route.name === 'ServerError' ? '500' : 
                                               'SampleApp'}
                                    />
                                ),
                            })}
                        >
                            <Stack.Screen name="Home" component={HomeScreen} />
                            <Stack.Screen name="Users" component={UsersScreen} />
                            <Stack.Screen name="UsersAdvanced" component={UsersAdvancedScreen} />
                            <Stack.Screen name="UsersServerPagination" component={UsersServerPaginationScreen} />
                            <Stack.Screen name="Profile" component={ProfileScreen} />
                            <Stack.Screen name="Edit" component={EditProfileScreen} />
                            <Stack.Screen name="Auth" component={AuthScreen} />
                            <Stack.Screen name="Sign" component={SignScreen} />
                            <Stack.Screen name="LoadingDemo" component={LoadingDemoScreen} />
                            <Stack.Screen name="ErrorDemo" component={ErrorDemoScreen} />
                            <Stack.Screen name="NotFound" component={NotFoundScreen} />
                            <Stack.Screen name="ServerError" component={ServerErrorScreen} />
                        </Stack.Navigator>
                    </NavigationContainer>
                </AuthProvider>
            </ErrorBoundary>
        </SafeAreaProvider>
    );
};

export default App;
```

## 10. Обновление HomeScreen с ссылкой на демо ошибок

**src/screens/HomeScreen.tsx:**
```tsx
// Добавить в featuresContainer:
<TouchableOpacity
    style={styles.featureItem}
    onPress={() => navigation.navigate('ErrorDemo')}
>
    <Icon name="bug-report" size={24} color="#f44336" />
    <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>Демо ошибок</Text>
        <Text style={styles.featureDescription}>
            Тестирование обработки различных ошибок
        </Text>
    </View>
    <Icon name="chevron-right" size={24} color="#999" />
</TouchableOpacity>
```

## Тестирование функциональности

1. **HTTP ошибки**:
   - 404 - запрос несуществующего пользователя
   - 401 - попытка доступа без авторизации
   - Ошибки валидации при создании пользователя

2. **Сетевые ошибки**:
   - Имитация отсутствия соединения с сервером
   - Появляется соответствующее уведомление

3. **Программные ошибки**:
   - Генерация исключения в коде
   - ErrorBoundary показывает страницу с ошибкой

4. **404 страница**:
   - Переход на несуществующий экран
   - Отображается красивая страница с ошибкой

5. **500 страница**:
   - Имитация ошибки сервера
   - Показывается с деталями ошибки

## Сравнение Angular vs React Native подходов для обработки ошибок

| Angular | React Native |
|---------|--------------|
| `HttpInterceptorFn` | Axios error interceptor |
| `ErrorHandler` класс | `ErrorBoundary` компонент |
| `MatSnackBar` | `Alert.alert()` + кастомные модалки |
| Кастомные страницы ошибок | Отдельные экраны для ошибок |
| `catchError` в RxJS | try/catch в async/await |
| `throwError` | `Promise.reject` |

## Команды Git

```bash
# Проверка статуса
git status

# Создание ветки sprint11
git checkout -b sprint11

# Добавление всех изменений
git add -A

# Создание коммита
git commit -m "Выполнен sprint11: Обработка ошибок"

# Переключение на master
git checkout master

# Ребейз sprint11 в master
git rebase sprint11
```

Эта реализация полностью воспроизводит функциональность Angular на React Native с:
- Глобальным перехватчиком ошибок для HTTP запросов
- Централизованным сервисом обработки ошибок
- ErrorBoundary для критических ошибок
- Красивыми экранами для 404 и 500 ошибок
- Демонстрационным экраном со всеми типами ошибок
- Интеграцией с системой уведомлений
=== React-Native-12.-Смена-темы-на-React-Native.md ===
В этом спринте мы реализуем переключение между светлой и темной темой приложения с сохранением выбора пользователя.

## 1. Установка дополнительных зависимостей

```bash
npm install react-native-vector-icons
npm install @react-native-async-storage/async-storage
npm install react-native-safe-area-context
npm install react-native-screens
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-gesture-handler
npm install react-native-paper

# Для iOS
cd ios && pod install && cd ..
```

## 2. Создание контекста для управления темой

**src/contexts/ThemeContext.tsx:**
```tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceLight: string;
    text: string;
    textSecondary: string;
    textHint: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    card: string;
    divider: string;
    icon: string;
    iconActive: string;
    shadow: string;
}

export interface ThemeContextType {
    mode: ThemeMode;
    isDark: boolean;
    colors: ThemeColors;
    toggleTheme: () => void;
    setMode: (mode: ThemeMode) => void;
}

const lightColors: ThemeColors = {
    primary: '#3f51b5',
    primaryLight: '#757de8',
    primaryDark: '#002984',
    secondary: '#f50057',
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceLight: '#fafafa',
    text: '#333333',
    textSecondary: '#666666',
    textHint: '#999999',
    border: '#e0e0e0',
    error: '#f44336',
    success: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3',
    card: '#ffffff',
    divider: '#f0f0f0',
    icon: '#666666',
    iconActive: '#3f51b5',
    shadow: '#000000',
};

const darkColors: ThemeColors = {
    primary: '#90caf9',
    primaryLight: '#e3f2fd',
    primaryDark: '#42a5f5',
    secondary: '#f48fb1',
    background: '#121212',
    surface: '#1e1e1e',
    surfaceLight: '#2d2d2d',
    text: '#ffffff',
    textSecondary: '#b0b0b0',
    textHint: '#808080',
    border: '#333333',
    error: '#f44336',
    success: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3',
    card: '#2d2d2d',
    divider: '#404040',
    icon: '#b0b0b0',
    iconActive: '#90caf9',
    shadow: '#000000',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>('system');
    const [isDark, setIsDark] = useState(false);

    // Загрузка сохраненной темы
    useEffect(() => {
        loadThemeMode();
    }, []);

    const loadThemeMode = async () => {
        try {
            const savedMode = await AsyncStorage.getItem('themeMode');
            if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
                setMode(savedMode as ThemeMode);
            }
        } catch (error) {
            console.error('Error loading theme mode:', error);
        }
    };

    // Обновление темы при изменении mode или системной темы
    useEffect(() => {
        saveThemeMode(mode);
        
        if (mode === 'system') {
            setIsDark(systemColorScheme === 'dark');
        } else {
            setIsDark(mode === 'dark');
        }
    }, [mode, systemColorScheme]);

    const saveThemeMode = async (newMode: ThemeMode) => {
        try {
            await AsyncStorage.setItem('themeMode', newMode);
        } catch (error) {
            console.error('Error saving theme mode:', error);
        }
    };

    const toggleTheme = () => {
        if (mode === 'system') {
            setMode(isDark ? 'light' : 'dark');
        } else {
            setMode(isDark ? 'light' : 'dark');
        }
    };

    const colors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider
            value={{
                mode,
                isDark,
                colors,
                toggleTheme,
                setMode,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};
```

## 3. Создание компонента ThemeToggle

**src/components/ThemeToggle.tsx**
```tsx
import React, { useEffect, useRef } from 'react';
import {
    TouchableOpacity,
    StyleSheet,
    Animated,
    View,
    Text
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
    size?: 'small' | 'medium' | 'large';
    showLabel?: boolean;
    onPress?: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
    size = 'medium',
    showLabel = false,
    onPress
}) => {
    const { isDark, toggleTheme, colors } = useTheme();
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(rotateAnim, {
            toValue: isDark ? 1 : 0,
            useNativeDriver: true,
            friction: 8,
        }).start();
    }, [isDark]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const getSize = () => {
        switch (size) {
            case 'small':
                return 32;
            case 'medium':
                return 40;
            case 'large':
                return 48;
            default:
                return 40;
        }
    };

    const getIconSize = () => {
        switch (size) {
            case 'small':
                return 18;
            case 'medium':
                return 22;
            case 'large':
                return 26;
            default:
                return 22;
        }
    };

    const buttonSize = getSize();
    const iconSize = getIconSize();

    const handlePress = () => {
        toggleTheme();
        onPress?.();
    };

    const buttonContent = (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Icon
                name={isDark ? 'light-mode' : 'dark-mode'}
                size={iconSize}
                color={colors.primary}
            />
        </Animated.View>
    );

    if (showLabel) {
        return (
            <TouchableOpacity
                style={[styles.containerWithLabel, { borderColor: colors.border }]}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                {buttonContent}
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {isDark ? 'Темная тема' : 'Светлая тема'}
                </Text>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    width: buttonSize,
                    height: buttonSize,
                    borderRadius: buttonSize / 2,
                }
            ]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            {buttonContent}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    containerWithLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderRadius: 20,
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
    },
});
```

## 4. Создание компонента ThemeSettings

**src/components/ThemeSettings.tsx**
```tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    Switch
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';

interface ThemeSettingsProps {
    visible: boolean;
    onClose: () => void;
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({ visible, onClose }) => {
    const { mode, setMode, isDark, colors } = useTheme();
    const [followSystem, setFollowSystem] = useState(mode === 'system');

    const handleModeChange = (newMode: ThemeMode) => {
        setMode(newMode);
        setFollowSystem(newMode === 'system');
    };

    const handleSystemChange = (value: boolean) => {
        setFollowSystem(value);
        if (value) {
            setMode('system');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modal, { backgroundColor: colors.surface }]}>
                    <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                        <Text style={[styles.title, { color: colors.text }]}>
                            Настройки темы
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {/* Предпросмотр темы */}
                        <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
                            <View style={[styles.previewIcon, { backgroundColor: colors.primaryLight }]}>
                                <Icon
                                    name={isDark ? 'dark-mode' : 'light-mode'}
                                    size={32}
                                    color={colors.primary}
                                />
                            </View>
                            <View>
                                <Text style={[styles.previewTitle, { color: colors.text }]}>
                                    {isDark ? 'Темная тема' : 'Светлая тема'}
                                </Text>
                                <Text style={[styles.previewSubtitle, { color: colors.textSecondary }]}>
                                    Текущий режим: {mode === 'system' ? 'системный' : mode === 'dark' ? 'темный' : 'светлый'}
                                </Text>
                            </View>
                        </View>

                        {/* Системная тема */}
                        <View style={[styles.optionCard, { backgroundColor: colors.card }]}>
                            <View style={styles.optionHeader}>
                                <View style={styles.optionTitleContainer}>
                                    <Icon name="settings-suggest" size={20} color={colors.primary} />
                                    <Text style={[styles.optionTitle, { color: colors.text }]}>
                                        Системная тема
                                    </Text>
                                </View>
                                <Switch
                                    value={followSystem}
                                    onValueChange={handleSystemChange}
                                    trackColor={{ false: colors.border, true: colors.primary }}
                                    thumbColor={colors.surface}
                                />
                            </View>
                            <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                                Автоматически следовать системным настройкам темы
                            </Text>
                        </View>

                        {/* Ручной выбор темы */}
                        {!followSystem && (
                            <View style={[styles.optionsContainer, { backgroundColor: colors.card }]}>
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        { borderBottomColor: colors.divider },
                                        mode === 'light' && [styles.optionSelected, { backgroundColor: colors.primaryLight }]
                                    ]}
                                    onPress={() => handleModeChange('light')}
                                >
                                    <View style={styles.optionItemContent}>
                                        <Icon
                                            name="light-mode"
                                            size={20}
                                            color={mode === 'light' ? colors.primary : colors.textSecondary}
                                        />
                                        <Text
                                            style={[
                                                styles.optionItemText,
                                                { color: mode === 'light' ? colors.primary : colors.text }
                                            ]}
                                        >
                                            Светлая тема
                                        </Text>
                                    </View>
                                    {mode === 'light' && (
                                        <Icon name="check" size={20} color={colors.primary} />
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        mode === 'dark' && [styles.optionSelected, { backgroundColor: colors.primaryLight }]
                                    ]}
                                    onPress={() => handleModeChange('dark')}
                                >
                                    <View style={styles.optionItemContent}>
                                        <Icon
                                            name="dark-mode"
                                            size={20}
                                            color={mode === 'dark' ? colors.primary : colors.textSecondary}
                                        />
                                        <Text
                                            style={[
                                                styles.optionItemText,
                                                { color: mode === 'dark' ? colors.primary : colors.text }
                                            ]}
                                        >
                                            Темная тема
                                        </Text>
                                    </View>
                                    {mode === 'dark' && (
                                        <Icon name="check" size={20} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Цветовая схема */}
                        <View style={[styles.colorsCard, { backgroundColor: colors.card }]}>
                            <Text style={[styles.colorsTitle, { color: colors.text }]}>
                                Цветовая схема
                            </Text>
                            <View style={styles.colorPalette}>
                                <View style={[styles.colorItem, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.colorLabel}>Primary</Text>
                                </View>
                                <View style={[styles.colorItem, { backgroundColor: colors.secondary }]}>
                                    <Text style={styles.colorLabel}>Secondary</Text>
                                </View>
                                <View style={[styles.colorItem, { backgroundColor: colors.success }]}>
                                    <Text style={styles.colorLabel}>Success</Text>
                                </View>
                                <View style={[styles.colorItem, { backgroundColor: colors.warning }]}>
                                    <Text style={styles.colorLabel}>Warning</Text>
                                </View>
                                <View style={[styles.colorItem, { backgroundColor: colors.error }]}>
                                    <Text style={styles.colorLabel}>Error</Text>
                                </View>
                            </View>
                        </View>

                        {/* Информация */}
                        <View style={[styles.infoCard, { backgroundColor: colors.info + '20' }]}>
                            <Icon name="info" size={20} color={colors.info} />
                            <Text style={[styles.infoText, { color: colors.info }]}>
                                Тема сохраняется в памяти устройства и восстанавливается при перезапуске приложения.
                            </Text>
                        </View>
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: colors.divider }]}>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: colors.primary }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.buttonText, { color: '#fff' }]}>Готово</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modal: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        padding: 16,
    },
    previewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    previewIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    previewSubtitle: {
        fontSize: 12,
    },
    optionCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    optionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    optionDescription: {
        fontSize: 12,
        marginLeft: 28,
    },
    optionsContainer: {
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    optionItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    optionItemText: {
        fontSize: 14,
    },
    optionSelected: {
        backgroundColor: 'rgba(63, 81, 181, 0.1)',
    },
    colorsCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    colorsTitle: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 12,
    },
    colorPalette: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    colorItem: {
        width: 60,
        height: 60,
        borderRadius: 8,
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: 4,
    },
    colorLabel: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '500',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
    },
    button: {
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
```

## 5. Обновление компонента Header с переключателем темы

**src/components/Header.tsx**
```tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    StatusBar,
    Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { ThemeSettings } from './ThemeSettings';

interface HeaderProps {
    navigation: any;
    showBack?: boolean;
    title: string;
}

const Header: React.FC<HeaderProps> = ({ navigation, showBack, title }) => {
    const { currentUser, logout } = useAuth();
    const { colors } = useTheme();
    const [menuVisible, setMenuVisible] = useState(false);
    const [themeSettingsVisible, setThemeSettingsVisible] = useState(false);

    const handleLogout = async () => {
        setMenuVisible(false);
        await logout();
        navigation.replace('Auth');
    };

    const handleProfilePress = () => {
        setMenuVisible(false);
        if (currentUser) {
            navigation.navigate('Profile', { userId: currentUser.id });
        }
    };

    const handleEditPress = () => {
        setMenuVisible(false);
        if (currentUser) {
            navigation.navigate('Edit', { userId: currentUser.id });
        }
    };

    const handleSettingsPress = () => {
        setMenuVisible(false);
        setThemeSettingsVisible(true);
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.primary }]}>
            <View style={styles.header}>
                <View style={styles.leftContainer}>
                    {showBack ? (
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.iconButton}
                        >
                            <Icon name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                    ) : null}
                    <Text style={[styles.title, { color: '#fff' }]}>{title}</Text>
                </View>

                <View style={styles.rightContainer}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Home')}
                        style={styles.iconButton}
                    >
                        <Icon name="home" size={24} color="#fff" />
                    </TouchableOpacity>

                    {/* Переключатель темы */}
                    <ThemeToggle size="small" />

                    {currentUser && (
                        <>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Users')}
                                style={styles.iconButton}
                            >
                                <Icon name="people" size={24} color="#fff" />
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                onPress={() => setMenuVisible(true)}
                                style={styles.iconButton}
                            >
                                <Icon name="account-circle" size={24} color="#fff" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            {/* Меню профиля */}
            <Modal
                visible={menuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <TouchableOpacity
                    style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
                    activeOpacity={1}
                    onPress={() => setMenuVisible(false)}
                >
                    <View style={[styles.menuContainer, { backgroundColor: colors.surface }]}>
                        <View style={[styles.menuHeader, { borderBottomColor: colors.divider }]}>
                            <Icon name="account-circle" size={40} color={colors.primary} />
                            <View style={styles.userInfo}>
                                <Text style={[styles.userName, { color: colors.text }]}>
                                    {currentUser?.name || 'Пользователь'}
                                </Text>
                                <Text style={[styles.userLogin, { color: colors.textSecondary }]}>
                                    @{currentUser?.login}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: colors.divider }]}
                            onPress={handleProfilePress}
                        >
                            <Icon name="person" size={20} color={colors.textSecondary} />
                            <Text style={[styles.menuItemText, { color: colors.text }]}>Профиль</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: colors.divider }]}
                            onPress={handleEditPress}
                        >
                            <Icon name="edit" size={20} color={colors.textSecondary} />
                            <Text style={[styles.menuItemText, { color: colors.text }]}>Редактировать</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: colors.divider }]}
                            onPress={handleSettingsPress}
                        >
                            <Icon name="palette" size={20} color={colors.textSecondary} />
                            <Text style={[styles.menuItemText, { color: colors.text }]}>Настройки темы</Text>
                        </TouchableOpacity>

                        <View style={[styles.menuDivider, { backgroundColor: colors.divider }]} />

                        <TouchableOpacity
                            style={[styles.menuItem, styles.logoutItem]}
                            onPress={handleLogout}
                        >
                            <Icon name="logout" size={20} color={colors.error} />
                            <Text style={[styles.menuItemText, { color: colors.error }]}>Выход</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Настройки темы */}
            <ThemeSettings
                visible={themeSettingsVisible}
                onClose={() => setThemeSettingsVisible(false)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        zIndex: 1000,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '500',
        marginLeft: 8,
    },
    iconButton: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
    },
    menuContainer: {
        borderRadius: 12,
        marginTop: Platform.OS === 'ios' ? 90 : 70,
        marginRight: 16,
        minWidth: 200,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    menuHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    userInfo: {
        marginLeft: 12,
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
    },
    userLogin: {
        fontSize: 12,
        marginTop: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        gap: 12,
    },
    menuItemText: {
        fontSize: 14,
    },
    menuDivider: {
        height: 1,
        marginVertical: 8,
    },
    logoutItem: {
        paddingVertical: 12,
    },
});

export default Header;
```

## 6. Создание экрана настроек темы

**src/screens/ThemeSettingsScreen.tsx**
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';

interface ThemeSettingsScreenProps {
    navigation: any;
}

const ThemeSettingsScreen: React.FC<ThemeSettingsScreenProps> = ({ navigation }) => {
    const { mode, setMode, isDark, colors } = useTheme();

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                {/* Предпросмотр темы */}
                <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
                    <View style={[styles.previewIcon, { backgroundColor: colors.primaryLight }]}>
                        <Icon
                            name={isDark ? 'dark-mode' : 'light-mode'}
                            size={48}
                            color={colors.primary}
                        />
                    </View>
                    <Text style={[styles.previewTitle, { color: colors.text }]}>
                        {isDark ? 'Темная тема' : 'Светлая тема'}
                    </Text>
                    <Text style={[styles.previewSubtitle, { color: colors.textSecondary }]}>
                        Текущий режим: {mode === 'system' ? 'системный' : mode === 'dark' ? 'темный' : 'светлый'}
                    </Text>
                </View>

                {/* Переключатель темы */}
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>
                            Быстрое переключение
                        </Text>
                        <ThemeToggle size="medium" showLabel />
                    </View>
                </View>

                {/* Режимы темы */}
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                        Режимы темы
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.optionItem,
                            { borderBottomColor: colors.divider },
                            mode === 'system' && [styles.optionSelected, { backgroundColor: colors.primaryLight }]
                        ]}
                        onPress={() => setMode('system')}
                    >
                        <View style={styles.optionItemContent}>
                            <Icon
                                name="settings-suggest"
                                size={24}
                                color={mode === 'system' ? colors.primary : colors.textSecondary}
                            />
                            <View>
                                <Text style={[styles.optionTitle, { color: colors.text }]}>
                                    Системная
                                </Text>
                                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                                    Следовать системным настройкам
                                </Text>
                            </View>
                        </View>
                        {mode === 'system' && (
                            <Icon name="check" size={20} color={colors.primary} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.optionItem,
                            { borderBottomColor: colors.divider },
                            mode === 'light' && [styles.optionSelected, { backgroundColor: colors.primaryLight }]
                        ]}
                        onPress={() => setMode('light')}
                    >
                        <View style={styles.optionItemContent}>
                            <Icon
                                name="light-mode"
                                size={24}
                                color={mode === 'light' ? colors.primary : colors.textSecondary}
                            />
                            <View>
                                <Text style={[styles.optionTitle, { color: colors.text }]}>
                                    Светлая
                                </Text>
                                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                                    Всегда использовать светлую тему
                                </Text>
                            </View>
                        </View>
                        {mode === 'light' && (
                            <Icon name="check" size={20} color={colors.primary} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.optionItem,
                            mode === 'dark' && [styles.optionSelected, { backgroundColor: colors.primaryLight }]
                        ]}
                        onPress={() => setMode('dark')}
                    >
                        <View style={styles.optionItemContent}>
                            <Icon
                                name="dark-mode"
                                size={24}
                                color={mode === 'dark' ? colors.primary : colors.textSecondary}
                            />
                            <View>
                                <Text style={[styles.optionTitle, { color: colors.text }]}>
                                    Темная
                                </Text>
                                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                                    Всегда использовать темную тему
                                </Text>
                            </View>
                        </View>
                        {mode === 'dark' && (
                            <Icon name="check" size={20} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Цветовая схема */}
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                        Цветовая схема
                    </Text>

                    <View style={styles.colorGrid}>
                        <View style={styles.colorRow}>
                            <View style={[styles.colorItem, { backgroundColor: colors.primary }]}>
                                <Text style={styles.colorLabel}>Primary</Text>
                            </View>
                            <View style={[styles.colorItem, { backgroundColor: colors.secondary }]}>
                                <Text style={styles.colorLabel}>Secondary</Text>
                            </View>
                        </View>
                        <View style={styles.colorRow}>
                            <View style={[styles.colorItem, { backgroundColor: colors.success }]}>
                                <Text style={styles.colorLabel}>Success</Text>
                            </View>
                            <View style={[styles.colorItem, { backgroundColor: colors.warning }]}>
                                <Text style={styles.colorLabel}>Warning</Text>
                            </View>
                        </View>
                        <View style={styles.colorRow}>
                            <View style={[styles.colorItem, { backgroundColor: colors.error }]}>
                                <Text style={styles.colorLabel}>Error</Text>
                            </View>
                            <View style={[styles.colorItem, { backgroundColor: colors.info }]}>
                                <Text style={styles.colorLabel}>Info</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Предпросмотр компонентов */}
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                        Предпросмотр компонентов
                    </Text>

                    <View style={styles.previewContainer}>
                        <TouchableOpacity
                            style={[styles.previewButton, { backgroundColor: colors.primary }]}
                        >
                            <Text style={styles.previewButtonText}>Primary Button</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.previewButton, { backgroundColor: colors.secondary }]}
                        >
                            <Text style={styles.previewButtonText}>Secondary Button</Text>
                        </TouchableOpacity>

                        <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.previewCardText, { color: colors.text }]}>
                                Карточка с текстом
                            </Text>
                            <Text style={[styles.previewCardSubtext, { color: colors.textSecondary }]}>
                                Вторичный текст для демонстрации
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    previewCard: {
        alignItems: 'center',
        padding: 24,
        borderRadius: 12,
        marginBottom: 16,
    },
    previewIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    previewTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    previewSubtitle: {
        fontSize: 14,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    optionItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    optionDescription: {
        fontSize: 12,
    },
    optionSelected: {
        borderRadius: 8,
        marginHorizontal: -8,
        paddingHorizontal: 8,
    },
    colorGrid: {
        gap: 8,
    },
    colorRow: {
        flexDirection: 'row',
        gap: 8,
    },
    colorItem: {
        flex: 1,
        height: 60,
        borderRadius: 8,
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: 4,
    },
    colorLabel: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '500',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    previewContainer: {
        gap: 12,
    },
    previewButton: {
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    previewButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    previewCard: {
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
    },
    previewCardText: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    previewCardSubtext: {
        fontSize: 12,
    },
});

export default ThemeSettingsScreen;
```

## 7. Обновление навигации

**src/App.tsx:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';
import HomeScreen from './screens/HomeScreen';
import UsersScreen from './screens/UsersScreen';
import UsersAdvancedScreen from './screens/UsersAdvancedScreen';
import UsersServerPaginationScreen from './screens/UsersServerPaginationScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import AuthScreen from './screens/AuthScreen';
import SignScreen from './screens/SignScreen';
import LoadingDemoScreen from './screens/LoadingDemoScreen';
import ErrorDemoScreen from './screens/ErrorDemoScreen';
import ThemeSettingsScreen from './screens/ThemeSettingsScreen';
import NotFoundScreen from './screens/NotFoundScreen';
import ServerErrorScreen from './screens/ServerErrorScreen';
import Header from './components/Header';

export type RootStackParamList = {
    Home: undefined;
    Users: undefined;
    UsersAdvanced: undefined;
    UsersServerPagination: undefined;
    Profile: { userId: number };
    Edit: { userId: number };
    Auth: { registered?: boolean; returnUrl?: string } | undefined;
    Sign: undefined;
    LoadingDemo: undefined;
    ErrorDemo: undefined;
    ThemeSettings: undefined;
    NotFound: undefined;
    ServerError: { error?: string; message?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
    return (
        <SafeAreaProvider>
            <StatusBar backgroundColor="#3f51b5" barStyle="light-content" />
            <ErrorBoundary>
                <ThemeProvider>
                    <AuthProvider>
                        <NavigationContainer>
                            <LoadingOverlay text="Загрузка..." showProgress />
                            <Stack.Navigator
                                screenOptions={({ navigation, route }) => ({
                                    header: () => (
                                        <Header
                                            navigation={navigation}
                                            showBack={route.name !== 'Home'}
                                            title={route.name === 'Home' ? 'Главная' : 
                                                   route.name === 'Users' ? 'Пользователи' :
                                                   route.name === 'UsersAdvanced' ? 'Расширенный' :
                                                   route.name === 'UsersServerPagination' ? 'Серверная пагинация' :
                                                   route.name === 'Profile' ? 'Профиль' :
                                                   route.name === 'Edit' ? 'Редактирование' :
                                                   route.name === 'Auth' ? 'Вход' : 
                                                   route.name === 'Sign' ? 'Регистрация' : 
                                                   route.name === 'LoadingDemo' ? 'Демо лоадера' :
                                                   route.name === 'ErrorDemo' ? 'Демо ошибок' :
                                                   route.name === 'ThemeSettings' ? 'Настройки темы' :
                                                   route.name === 'NotFound' ? '404' :
                                                   route.name === 'ServerError' ? '500' : 
                                                   'SampleApp'}
                                        />
                                    ),
                                })}
                            >
                                <Stack.Screen name="Home" component={HomeScreen} />
                                <Stack.Screen name="Users" component={UsersScreen} />
                                <Stack.Screen name="UsersAdvanced" component={UsersAdvancedScreen} />
                                <Stack.Screen name="UsersServerPagination" component={UsersServerPaginationScreen} />
                                <Stack.Screen name="Profile" component={ProfileScreen} />
                                <Stack.Screen name="Edit" component={EditProfileScreen} />
                                <Stack.Screen name="Auth" component={AuthScreen} />
                                <Stack.Screen name="Sign" component={SignScreen} />
                                <Stack.Screen name="LoadingDemo" component={LoadingDemoScreen} />
                                <Stack.Screen name="ErrorDemo" component={ErrorDemoScreen} />
                                <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
                                <Stack.Screen name="NotFound" component={NotFoundScreen} />
                                <Stack.Screen name="ServerError" component={ServerErrorScreen} />
                            </Stack.Navigator>
                        </NavigationContainer>
                    </AuthProvider>
                </ThemeProvider>
            </ErrorBoundary>
        </SafeAreaProvider>
    );
};

export default App;
```

## 8. Обновление HomeScreen с ссылкой на настройки темы

**src/screens/HomeScreen.tsx:**
```tsx
// Добавить в featuresContainer:
<TouchableOpacity
    style={styles.featureItem}
    onPress={() => navigation.navigate('ThemeSettings')}
>
    <Icon name="palette" size={24} color={colors.primary} />
    <View style={styles.featureTextContainer}>
        <Text style={[styles.featureTitle, { color: colors.text }]}>Настройки темы</Text>
        <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
            Настройка внешнего вида приложения
        </Text>
    </View>
    <Icon name="chevron-right" size={24} color={colors.textSecondary} />
</TouchableOpacity>
```

## 9. Создание хука useThemedStyles

**src/hooks/useThemedStyles.ts**
```tsx
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export const useThemedStyles = <T extends StyleSheet.NamedStyles<T>>(
    styleFactory: (colors: ReturnType<typeof useTheme>['colors']) => T
) => {
    const { colors } = useTheme();
    return useMemo(() => styleFactory(colors), [colors, styleFactory]);
};
```

## Тестирование функциональности

1. **Переключение темы**:
   - Нажмите на иконку темы в хедере
   - Тема должна измениться
   - Все цвета должны адаптироваться

2. **Сохранение темы**:
   - Переключите тему на темную
   - Закройте и перезапустите приложение
   - Тема должна остаться темной

3. **Системная тема**:
   - В настройках включите "Системная"
   - Тема будет меняться при изменении системных настроек

4. **Настройки темы**:
   - Перейдите на экран настроек темы
   - Попробуйте разные режимы
   - Посмотрите предпросмотр компонентов

5. **Анимации**:
   - Иконка темы анимируется при переключении
   - Плавные переходы между темами

## Сравнение Angular vs React Native подходов для смены темы

| Angular | React Native |
|---------|--------------|
| CSS классы для переключения | Контекст с цветами |
| `localStorage` | `AsyncStorage` |
| `(click)` обработчик | `onPress` |
| Динамическая смена темы | `ThemeContext` провайдер |
| Material Design темы | Кастомные цветовые схемы |
| `Renderer2` для классов | `useEffect` для обновления |

## Команды Git

```bash
# Проверка статуса
git status

# Создание ветки sprint12
git checkout -b sprint12

# Добавление всех изменений
git add -A

# Создание коммита
git commit -m "Выполнен sprint12: Смена темы приложения"

# Переключение на master
git checkout master

# Ребейз sprint12 в master
git rebase sprint12
```

Эта реализация полностью воспроизводит функциональность Angular на React Native с:
- Переключением между светлой и темной темой
- Сохранением выбранной темы в AsyncStorage
- Поддержкой системных настроек
- Плавными анимациями при переключении
- Настройками темы с предпросмотром
- Интеграцией со всеми компонентами
=== React-Native-1.-Создание-приложения.md ===
В этом спринте мы создадим базовое React Native приложение с аналогичной функциональностью Angular проекта.

## 1. Создание проекта React Native

```bash
# Создание нового React Native проекта с TypeScript
npx react-native init SampleAppRn --template react-native-template-typescript

# Переход в директорию проекта
cd SampleAppRn

# Установка дополнительных зависимостей
npm install axios
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-safe-area-context react-native-screens
npm install react-native-vector-icons
npm install react-native-paper
npm install react-native-gesture-handler

# Для iOS дополнительно нужно установить pods
cd ios && pod install && cd ..
```

## 2. Настройка структуры проекта

```
src/
  ├── components/
  │   ├── Header.tsx
  │   └── LoadingSpinner.tsx
  ├── screens/
  │   ├── HomeScreen.tsx
  │   └── UsersScreen.tsx
  ├── models/
  │   └── user.entity.ts
  ├── services/
  │   ├── api.config.ts
  │   └── users.service.ts
  ├── interfaces/
  │   └── base.repository.ts
  ├── environments/
  │   └── environment.ts
  └── App.tsx
```

## 3. Настройка окружения

**src/environments/environment.ts:**
```typescript
export const environment = {
    api: 'http://localhost:5071/api/v1'
};

// Для Android эмулятора используйте IP 10.0.2.2 для localhost
export const environmentAndroid = {
    api: 'http://10.0.2.2:5071/api/v1'
};

// Для физического устройства используйте IP вашего компьютера
export const environmentDevice = {
    api: 'http://192.168.1.x:5071/api/v1' // Замените на ваш IP
};
```

## 4. Создание модели данных

**src/models/user.entity.ts:**
```typescript
export default interface User {
    id: number;
    name: string;
    login?: string;
    email?: string;
}
```

## 5. Создание интерфейсов

**src/interfaces/base.repository.ts:**
```typescript
export interface BaseRepository<T> {
    get(id: number): Promise<T>;
    create(object: T): Promise<T>;
    del(id: number): Promise<boolean>;
    update(t: T): Promise<T>;
    getAll(): Promise<T[]>;
}
```

**src/interfaces/user.repository.ts:**
```typescript
import User from '../models/user.entity';
import { BaseRepository } from './base.repository';

export interface UserRepository extends BaseRepository<User> {}
```

## 6. Создание сервиса с Axios

**src/services/api.config.ts:**
```typescript
import axios from 'axios';
import { Platform } from 'react-native';
import { environment, environmentAndroid } from '../environments/environment';

// Выбор правильного URL в зависимости от платформы
const getBaseUrl = () => {
    if (Platform.OS === 'android') {
        return environmentAndroid.api;
    }
    return environment.api;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

export default api;
```

**src/services/users.service.ts:**
```typescript
import User from '../models/user.entity';
import { UserRepository } from '../interfaces/user.repository';
import api from './api.config';

class UsersService implements UserRepository {
    async getAll(): Promise<User[]> {
        try {
            const response = await api.get<User[]>('/Users');
            return response.data;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    }

    async get(id: number): Promise<User> {
        try {
            const response = await api.get<User>(`/Users/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching user ${id}:`, error);
            throw error;
        }
    }

    async create(user: User): Promise<User> {
        try {
            const response = await api.post<User>('/Users', user);
            return response.data;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async update(user: User): Promise<User> {
        try {
            const response = await api.put<User>(`/Users/${user.id}`, user);
            return response.data;
        } catch (error) {
            console.error(`Error updating user ${user.id}:`, error);
            throw error;
        }
    }

    async del(id: number): Promise<boolean> {
        try {
            await api.delete(`/Users/${id}`);
            return true;
        } catch (error) {
            console.error(`Error deleting user ${id}:`, error);
            throw error;
        }
    }
}

export const usersService = new UsersService();
```

## 7. Создание компонента Header

**src/components/Header.tsx:**
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface HeaderProps {
    title: string;
    onHomePress?: () => void;
    onUsersPress?: () => void;
    showBackButton?: boolean;
    onBackPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({
    title,
    onHomePress,
    onUsersPress,
    showBackButton,
    onBackPress
}) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.leftContainer}>
                    {showBackButton ? (
                        <TouchableOpacity onPress={onBackPress} style={styles.iconButton}>
                            <Icon name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                    ) : null}
                    <Text style={styles.title}>{title}</Text>
                </View>
                
                <View style={styles.rightContainer}>
                    {onHomePress && (
                        <TouchableOpacity onPress={onHomePress} style={styles.iconButton}>
                            <Icon name="home" size={24} color="#fff" />
                        </TouchableOpacity>
                    )}
                    {onUsersPress && (
                        <TouchableOpacity onPress={onUsersPress} style={styles.iconButton}>
                            <Icon name="people" size={24} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#3f51b5',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '500',
        marginLeft: 8,
    },
    iconButton: {
        padding: 8,
    },
});

export default Header;
```

## 8. Создание компонента LoadingSpinner

**src/components/LoadingSpinner.tsx:**
```tsx
import React from 'react';
import {
    View,
    ActivityIndicator,
    StyleSheet,
    Modal,
    Text
} from 'react-native';

interface LoadingSpinnerProps {
    visible: boolean;
    text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ visible, text = 'Загрузка...' }) => {
    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={() => {}}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <ActivityIndicator size="large" color="#3f51b5" />
                    {text ? <Text style={styles.text}>{text}</Text> : null}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    text: {
        fontSize: 16,
        color: '#333',
    },
});

export default LoadingSpinner;
```

## 9. Создание экрана Home

**src/screens/HomeScreen.tsx:**
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
    navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.welcomeCard}>
                    <Icon name="waving-hand" size={60} color="#3f51b5" />
                    <Text style={styles.welcomeTitle}>Добро пожаловать!</Text>
                    <Text style={styles.welcomeText}>
                        Это демонстрационное приложение на React Native
                    </Text>
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>О приложении</Text>
                    <Text style={styles.infoText}>
                        SampleApp.RN - мобильная версия приложения для управления пользователями.
                        Приложение взаимодействует с REST API и демонстрирует основные возможности
                        React Native.
                    </Text>
                </View>

                <View style={styles.featuresContainer}>
                    <Text style={styles.featuresTitle}>Возможности:</Text>
                    
                    <TouchableOpacity
                        style={styles.featureItem}
                        onPress={() => navigation.navigate('Users')}
                    >
                        <Icon name="people" size={24} color="#3f51b5" />
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>Пользователи</Text>
                            <Text style={styles.featureDescription}>
                                Просмотр списка пользователей
                            </Text>
                        </View>
                        <Icon name="chevron-right" size={24} color="#999" />
                    </TouchableOpacity>

                    <View style={styles.featureItem}>
                        <Icon name="storage" size={24} color="#3f51b5" />
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>API интеграция</Text>
                            <Text style={styles.featureDescription}>
                                Взаимодействие с REST API
                            </Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <Icon name="palette" size={24} color="#3f51b5" />
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>Material Design</Text>
                            <Text style={styles.featureDescription}>
                                Современный интерфейс
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 16,
    },
    welcomeCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    welcomeText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    featuresContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    featuresTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    featureTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 12,
        color: '#999',
    },
});

export default HomeScreen;
```

## 10. Создание экрана Users

**src/screens/UsersScreen.tsx:**
```tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    Alert,
    TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../services/users.service';
import User from '../models/user.entity';
import LoadingSpinner from '../components/LoadingSpinner';

interface UsersScreenProps {
    navigation: any;
}

const UsersScreen: React.FC<UsersScreenProps> = ({ navigation }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setError(null);
            const data = await usersService.getAll();
            setUsers(data);
        } catch (err) {
            setError('Не удалось загрузить пользователей');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadUsers();
        setRefreshing(false);
    };

    const handleUserPress = (user: User) => {
        Alert.alert(
            'Информация о пользователе',
            `ID: ${user.id}\nИмя: ${user.name}\nЛогин: ${user.login || 'Не указан'}`,
            [{ text: 'OK' }]
        );
    };

    const renderUserItem = ({ item }: { item: User }) => (
        <TouchableOpacity
            style={styles.userCard}
            onPress={() => handleUserPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                    {item.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
            </View>
            
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name || 'Без имени'}</Text>
                <Text style={styles.userLogin}>{item.login || 'Нет логина'}</Text>
                <Text style={styles.userId}>ID: {item.id}</Text>
            </View>
            
            <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
    );

    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>Нет пользователей</Text>
            {error && (
                <TouchableOpacity style={styles.retryButton} onPress={loadUsers}>
                    <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderError = () => (
        <View style={styles.errorContainer}>
            <Icon name="error-outline" size={60} color="#f44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadUsers}>
                <Text style={styles.retryText}>Повторить</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return <LoadingSpinner visible={true} text="Загрузка пользователей..." />;
    }

    if (error) {
        return renderError();
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={users}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderUserItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={renderEmptyList}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            Всего пользователей: {users.length}
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    listContent: {
        padding: 16,
        flexGrow: 1,
    },
    header: {
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3f51b5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userAvatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    userLogin: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    userId: {
        fontSize: 12,
        color: '#999',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
        marginBottom: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3f51b5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default UsersScreen;
```

## 11. Создание главного компонента App

**src/App.tsx:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

import HomeScreen from './screens/HomeScreen';
import UsersScreen from './screens/UsersScreen';
import Header from './components/Header';

const Stack = createNativeStackNavigator();

const App: React.FC = () => {
    return (
        <SafeAreaProvider>
            <StatusBar backgroundColor="#3f51b5" barStyle="light-content" />
            <NavigationContainer>
                <Stack.Navigator
                    screenOptions={{
                        header: ({ navigation, route, options, back }) => (
                            <Header
                                title={options.title || route.name}
                                showBackButton={!!back}
                                onBackPress={navigation.goBack}
                                onHomePress={() => navigation.navigate('Home')}
                                onUsersPress={() => navigation.navigate('Users')}
                            />
                        ),
                    }}
                >
                    <Stack.Screen
                        name="Home"
                        component={HomeScreen}
                        options={{ title: 'Главная' }}
                    />
                    <Stack.Screen
                        name="Users"
                        component={UsersScreen}
                        options={{ title: 'Пользователи' }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
};

export default App;
```

## 12. Обновление корневого файла index.js

**index.js:**
```javascript
/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

## 13. Настройка Android для работы с локальным API

**android/app/src/main/AndroidManifest.xml:**
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <application
        android:usesCleartextTraffic="true"
        ...>
        ...
    </application>
</manifest>
```

## 14. Настройка iOS для работы с локальным API

**ios/SampleAppRn/Info.plist:**
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

## 15. Скрипты для запуска

**package.json:**
```json
{
    "scripts": {
        "android": "react-native run-android",
        "ios": "react-native run-ios",
        "start": "react-native start",
        "test": "jest",
        "lint": "eslint ."
    }
}
```

## 16. Запуск приложения

```bash
# Запуск Metro bundler
npm start

# На другом терминале, для Android
npm run android

# Для iOS
npm run ios
```

## Сравнение Angular vs React Native подходов

| Angular | React Native |
|---------|--------------|
| `ng new` | `react-native init` |
| Компоненты с шаблонами | JSX компоненты |
| `ng serve` | `npm start` + `npm run android/ios` |
| `HttpClient` + RxJS | `axios` + Promise/async-await |
| Material Design через Angular Material | React Native Paper или Native Base |
| Роутинг через `RouterModule` | React Navigation |
| CSS стили | StyleSheet API |

## Особенности React Native реализации

1. **Платформозависимые URL**: Разные URL для Android эмулятора и iOS
2. **Нативные компоненты**: Использование React Native компонентов вместо HTML
3. **Стилизация**: StyleSheet API вместо CSS
4. **Навигация**: React Navigation вместо веб-роутинга
5. **Сетевые запросы**: Особые настройки для localhost на эмуляторах

Эта реализация полностью воспроизводит функциональность Angular приложения на React Native с учетом особенностей мобильной разработки.
=== React-Native-2.-Авторизация-и-регистрация.md ===
## 1. Установка дополнительных зависимостей

```bash
npm install @react-navigation/bottom-tabs
npm install react-native-vector-icons
npm install react-native-paper
npm install react-native-safe-area-context
npm install react-native-screens
npm install react-native-gesture-handler

# Для iOS
cd ios && pod install && cd ..
```

## 2. Обновление модели User

**src/models/user.entity.ts:**
```typescript
export default interface User {
    id: number;
    name: string;
    login: string;
    password?: string;
    token?: string;
}
```

## 3. Создание контекста авторизации

**src/contexts/AuthContext.tsx:**
```tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import User from '../models/user.entity';
import { authService } from '../services/auth.service';

interface AuthContextType {
    currentUser: User | null;
    login: (login: string, password: string) => Promise<User | null>;
    register: (userData: any) => Promise<any>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const userJson = await AsyncStorage.getItem('user');
            if (userJson) {
                const user = JSON.parse(userJson);
                setCurrentUser(user);
                console.log('Пользователь загружен из AsyncStorage');
            }
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (login: string, password: string): Promise<User | null> => {
        try {
            const user = await authService.login({ login, password });
            if (user) {
                await AsyncStorage.setItem('user', JSON.stringify(user));
                setCurrentUser(user);
                Alert.alert('Успех', 'Вы успешно авторизованы!');
                return user;
            }
            return null;
        } catch (error: any) {
            const message = error.response?.data?.message || 'Ошибка авторизации';
            Alert.alert('Ошибка', message);
            throw error;
        }
    };

    const register = async (userData: any): Promise<any> => {
        try {
            const response = await authService.register(userData);
            Alert.alert('Успех', 'Регистрация успешна! Теперь вы можете войти.');
            return response;
        } catch (error: any) {
            const errors = error.response?.data?.errors;
            if (errors) {
                const messages = Object.values(errors).flat().join('\n');
                Alert.alert('Ошибка регистрации', messages);
            } else {
                Alert.alert('Ошибка', error.response?.data?.message || 'Ошибка регистрации');
            }
            throw error;
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('user');
            setCurrentUser(null);
            Alert.alert('Выход', 'Вы вышли из системы');
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        }
    };

    const value = {
        currentUser,
        login,
        register,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
```

## 4. Обновление сервиса авторизации

**src/services/auth.service.ts:**
```typescript
import api from './api.config';
import User from '../models/user.entity';

class AuthService {
    async login(credentials: { login: string; password: string }): Promise<User | null> {
        const response = await api.post<User>('/Users/Login', credentials);
        return response.data;
    }

    async register(userData: any): Promise<any> {
        const response = await api.post('/Users', userData);
        return response.data;
    }
}

export const authService = new AuthService();
```

## 5. Создание экрана авторизации

**src/screens/AuthScreen.tsx:**
```tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

interface AuthScreenProps {
    navigation: any;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login: loginUser } = useAuth();

    const handleSubmit = async () => {
        if (!login || !password) {
            Alert.alert('Ошибка', 'Заполните все поля');
            return;
        }

        try {
            setLoading(true);
            await loginUser(login, password);
            navigation.replace('Home');
        } catch (error) {
            // Ошибка уже обработана в контексте
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Icon name="lock" size={60} color="#3f51b5" />
                        <Text style={styles.title}>Авторизация</Text>
                        <Text style={styles.subtitle}>Войдите в свой аккаунт</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Icon name="person" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Логин"
                                value={login}
                                onChangeText={setLogin}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Icon name="lock" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Пароль"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeIcon}
                            >
                                <Icon
                                    name={showPassword ? 'visibility' : 'visibility-off'}
                                    size={20}
                                    color="#999"
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Войти</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => navigation.navigate('Sign')}
                        >
                            <Text style={styles.linkText}>
                                Нет аккаунта? Зарегистрироваться
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    inputIcon: {
        padding: 10,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: '#333',
    },
    eyeIcon: {
        padding: 10,
    },
    button: {
        backgroundColor: '#3f51b5',
        borderRadius: 8,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#9fa8da',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    linkText: {
        color: '#3f51b5',
        fontSize: 14,
    },
});

export default AuthScreen;
```

## 6. Создание экрана регистрации

**src/screens/SignScreen.tsx:**
```tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

interface SignScreenProps {
    navigation: any;
}

const SignScreen: React.FC<SignScreenProps> = ({ navigation }) => {
    const [formData, setFormData] = useState({
        login: '',
        password: '',
        name: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();

    const handleSubmit = async () => {
        if (!formData.login || !formData.password) {
            Alert.alert('Ошибка', 'Заполните все обязательные поля');
            return;
        }

        if (formData.password.length < 3) {
            Alert.alert('Ошибка', 'Пароль должен содержать минимум 3 символа');
            return;
        }

        if (formData.login === 'admin') {
            Alert.alert('Ошибка', 'Недопустимый логин пользователя');
            return;
        }

        try {
            setLoading(true);
            await register(formData);
            navigation.replace('Auth');
        } catch (error) {
            // Ошибка уже обработана в контексте
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Icon name="person-add" size={60} color="#3f51b5" />
                        <Text style={styles.title}>Регистрация</Text>
                        <Text style={styles.subtitle}>Создайте новый аккаунт</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Icon name="person" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Логин *"
                                value={formData.login}
                                onChangeText={(text) => setFormData({...formData, login: text})}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                            />
                        </View>

                        {formData.login === 'admin' && (
                            <View style={styles.warningContainer}>
                                <Icon name="warning" size={16} color="#f44336" />
                                <Text style={styles.warningText}>
                                    Недопустимый логин пользователя!
                                </Text>
                            </View>
                        )}

                        <View style={styles.inputContainer}>
                            <Icon name="lock" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Пароль *"
                                value={formData.password}
                                onChangeText={(text) => setFormData({...formData, password: text})}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeIcon}
                            >
                                <Icon
                                    name={showPassword ? 'visibility' : 'visibility-off'}
                                    size={20}
                                    color="#999"
                                />
                            </TouchableOpacity>
                        </View>

                        {formData.password && formData.password.length > 8 && (
                            <View style={styles.warningContainer}>
                                <Icon name="error" size={16} color="#f44336" />
                                <Text style={styles.warningText}>
                                    Максимум 8 символов
                                </Text>
                            </View>
                        )}

                        <View style={styles.inputContainer}>
                            <Icon name="badge" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Имя (необязательно)"
                                value={formData.name}
                                onChangeText={(text) => setFormData({...formData, name: text})}
                                autoCapitalize="words"
                                editable={!loading}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleSubmit}
                            disabled={loading || !formData.login || !formData.password}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Зарегистрироваться</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => navigation.navigate('Auth')}
                        >
                            <Text style={styles.linkText}>
                                Уже есть аккаунт? Войти
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    inputIcon: {
        padding: 10,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: '#333',
    },
    eyeIcon: {
        padding: 10,
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffebee',
        padding: 8,
        borderRadius: 8,
        marginBottom: 16,
    },
    warningText: {
        color: '#f44336',
        fontSize: 12,
        marginLeft: 8,
        flex: 1,
    },
    button: {
        backgroundColor: '#3f51b5',
        borderRadius: 8,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#9fa8da',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    linkText: {
        color: '#3f51b5',
        fontSize: 14,
    },
});

export default SignScreen;
```

## 7. Создание компонента Header с навигацией

**src/components/Header.tsx:**
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
    navigation: any;
    showBack?: boolean;
    title: string;
}

const Header: React.FC<HeaderProps> = ({ navigation, showBack, title }) => {
    const { currentUser, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigation.replace('Auth');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.leftContainer}>
                    {showBack ? (
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.iconButton}
                        >
                            <Icon name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                    ) : null}
                    <Text style={styles.title}>{title}</Text>
                </View>

                <View style={styles.rightContainer}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Home')}
                        style={styles.iconButton}
                    >
                        <Icon name="home" size={24} color="#fff" />
                    </TouchableOpacity>

                    {currentUser && (
                        <>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Users')}
                                style={styles.iconButton}
                            >
                                <Icon name="people" size={24} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleLogout}
                                style={styles.iconButton}
                            >
                                <Icon name="logout" size={24} color="#fff" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
            {currentUser && (
                <View style={styles.userInfo}>
                    <Icon name="account-circle" size={16} color="#fff" />
                    <Text style={styles.userText}>{currentUser.login}</Text>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#3f51b5',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '500',
        marginLeft: 8,
    },
    iconButton: {
        padding: 8,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 4,
    },
    userText: {
        color: '#fff',
        fontSize: 12,
        opacity: 0.9,
    },
});

export default Header;
```

## 8. Обновление экрана Home

**src/screens/HomeScreen.tsx:**
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
    navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    const { currentUser } = useAuth();

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.welcomeCard}>
                    <Icon name="waving-hand" size={60} color="#3f51b5" />
                    {currentUser ? (
                        <>
                            <Text style={styles.welcomeTitle}>
                                Добро пожаловать, {currentUser.login}!
                            </Text>
                            <Text style={styles.welcomeText}>
                                ID: {currentUser.id} • {currentUser.name || 'Без имени'}
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.welcomeTitle}>Добро пожаловать!</Text>
                            <Text style={styles.welcomeText}>
                                Войдите или зарегистрируйтесь чтобы продолжить
                            </Text>
                        </>
                    )}
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>О приложении</Text>
                    <Text style={styles.infoText}>
                        SampleApp.RN - мобильная версия приложения для управления пользователями.
                    </Text>
                </View>

                <View style={styles.featuresContainer}>
                    <Text style={styles.featuresTitle}>Возможности:</Text>
                    
                    {currentUser ? (
                        <TouchableOpacity
                            style={styles.featureItem}
                            onPress={() => navigation.navigate('Users')}
                        >
                            <Icon name="people" size={24} color="#3f51b5" />
                            <View style={styles.featureTextContainer}>
                                <Text style={styles.featureTitle}>Пользователи</Text>
                                <Text style={styles.featureDescription}>
                                    Просмотр списка пользователей
                                </Text>
                            </View>
                            <Icon name="chevron-right" size={24} color="#999" />
                        </TouchableOpacity>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={styles.featureItem}
                                onPress={() => navigation.navigate('Auth')}
                            >
                                <Icon name="login" size={24} color="#3f51b5" />
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureTitle}>Вход</Text>
                                    <Text style={styles.featureDescription}>
                                        Авторизуйтесь в системе
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#999" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.featureItem}
                                onPress={() => navigation.navigate('Sign')}
                            >
                                <Icon name="person-add" size={24} color="#3f51b5" />
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureTitle}>Регистрация</Text>
                                    <Text style={styles.featureDescription}>
                                        Создайте новый аккаунт
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#999" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 16,
    },
    welcomeCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    welcomeText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    featuresContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    featuresTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    featureTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 12,
        color: '#999',
    },
});

export default HomeScreen;
```

## 9. Обновление главного компонента App

**src/App.tsx:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

import { AuthProvider } from './contexts/AuthContext';
import HomeScreen from './screens/HomeScreen';
import UsersScreen from './screens/UsersScreen';
import AuthScreen from './screens/AuthScreen';
import SignScreen from './screens/SignScreen';
import Header from './components/Header';

const Stack = createNativeStackNavigator();

const App: React.FC = () => {
    return (
        <SafeAreaProvider>
            <StatusBar backgroundColor="#3f51b5" barStyle="light-content" />
            <AuthProvider>
                <NavigationContainer>
                    <Stack.Navigator
                        screenOptions={({ navigation, route }) => ({
                            header: () => (
                                <Header
                                    navigation={navigation}
                                    showBack={route.name !== 'Home'}
                                    title={route.name === 'Home' ? 'Главная' : 
                                           route.name === 'Users' ? 'Пользователи' :
                                           route.name === 'Auth' ? 'Вход' : 'Регистрация'}
                                />
                            ),
                        })}
                    >
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="Users" component={UsersScreen} />
                        <Stack.Screen name="Auth" component={AuthScreen} />
                        <Stack.Screen name="Sign" component={SignScreen} />
                    </Stack.Navigator>
                </NavigationContainer>
            </AuthProvider>
        </SafeAreaProvider>
    );
};

export default App;
```

## 10. Установка AsyncStorage

```bash
npm install @react-native-async-storage/async-storage
```

## 11. Настройка Android для работы с Vector Icons

**android/app/build.gradle:**
```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

## 12. Тестирование функциональности

1. **Регистрация**:
   - Перейдите на экран регистрации
   - Заполните форму и создайте аккаунт
   - Проверьте валидацию (логин admin запрещен, пароль > 8 символов)

2. **Авторизация**:
   - Войдите с созданным аккаунтом
   - Проверьте сохранение сессии после перезапуска

3. **Навигация**:
   - Проверьте работу навигации между экранами
   - Кнопка "Назад" должна работать корректно

4. **Выход из системы**:
   - Нажмите на иконку выхода в хедере
   - Должен произойти выход и редирект на экран входа

## Сравнение Angular vs React Native подходов

| Angular | React Native |
|---------|--------------|
| `RouterModule` для навигации | `@react-navigation/native` |
| `FormsModule` для форм | Контролируемые компоненты |
| `localStorage` | `AsyncStorage` |
| `(click)` события | `onPress` обработчики |
| CSS стили | StyleSheet API |
| Material Design компоненты | React Native Paper |

## Команды Git

```bash
# Проверка статуса
git status

# Создание ветки sprint2
git checkout -b sprint2

# Добавление всех изменений
git add -A

# Создание коммита
git commit -m "Выполнен sprint2: Добавление авторизации и регистрации"

# Переключение на master
git checkout master

# Ребейз sprint2 в master
git rebase sprint2
```

Эта реализация полностью воспроизводит функциональность Angular приложения на React Native с:
- Авторизацией и регистрацией
- Сохранением сессии в AsyncStorage
- Навигацией между экранами
- Валидацией форм
- Material Design интерфейсом
=== React-Native-3.-Валидация-форм.md ===
В этом спринте мы добавим валидацию форм с использованием React Hook Form и кастомные валидаторы.

## 1. Установка дополнительных зависимостей

```bash
npm install react-hook-form
npm install @react-native-async-storage/async-storage
npm install react-native-vector-icons

# Для iOS
cd ios && pod install && cd ..
```

## 2. Создание кастомных валидаторов

**src/validators/customValidators.ts:**
```typescript
// Валидатор для проверки логина (запрет на admin)
export const validateLoginNotAdmin = (login: string): boolean => {
    return login === 'admin';
};

// Функция для создания валидатора с сообщением
export const createLoginForbiddenValidator = () => {
    return (value: string) => {
        if (value === 'admin') {
            return 'Недопустимый логин пользователя!';
        }
        return undefined;
    };
};

// Валидатор для проверки длины пароля
export const validatePasswordLength = (value: string): string | undefined => {
    if (!value) {
        return 'Пароль обязателен';
    }
    if (value.length > 8) {
        return 'Максимум 8 символов';
    }
    if (value.length < 3) {
        return 'Минимум 3 символа';
    }
    if (value === '123') {
        return 'Слишком простой пароль';
    }
    return undefined;
};

// Валидатор для проверки логина
export const validateLogin = (value: string): string | undefined => {
    if (!value) {
        return 'Логин обязателен';
    }
    if (value.length < 3) {
        return 'Логин должен содержать минимум 3 символа';
    }
    if (value === 'admin') {
        return 'Недопустимый логин пользователя!';
    }
    return undefined;
};

// Валидатор для проверки имени
export const validateName = (value: string): string | undefined => {
    if (value && value.length < 2) {
        return 'Имя должно содержать минимум 2 символа';
    }
    return undefined;
};
```

## 3. Создание компонента FormInput для переиспользования

**src/components/FormInput.tsx:**
```tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Animated,
    TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface FormInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    onBlur?: () => void;
    error?: string;
    touched?: boolean;
    secureTextEntry?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    editable?: boolean;
    required?: boolean;
    icon?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
    label,
    value,
    onChangeText,
    onBlur,
    error,
    touched,
    secureTextEntry = false,
    autoCapitalize = 'none',
    keyboardType = 'default',
    editable = true,
    required = false,
    icon
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const animatedValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;

    const handleFocus = () => {
        setIsFocused(true);
        Animated.timing(animatedValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (!value) {
            Animated.timing(animatedValue, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }).start();
        }
        onBlur?.();
    };

    const labelStyle = {
        top: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [14, -10],
        }),
        fontSize: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 12],
        }),
        color: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: ['#999', error && touched ? '#f44336' : '#3f51b5'],
        }),
    };

    const borderColor = error && touched ? '#f44336' : isFocused ? '#3f51b5' : '#ddd';

    return (
        <View style={styles.container}>
            <Animated.Text style={[styles.label, labelStyle]}>
                {label}{required && ' *'}
            </Animated.Text>
            
            <View style={[styles.inputContainer, { borderColor }]}>
                {icon && (
                    <Icon 
                        name={icon} 
                        size={20} 
                        color={error && touched ? '#f44336' : isFocused ? '#3f51b5' : '#999'} 
                        style={styles.icon} 
                    />
                )}
                
                <TextInput
                    style={[styles.input, !editable && styles.inputDisabled]}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    secureTextEntry={secureTextEntry && !showPassword}
                    autoCapitalize={autoCapitalize}
                    keyboardType={keyboardType}
                    editable={editable}
                    placeholderTextColor="#999"
                />
                
                {secureTextEntry && (
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIcon}
                    >
                        <Icon
                            name={showPassword ? 'visibility' : 'visibility-off'}
                            size={20}
                            color="#999"
                        />
                    </TouchableOpacity>
                )}
            </View>
            
            {error && touched && (
                <View style={styles.errorContainer}>
                    <Icon name="error" size={14} color="#f44336" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        position: 'relative',
    },
    label: {
        position: 'absolute',
        left: 12,
        backgroundColor: '#fff',
        paddingHorizontal: 4,
        zIndex: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        backgroundColor: '#fff',
        height: 48,
    },
    icon: {
        paddingLeft: 12,
    },
    input: {
        flex: 1,
        height: 48,
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#333',
    },
    inputDisabled: {
        backgroundColor: '#f5f5f5',
        color: '#999',
    },
    eyeIcon: {
        paddingHorizontal: 12,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginLeft: 12,
    },
    errorText: {
        color: '#f44336',
        fontSize: 12,
        marginLeft: 4,
    },
});
```

## 4. Создание компонента FormDebug для отладки

**src/components/FormDebug.tsx:**
```tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface FormDebugProps {
    formState: any;
    errors: any;
    isValid: boolean;
    isDirty: boolean;
    touched: any;
}

export const FormDebug: React.FC<FormDebugProps> = ({
    formState,
    errors,
    isValid,
    isDirty,
    touched
}) => {
    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Отладочная информация</Text>
            
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Статус формы:</Text>
                <Text>Valid: {isValid ? '✅' : '❌'}</Text>
                <Text>Dirty: {isDirty ? '✅' : '❌'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Значения:</Text>
                {Object.entries(formState).map(([key, value]) => (
                    <Text key={key} style={styles.valueText}>
                        {key}: {JSON.stringify(value)}
                    </Text>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ошибки:</Text>
                {Object.keys(errors).length === 0 ? (
                    <Text>Нет ошибок</Text>
                ) : (
                    Object.entries(errors).map(([key, value]: [string, any]) => (
                        <Text key={key} style={styles.errorText}>
                            {key}: {value.message}
                        </Text>
                    ))
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Touched поля:</Text>
                {Object.keys(touched).length === 0 ? (
                    <Text>Нет touched полей</Text>
                ) : (
                    Object.entries(touched).map(([key, value]: [string, any]) => (
                        <Text key={key}>
                            {key}: {value ? '✅' : '❌'}
                        </Text>
                    ))
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f5f5f5',
        padding: 16,
        borderRadius: 8,
        marginTop: 16,
        maxHeight: 300,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    section: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
    },
    valueText: {
        fontSize: 12,
        color: '#333',
        marginLeft: 8,
    },
    errorText: {
        fontSize: 12,
        color: '#f44336',
        marginLeft: 8,
    },
});
```

## 5. Обновление экрана регистрации с валидацией

**src/screens/SignScreen.tsx:**
```tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { FormInput } from '../components/FormInput';
import { FormDebug } from '../components/FormDebug';
import { validateLogin, validatePasswordLength, validateName } from '../validators/customValidators';

interface SignFormData {
    login: string;
    password: string;
    name: string;
}

interface SignScreenProps {
    navigation: any;
}

const SignScreen: React.FC<SignScreenProps> = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [showDebug, setShowDebug] = useState(__DEV__); // Только в разработке
    const { register: registerUser } = useAuth();

    const {
        control,
        handleSubmit,
        watch,
        formState: { errors, isValid, isDirty, touchedFields },
        setError,
        clearErrors
    } = useForm<SignFormData>({
        mode: 'onChange',
        defaultValues: {
            login: '',
            password: '',
            name: ''
        }
    });

    const loginValue = watch('login');
    const passwordValue = watch('password');

    // Очистка ошибки для логина при изменении
    useEffect(() => {
        if (loginValue !== 'admin') {
            clearErrors('login');
        }
    }, [loginValue, clearErrors]);

    const onSubmit = async (data: SignFormData) => {
        try {
            setLoading(true);
            setServerError(null);
            await registerUser(data);
            navigation.replace('Auth');
        } catch (err: any) {
            const errors = err.response?.data?.errors;
            if (errors) {
                if (errors.Login) {
                    setError('login', { 
                        type: 'manual', 
                        message: errors.Login[0] 
                    });
                }
                if (errors.Password) {
                    setError('password', { 
                        type: 'manual', 
                        message: errors.Password[0] 
                    });
                }
                setServerError('Проверьте правильность заполнения полей');
            } else {
                setServerError(err.response?.data?.message || 'Ошибка регистрации');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Icon name="person-add" size={60} color="#3f51b5" />
                        <Text style={styles.title}>Регистрация</Text>
                        <Text style={styles.subtitle}>Создайте новый аккаунт</Text>
                    </View>

                    <View style={styles.form}>
                        {serverError && (
                            <View style={styles.serverErrorContainer}>
                                <Icon name="error" size={16} color="#f44336" />
                                <Text style={styles.serverErrorText}>{serverError}</Text>
                            </View>
                        )}

                        {/* Поле Name */}
                        <Controller
                            control={control}
                            name="name"
                            rules={{ validate: validateName }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <FormInput
                                    label="Имя"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.name?.message}
                                    touched={touchedFields.name}
                                    autoCapitalize="words"
                                    icon="badge"
                                />
                            )}
                        />

                        {/* Поле Login */}
                        <Controller
                            control={control}
                            name="login"
                            rules={{ validate: validateLogin }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <FormInput
                                    label="Логин"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.login?.message}
                                    touched={touchedFields.login}
                                    required
                                    icon="person"
                                />
                            )}
                        />

                        {/* Дополнительное предупреждение для admin */}
                        {loginValue === 'admin' && touchedFields.login && !errors.login && (
                            <View style={styles.warningContainer}>
                                <Icon name="warning" size={16} color="#ff9800" />
                                <Text style={styles.warningText}>
                                    Недопустимый логин пользователя!
                                </Text>
                            </View>
                        )}

                        {/* Поле Password */}
                        <Controller
                            control={control}
                            name="password"
                            rules={{ validate: validatePasswordLength }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <FormInput
                                    label="Пароль"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.password?.message}
                                    touched={touchedFields.password}
                                    secureTextEntry
                                    required
                                    icon="lock"
                                />
                            )}
                        />

                        {/* Индикатор сложности пароля */}
                        {passwordValue && passwordValue.length > 0 && (
                            <View style={styles.passwordStrength}>
                                <Text style={styles.strengthLabel}>Сложность пароля:</Text>
                                <View style={styles.strengthBar}>
                                    <View style={[
                                        styles.strengthIndicator,
                                        {
                                            width: `${Math.min(passwordValue.length * 12.5, 100)}%`,
                                            backgroundColor: passwordValue.length < 4 ? '#f44336' :
                                                           passwordValue.length < 6 ? '#ff9800' : '#4caf50'
                                        }
                                    ]} />
                                </View>
                            </View>
                        )}

                        {/* Индикатор несохраненных изменений */}
                        {isDirty && (
                            <View style={styles.dirtyIndicator}>
                                <Icon name="info" size={16} color="#2196f3" />
                                <Text style={styles.dirtyText}>
                                    ✏️ У вас есть несохраненные изменения
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
                            onPress={handleSubmit(onSubmit)}
                            disabled={!isValid || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Зарегистрироваться</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => navigation.navigate('Auth')}
                        >
                            <Text style={styles.linkText}>
                                Уже есть аккаунт? Войти
                            </Text>
                        </TouchableOpacity>

                        {/* Отладочная информация (только для разработки) */}
                        {showDebug && (
                            <Controller
                                control={control}
                                render={({ fieldState }) => (
                                    <FormDebug
                                        formState={watch()}
                                        errors={errors}
                                        isValid={isValid}
                                        isDirty={isDirty}
                                        touched={touchedFields}
                                    />
                                )}
                                name="debug"
                            />
                        )}

                        {/* Кнопка для скрытия/показа отладки */}
                        {__DEV__ && (
                            <TouchableOpacity
                                style={styles.debugButton}
                                onPress={() => setShowDebug(!showDebug)}
                            >
                                <Text style={styles.debugButtonText}>
                                    {showDebug ? 'Скрыть отладку' : 'Показать отладку'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    serverErrorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffebee',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    serverErrorText: {
        color: '#f44336',
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff3e0',
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
    },
    warningText: {
        color: '#ff9800',
        fontSize: 12,
        marginLeft: 8,
        flex: 1,
    },
    passwordStrength: {
        marginBottom: 16,
    },
    strengthLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    strengthBar: {
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    strengthIndicator: {
        height: '100%',
        borderRadius: 2,
    },
    dirtyIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e3f2fd',
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
    },
    dirtyText: {
        color: '#2196f3',
        fontSize: 12,
        marginLeft: 8,
    },
    button: {
        backgroundColor: '#3f51b5',
        borderRadius: 8,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#9fa8da',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    linkText: {
        color: '#3f51b5',
        fontSize: 14,
    },
    debugButton: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        alignItems: 'center',
    },
    debugButtonText: {
        color: '#666',
        fontSize: 12,
    },
});

export default SignScreen;
```

## 6. Обновление экрана авторизации с валидацией

**src/screens/AuthScreen.tsx:**
```tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { FormInput } from '../components/FormInput';

interface AuthFormData {
    login: string;
    password: string;
}

interface AuthScreenProps {
    navigation: any;
    route: any;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ navigation, route }) => {
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const { login } = useAuth();

    useEffect(() => {
        if (route.params?.registered) {
            setSuccessMessage('Регистрация успешна! Теперь вы можете войти.');
        }
    }, [route.params]);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid, touchedFields }
    } = useForm<AuthFormData>({
        mode: 'onChange',
        defaultValues: {
            login: '',
            password: ''
        }
    });

    const validateLogin = (value: string) => {
        if (!value) return 'Логин обязателен';
        return undefined;
    };

    const validatePassword = (value: string) => {
        if (!value) return 'Пароль обязателен';
        if (value.length < 3) return 'Пароль должен содержать минимум 3 символа';
        return undefined;
    };

    const onSubmit = async (data: AuthFormData) => {
        try {
            setLoading(true);
            await login(data.login, data.password);
            navigation.replace('Home');
        } catch (error) {
            // Ошибка уже обработана в контексте
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Icon name="lock" size={60} color="#3f51b5" />
                        <Text style={styles.title}>Авторизация</Text>
                        <Text style={styles.subtitle}>Войдите в свой аккаунт</Text>
                    </View>

                    <View style={styles.form}>
                        {successMessage && (
                            <View style={styles.successContainer}>
                                <Icon name="check-circle" size={16} color="#4caf50" />
                                <Text style={styles.successText}>{successMessage}</Text>
                            </View>
                        )}

                        {/* Поле Login */}
                        <Controller
                            control={control}
                            name="login"
                            rules={{ validate: validateLogin }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <FormInput
                                    label="Логин"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.login?.message}
                                    touched={touchedFields.login}
                                    required
                                    icon="person"
                                />
                            )}
                        />

                        {/* Поле Password */}
                        <Controller
                            control={control}
                            name="password"
                            rules={{ validate: validatePassword }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <FormInput
                                    label="Пароль"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.password?.message}
                                    touched={touchedFields.password}
                                    secureTextEntry
                                    required
                                    icon="lock"
                                />
                            )}
                        />

                        <TouchableOpacity
                            style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
                            onPress={handleSubmit(onSubmit)}
                            disabled={!isValid || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Войти</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => navigation.navigate('Sign')}
                        >
                            <Text style={styles.linkText}>
                                Нет аккаунта? Зарегистрироваться
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    successContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    successText: {
        color: '#4caf50',
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    button: {
        backgroundColor: '#3f51b5',
        borderRadius: 8,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#9fa8da',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    linkText: {
        color: '#3f51b5',
        fontSize: 14,
    },
});

export default AuthScreen;
```

## 7. Создание асинхронного валидатора (задание со звездочкой)

**src/services/validation.service.ts:**
```typescript
import api from './api.config';

class ValidationService {
    async checkLoginUnique(login: string): Promise<boolean> {
        try {
            const response = await api.get(`/Users/check-login?login=${login}`);
            return response.data.isUnique;
        } catch (error) {
            console.error('Error checking login uniqueness:', error);
            return false;
        }
    }
}

export const validationService = new ValidationService();
```

## 8. Обновление навигации для передачи параметров

**src/App.tsx:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

import { AuthProvider } from './contexts/AuthContext';
import HomeScreen from './screens/HomeScreen';
import UsersScreen from './screens/UsersScreen';
import AuthScreen from './screens/AuthScreen';
import SignScreen from './screens/SignScreen';
import Header from './components/Header';

export type RootStackParamList = {
    Home: undefined;
    Users: undefined;
    Auth: { registered?: boolean } | undefined;
    Sign: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
    return (
        <SafeAreaProvider>
            <StatusBar backgroundColor="#3f51b5" barStyle="light-content" />
            <AuthProvider>
                <NavigationContainer>
                    <Stack.Navigator
                        screenOptions={({ navigation, route }) => ({
                            header: () => (
                                <Header
                                    navigation={navigation}
                                    showBack={route.name !== 'Home'}
                                    title={route.name === 'Home' ? 'Главная' : 
                                           route.name === 'Users' ? 'Пользователи' :
                                           route.name === 'Auth' ? 'Вход' : 'Регистрация'}
                                />
                            ),
                        })}
                    >
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="Users" component={UsersScreen} />
                        <Stack.Screen name="Auth" component={AuthScreen} />
                        <Stack.Screen name="Sign" component={SignScreen} />
                    </Stack.Navigator>
                </NavigationContainer>
            </AuthProvider>
        </SafeAreaProvider>
    );
};

export default App;
```

## Тестирование функциональности

1. **Валидация полей**:
   - Оставьте поля пустыми - появятся сообщения об ошибках
   - Введите "admin" в поле логина - появится предупреждение
   - Введите пароль длиннее 8 символов - появится ошибка

2. **Индикаторы**:
   - При изменении полей появляется индикатор несохраненных изменений
   - Отображается сложность пароля
   - Визуальная обратная связь при фокусе на полях

3. **Сообщения об успехе**:
   - После успешной регистрации показывается сообщение на экране входа

4. **Отладка** (только для разработки):
   - Отображается панель с отладочной информацией
   - Можно скрыть/показать отладку

## Сравнение Angular vs React Native подходов для валидации

| Angular | React Native |
|---------|--------------|
| `FormGroup`, `FormControl` | `react-hook-form` с `useForm` |
| `Validators` класс | Кастомные функции валидации |
| `(ngModel)` двустороннее связывание | `Controller` + `onChangeText` |
| `*ngIf` для ошибок | Условный рендеринг |
| CSS классы для стилей | StyleSheet API |
| Асинхронные валидаторы | Асинхронные функции + `setError` |

## Команды Git

```bash
# Проверка статуса
git status

# Создание ветки sprint3
git checkout -b sprint3

# Добавление всех изменений
git add -A

# Создание коммита
git commit -m "Выполнен sprint3: Валидация форм"

# Переключение на master
git checkout master

# Ребейз sprint3 в master
git rebase sprint3
```

Эта реализация полностью воспроизводит функциональность Angular на React Native с:
- Валидацией всех полей формы
- Кастомными валидаторами (запрет на логин "admin")
- Визуальной обратной связью для пользователя
- Индикатором сложности пароля
- Отладочной информацией для разработки
=== React-Native-4.-Глобальный-индикатор-загрузки.md ===
# Перевод Sprint 4 (Loading Interceptor) на React Native

В этом спринте мы создадим глобальный индикатор загрузки для отслеживания HTTP запросов.

## 1. Установка дополнительных зависимостей

```bash
npm install axios
npm install react-native-vector-icons
npm install @react-native-async-storage/async-storage

# Для iOS
cd ios && pod install && cd ..
```

## 2. Создание сервиса для управления состоянием загрузки

**src/services/loading.service.ts:**
```typescript
type LoadingListener = (isLoading: boolean) => void;

class LoadingService {
    private listeners: LoadingListener[] = [];
    private isLoading = false;
    private requestCount = 0;
    private pendingRequests: Map<string, number> = new Map();

    show(requestId?: string) {
        if (requestId) {
            const count = this.pendingRequests.get(requestId) || 0;
            this.pendingRequests.set(requestId, count + 1);
        }

        this.requestCount++;
        if (!this.isLoading) {
            this.isLoading = true;
            this.notifyListeners();
        }
    }

    hide(requestId?: string) {
        if (requestId) {
            const count = this.pendingRequests.get(requestId) || 0;
            if (count > 1) {
                this.pendingRequests.set(requestId, count - 1);
            } else {
                this.pendingRequests.delete(requestId);
            }
        }

        this.requestCount--;
        if (this.requestCount <= 0) {
            this.requestCount = 0;
            this.isLoading = false;
            this.notifyListeners();
        }
    }

    getLoadingState(): boolean {
        return this.isLoading;
    }

    getRequestCount(): number {
        return this.requestCount;
    }

    subscribe(listener: LoadingListener) {
        this.listeners.push(listener);
        listener(this.isLoading);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.isLoading));
    }

    reset() {
        this.requestCount = 0;
        this.pendingRequests.clear();
        this.isLoading = false;
        this.notifyListeners();
    }
}

export const loadingService = new LoadingService();
```

## 3. Создание интерцепторов для Axios

**src/interceptors/loading.interceptor.ts:**
```typescript
import { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { loadingService } from '@/services/loading.service';
import { Platform } from 'react-native';

// Генерация уникального ID для запроса
const generateRequestId = (config: InternalAxiosRequestConfig): string => {
    return `${config.method}-${config.url}-${Date.now()}`;
};

// Интерцептор для запросов
export const requestInterceptor = (config: InternalAxiosRequestConfig) => {
    const requestId = generateRequestId(config);
    config.headers = config.headers || {};
    config.headers['X-Request-ID'] = requestId;
    
    // Не показываем лоадер для определенных типов запросов
    const skipLoading = config.headers['X-Skip-Loading'] === 'true';
    
    if (!skipLoading) {
        loadingService.show(requestId);
        
        // Добавляем задержку для демонстрации (как в Angular примере)
        if (__DEV__) {
            return new Promise(resolve => {
                setTimeout(() => resolve(config), 500);
            });
        }
    }
    
    return config;
};

// Интерцептор для ответов
export const responseInterceptor = (response: AxiosResponse) => {
    const requestId = response.config.headers?.['X-Request-ID'] as string;
    const skipLoading = response.config.headers?.['X-Skip-Loading'] === 'true';
    
    if (!skipLoading && requestId) {
        // Добавляем задержку в 1 секунду как в Angular примере
        setTimeout(() => {
            loadingService.hide(requestId);
        }, 1000);
    }
    
    return response;
};

// Интерцептор для ошибок
export const errorInterceptor = (error: AxiosError) => {
    const requestId = error.config?.headers?.['X-Request-ID'] as string;
    const skipLoading = error.config?.headers?.['X-Skip-Loading'] === 'true';
    
    if (!skipLoading && requestId) {
        setTimeout(() => {
            loadingService.hide(requestId);
        }, 1000);
    }
    
    return Promise.reject(error);
};
```

## 4. Обновление конфигурации Axios с интерцепторами

**src/services/api.config.ts:**
```typescript
import axios from 'axios';
import { Platform } from 'react-native';
import { environment, environmentAndroid } from '../environments/environment';
import { 
    requestInterceptor, 
    responseInterceptor, 
    errorInterceptor 
} from '../interceptors/loading.interceptor';
import { errorInterceptor as httpErrorInterceptor } from '../interceptors/error.interceptor';

// Выбор правильного URL в зависимости от платформы
const getBaseUrl = () => {
    if (Platform.OS === 'android') {
        return environmentAndroid.api;
    }
    return environment.api;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // Увеличиваем таймаут для мобильных сетей
});

// Request interceptors
api.interceptors.request.use(requestInterceptor);
api.interceptors.request.use((config) => {
    // Добавляем токен авторизации если есть
    // В React Native используем AsyncStorage
    return config;
});

// Response interceptors
api.interceptors.response.use(
    (response) => {
        responseInterceptor(response);
        return response;
    },
    (error) => {
        errorInterceptor(error);
        return httpErrorInterceptor(error);
    }
);

export default api;
```

## 5. Создание компонента LoadingOverlay

**src/components/LoadingOverlay.tsx:**
```tsx
import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Animated,
    Easing,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { loadingService } from '../services/loading.service';

interface LoadingOverlayProps {
    text?: string;
    showProgress?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
    text = 'Загрузка...',
    showProgress = false 
}) => {
    const [visible, setVisible] = React.useState(false);
    const [requestCount, setRequestCount] = React.useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const unsubscribe = loadingService.subscribe((isLoading) => {
            setVisible(isLoading);
            setRequestCount(loadingService.getRequestCount());
            
            if (isLoading) {
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                        easing: Easing.ease,
                    }),
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        friction: 8,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                ]).start();
                
                Animated.loop(
                    Animated.timing(rotateAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                        easing: Easing.linear,
                    })
                ).start();
            } else {
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 0.8,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    rotateAnim.setValue(0);
                });
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (!visible) return null;

    return (
        <Modal
            transparent
            animationType="none"
            visible={visible}
            onRequestClose={() => {}}
        >
            <View style={styles.overlay}>
                <Animated.View 
                    style={[
                        styles.container,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Icon name="autorenew" size={50} color="#3f51b5" />
                    </Animated.View>
                    
                    <Text style={styles.text}>{text}</Text>
                    
                    {showProgress && requestCount > 1 && (
                        <View style={styles.progressContainer}>
                            <Text style={styles.progressText}>
                                Выполняется запросов: {requestCount}
                            </Text>
                            <View style={styles.progressBar}>
                                {Array.from({ length: requestCount }).map((_, i) => (
                                    <View key={i} style={styles.progressDot} />
                                ))}
                            </View>
                        </View>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        minWidth: 200,
    },
    text: {
        fontSize: 16,
        color: '#333',
        marginTop: 16,
        fontWeight: '500',
    },
    progressContainer: {
        marginTop: 12,
        alignItems: 'center',
    },
    progressText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
    },
    progressBar: {
        flexDirection: 'row',
        gap: 4,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3f51b5',
    },
});
```

## 6. Создание компонента LoadingSpinner для локальной загрузки

**src/components/LoadingSpinner.tsx:**
```tsx
import React from 'react';
import {
    View,
    ActivityIndicator,
    StyleSheet,
    Text
} from 'react-native';

interface LoadingSpinnerProps {
    size?: 'small' | 'large';
    color?: string;
    text?: string;
    fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'large',
    color = '#3f51b5',
    text,
    fullScreen = false
}) => {
    if (fullScreen) {
        return (
            <View style={styles.fullScreen}>
                <ActivityIndicator size={size} color={color} />
                {text && <Text style={styles.text}>{text}</Text>}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ActivityIndicator size={size} color={color} />
            {text && <Text style={styles.text}>{text}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullScreen: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    text: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
});
```

## 7. Создание компонента для демонстрации загрузки

**src/components/LoadingDemo.tsx:**
```tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../services/users.service';
import { LoadingSpinner } from './LoadingSpinner';
import { loadingService } from '../services/loading.service';

interface LoadingDemoProps {
    navigation: any;
}

export const LoadingDemo: React.FC<LoadingDemoProps> = ({ navigation }) => {
    const [localLoading, setLocalLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const simulateRequest = async () => {
        setLocalLoading(true);
        setResult(null);
        
        try {
            await usersService.getAll();
            setResult('Данные успешно загружены!');
        } catch (error) {
            setResult('Ошибка при загрузке данных');
        } finally {
            setLocalLoading(false);
        }
    };

    const simulateMultipleRequests = async () => {
        setLocalLoading(true);
        setResult(null);
        
        try {
            await Promise.all([
                usersService.getAll(),
                usersService.get(1),
                usersService.getAll()
            ]);
            setResult('Все запросы выполнены успешно!');
        } catch (error) {
            setResult('Ошибка при выполнении запросов');
        } finally {
            setLocalLoading(false);
        }
    };

    const checkLoadingState = () => {
        Alert.alert(
            'Состояние загрузки',
            `Активных запросов: ${loadingService.getRequestCount()}\n` +
            `Лоадер активен: ${loadingService.getLoadingState() ? 'Да' : 'Нет'}`
        );
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Icon name="hourglass-empty" size={50} color="#3f51b5" />
                    <Text style={styles.title}>Демонстрация лоадера</Text>
                    <Text style={styles.subtitle}>
                        Глобальный индикатор загрузки для HTTP запросов
                    </Text>
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Как это работает</Text>
                    <View style={styles.infoItem}>
                        <Icon name="check-circle" size={16} color="#4caf50" />
                        <Text style={styles.infoText}>
                            При каждом HTTP запросе счетчик увеличивается
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Icon name="check-circle" size={16} color="#4caf50" />
                        <Text style={styles.infoText}>
                            При первом запросе появляется лоадер
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Icon name="check-circle" size={16} color="#4caf50" />
                        <Text style={styles.infoText}>
                            После завершения всех запросов лоадер скрывается с задержкой
                        </Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.button, localLoading && styles.buttonDisabled]}
                        onPress={simulateRequest}
                        disabled={localLoading}
                    >
                        {localLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Icon name="cloud-download" size={20} color="#fff" />
                                <Text style={styles.buttonText}>Загрузить данные</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.buttonSecondary, localLoading && styles.buttonDisabled]}
                        onPress={simulateMultipleRequests}
                        disabled={localLoading}
                    >
                        <Icon name="cloud-queue" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Множественные запросы</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.buttonInfo]}
                        onPress={checkLoadingState}
                    >
                        <Icon name="info" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Проверить состояние</Text>
                    </TouchableOpacity>
                </View>

                {result && (
                    <View style={[styles.resultCard, result.includes('Ошибка') ? styles.errorCard : styles.successCard]}>
                        <Icon 
                            name={result.includes('Ошибка') ? 'error' : 'check-circle'} 
                            size={24} 
                            color={result.includes('Ошибка') ? '#f44336' : '#4caf50'} 
                        />
                        <Text style={[
                            styles.resultText,
                            result.includes('Ошибка') ? styles.errorText : styles.successText
                        ]}>
                            {result}
                        </Text>
                    </View>
                )}

                <View style={styles.statsCard}>
                    <Text style={styles.statsTitle}>Текущая статистика</Text>
                    <View style={styles.statsRow}>
                        <Text>Активных запросов:</Text>
                        <Text style={styles.statsValue}>{loadingService.getRequestCount()}</Text>
                    </View>
                    <View style={styles.statsRow}>
                        <Text>Состояние лоадера:</Text>
                        <Text style={[
                            styles.statsValue,
                            { color: loadingService.getLoadingState() ? '#4caf50' : '#f44336' }
                        ]}>
                            {loadingService.getLoadingState() ? 'Активен' : 'Не активен'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => navigation.navigate('Users')}
                >
                    <Icon name="people" size={20} color="#3f51b5" />
                    <Text style={styles.navButtonText}>Перейти к пользователям</Text>
                    <Icon name="chevron-right" size={20} color="#3f51b5" />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 12,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    actions: {
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#3f51b5',
        borderRadius: 8,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        gap: 8,
    },
    buttonSecondary: {
        backgroundColor: '#f50057',
    },
    buttonInfo: {
        backgroundColor: '#2196f3',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    resultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        gap: 12,
    },
    successCard: {
        backgroundColor: '#e8f5e8',
    },
    errorCard: {
        backgroundColor: '#ffebee',
    },
    resultText: {
        fontSize: 14,
        flex: 1,
    },
    successText: {
        color: '#4caf50',
    },
    errorText: {
        color: '#f44336',
    },
    statsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    statsValue: {
        fontWeight: '600',
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    navButtonText: {
        fontSize: 16,
        color: '#3f51b5',
        fontWeight: '500',
    },
});
```

## 8. Создание экрана для демонстрации лоадера

**src/screens/LoadingDemoScreen.tsx:**
```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LoadingDemo } from '../components/LoadingDemo';

interface LoadingDemoScreenProps {
    navigation: any;
}

const LoadingDemoScreen: React.FC<LoadingDemoScreenProps> = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <LoadingDemo navigation={navigation} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
});

export default LoadingDemoScreen;
```

## 9. Обновление главного компонента App с LoadingOverlay

**src/App.tsx:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

import { AuthProvider } from './contexts/AuthContext';
import { LoadingOverlay } from './components/LoadingOverlay';
import HomeScreen from './screens/HomeScreen';
import UsersScreen from './screens/UsersScreen';
import AuthScreen from './screens/AuthScreen';
import SignScreen from './screens/SignScreen';
import LoadingDemoScreen from './screens/LoadingDemoScreen';
import Header from './components/Header';

export type RootStackParamList = {
    Home: undefined;
    Users: undefined;
    Auth: { registered?: boolean } | undefined;
    Sign: undefined;
    LoadingDemo: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
    return (
        <SafeAreaProvider>
            <StatusBar backgroundColor="#3f51b5" barStyle="light-content" />
            <AuthProvider>
                <NavigationContainer>
                    <LoadingOverlay text="Загрузка данных..." showProgress />
                    <Stack.Navigator
                        screenOptions={({ navigation, route }) => ({
                            header: () => (
                                <Header
                                    navigation={navigation}
                                    showBack={route.name !== 'Home'}
                                    title={route.name === 'Home' ? 'Главная' : 
                                           route.name === 'Users' ? 'Пользователи' :
                                           route.name === 'Auth' ? 'Вход' : 
                                           route.name === 'Sign' ? 'Регистрация' : 
                                           'Демо лоадера'}
                                />
                            ),
                        })}
                    >
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="Users" component={UsersScreen} />
                        <Stack.Screen name="Auth" component={AuthScreen} />
                        <Stack.Screen name="Sign" component={SignScreen} />
                        <Stack.Screen name="LoadingDemo" component={LoadingDemoScreen} />
                    </Stack.Navigator>
                </NavigationContainer>
            </AuthProvider>
        </SafeAreaProvider>
    );
};

export default App;
```

## 10. Обновление экрана Home с ссылкой на демо лоадера

**src/screens/HomeScreen.tsx:**
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
    navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    const { currentUser } = useAuth();

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.welcomeCard}>
                    <Icon name="waving-hand" size={60} color="#3f51b5" />
                    {currentUser ? (
                        <>
                            <Text style={styles.welcomeTitle}>
                                Добро пожаловать, {currentUser.login}!
                            </Text>
                            <Text style={styles.welcomeText}>
                                ID: {currentUser.id} • {currentUser.name || 'Без имени'}
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.welcomeTitle}>Добро пожаловать!</Text>
                            <Text style={styles.welcomeText}>
                                Войдите или зарегистрируйтесь чтобы продолжить
                            </Text>
                        </>
                    )}
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>О приложении</Text>
                    <Text style={styles.infoText}>
                        SampleApp.RN - мобильная версия приложения для управления пользователями.
                    </Text>
                </View>

                <View style={styles.featuresContainer}>
                    <Text style={styles.featuresTitle}>Возможности:</Text>
                    
                    {currentUser ? (
                        <>
                            <TouchableOpacity
                                style={styles.featureItem}
                                onPress={() => navigation.navigate('Users')}
                            >
                                <Icon name="people" size={24} color="#3f51b5" />
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureTitle}>Пользователи</Text>
                                    <Text style={styles.featureDescription}>
                                        Просмотр списка пользователей
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#999" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.featureItem}
                                onPress={() => navigation.navigate('LoadingDemo')}
                            >
                                <Icon name="hourglass-empty" size={24} color="#3f51b5" />
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureTitle}>Демо лоадера</Text>
                                    <Text style={styles.featureDescription}>
                                        Тестирование глобального индикатора загрузки
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#999" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={styles.featureItem}
                                onPress={() => navigation.navigate('Auth')}
                            >
                                <Icon name="login" size={24} color="#3f51b5" />
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureTitle}>Вход</Text>
                                    <Text style={styles.featureDescription}>
                                        Авторизуйтесь в системе
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#999" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.featureItem}
                                onPress={() => navigation.navigate('Sign')}
                            >
                                <Icon name="person-add" size={24} color="#3f51b5" />
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureTitle}>Регистрация</Text>
                                    <Text style={styles.featureDescription}>
                                        Создайте новый аккаунт
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#999" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 16,
    },
    welcomeCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    welcomeText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    featuresContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    featuresTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    featureTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 12,
        color: '#999',
    },
});

export default HomeScreen;
```

## 11. Обновление экрана Users с индикатором загрузки

**src/screens/UsersScreen.tsx:**
```tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    Alert,
    TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../services/users.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import User from '../models/user.entity';

interface UsersScreenProps {
    navigation: any;
}

const UsersScreen: React.FC<UsersScreenProps> = ({ navigation }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setError(null);
            const data = await usersService.getAll();
            setUsers(data);
        } catch (err) {
            setError('Не удалось загрузить пользователей');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadUsers();
        setRefreshing(false);
    };

    const handleUserPress = (user: User) => {
        Alert.alert(
            'Информация о пользователе',
            `ID: ${user.id}\nИмя: ${user.name}\nЛогин: ${user.login || 'Не указан'}`,
            [{ text: 'OK' }]
        );
    };

    const renderUserItem = ({ item }: { item: User }) => (
        <TouchableOpacity
            style={styles.userCard}
            onPress={() => handleUserPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                    {item.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
            </View>
            
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name || 'Без имени'}</Text>
                <Text style={styles.userLogin}>{item.login || 'Нет логина'}</Text>
                <Text style={styles.userId}>ID: {item.id}</Text>
            </View>
            
            <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
    );

    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>Нет пользователей</Text>
            {error && (
                <TouchableOpacity style={styles.retryButton} onPress={loadUsers}>
                    <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderError = () => (
        <View style={styles.errorContainer}>
            <Icon name="error-outline" size={60} color="#f44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadUsers}>
                <Text style={styles.retryText}>Повторить</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return <LoadingSpinner fullScreen text="Загрузка пользователей..." />;
    }

    if (error) {
        return renderError();
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={users}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderUserItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={renderEmptyList}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            Всего пользователей: {users.length}
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    listContent: {
        padding: 16,
        flexGrow: 1,
    },
    header: {
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3f51b5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userAvatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    userLogin: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    userId: {
        fontSize: 12,
        color: '#999',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
        marginBottom: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3f51b5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default UsersScreen;
```

## Тестирование функциональности

1. **Глобальный лоадер**:
   - Перейдите на страницу пользователей
   - Должен появиться глобальный лоадер с анимацией
   - Лоадер отображается поверх всего приложения

2. **Демо страница**:
   - Нажмите "Демо лоадера" на главном экране
   - Попробуйте разные типы запросов
   - Наблюдайте за счетчиком запросов

3. **Множественные запросы**:
   - Нажмите "Множественные запросы"
   - Лоадер будет активен до завершения всех запросов
   - Отображается количество активных запросов

4. **Локальный лоадер**:
   - На странице пользователей отображается локальный индикатор
   - Pull-to-refresh также показывает индикатор

## Сравнение Angular vs React Native подходов

| Angular | React Native |
|---------|--------------|
| `BusyService` с сигналами | `LoadingService` с подписками |
| `loadingInterceptor` с `finalize` | Axios interceptors |
| `delay(1000)` в интерцепторе | `setTimeout` в responseInterceptor |
| `MatProgressSpinnerModule` | `ActivityIndicator` компонент |
| `@if(busyService.loading())` | Условный рендеринг |
| CSS оверлей | `Modal` компонент |

## Команды Git

```bash
# Проверка статуса
git status

# Создание ветки sprint4
git checkout -b sprint4

# Добавление всех изменений
git add -A

# Создание коммита
git commit -m "Выполнен sprint4: Создание лоадера"

# Переключение на master
git checkout master

# Ребейз sprint4 в master
git rebase sprint4
```

Эта реализация полностью воспроизводит функциональность Angular лоадера на React Native с:
- Счетчиком запросов для множественных запросов
- Задержкой в 1 секунду перед скрытием
- Глобальным оверлеем с анимацией
- Отображением количества активных запросов
- Демонстрационной страницей для тестирования
=== React-Native-5.-Jwt-авторизация.md ===
В этом спринте мы реализуем JWT авторизацию с сохранением токена в AsyncStorage и автоматическим добавлением в заголовки запросов.

## 1. Установка дополнительных зависимостей

```bash
npm install @react-native-async-storage/async-storage
npm install react-native-vector-icons
npm install axios

# Для iOS
cd ios && pod install && cd ..
```

## 2. Расширение модели User

**src/models/user.entity.ts:**
```typescript
export default interface User {
    id: number;
    name: string;
    login: string;
    token: string; // JWT токен
    password?: string; // Опционально, не храним в AsyncStorage
}
```

## 3. Обновление сервиса Auth с поддержкой JWT

**src/services/auth.service.ts:**
```typescript
import api from './api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import User from '../models/user.entity';

class AuthService {
    private currentUserValue: User | null = null;
    private listeners: Array<(user: User | null) => void> = [];

    constructor() {
        this.initializeUser();
    }

    private async initializeUser() {
        try {
            const userJson = await AsyncStorage.getItem('user');
            if (userJson) {
                const user: User = JSON.parse(userJson);
                this.currentUserValue = user;
                console.log('Отправили данные пользователя из AsyncStorage');
                this.notifyListeners();
            } else {
                this.currentUserValue = null;
                console.log('AsyncStorage не содержит данных о пользователе');
            }
        } catch (error) {
            console.error('Ошибка парсинга пользователя из AsyncStorage', error);
            this.currentUserValue = null;
            await AsyncStorage.removeItem('user');
        }
    }

    async login(credentials: { login: string; password: string }): Promise<User | null> {
        try {
            const response = await api.post<User>('/Users/Login', credentials);
            const user = response.data;
            if (user && user.token) {
                await AsyncStorage.setItem('user', JSON.stringify(user));
                this.currentUserValue = user;
                this.notifyListeners();
                return user;
            }
            return null;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async register(userData: any): Promise<any> {
        try {
            const response = await api.post('/Users', userData);
            return response.data;
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    }

    async logout(): Promise<void> {
        try {
            await AsyncStorage.removeItem('user');
            this.currentUserValue = null;
            this.notifyListeners();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    getCurrentUser(): User | null {
        return this.currentUserValue;
    }

    getToken(): string | null {
        return this.currentUserValue?.token || null;
    }

    // Для подписки на изменения пользователя (для компонентов)
    subscribe(listener: (user: User | null) => void) {
        this.listeners.push(listener);
        listener(this.currentUserValue); // Немедленно вызвать с текущим значением
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.currentUserValue));
    }
}

// Экспортируем синглтон
export const authService = new AuthService();
```

## 4. Создание JWT интерцептора для Axios

**src/interceptors/jwt.interceptor.ts:**
```typescript
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authService } from '@/services/auth.service';

export const jwtRequestInterceptor = async (config: InternalAxiosRequestConfig) => {
    // Не добавляем токен для запросов авторизации и регистрации
    const isAuthRequest = config.url?.includes('/Users/Login') || 
                          config.url?.includes('/Users/Register');
    
    if (!isAuthRequest) {
        console.log("jwtInterceptor ... Проверка токена");
        
        const token = authService.getToken();
        
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
            console.log('JWT токен добавлен к запросу');
        } else {
            console.log('Пользователь не авторизован, токен не добавлен');
        }
    }

    return config;
};

export const jwtResponseInterceptor = (error: AxiosError) => {
    if (error.response?.status === 401) {
        console.log('Получена ошибка 401 Unauthorized');
        // При 401 ошибке можно автоматически выйти из системы
        // authService.logout();
    }
    return Promise.reject(error);
};
```

## 5. Обновление конфигурации Axios с JWT интерцептором

**src/services/api.config.ts:**
```typescript
import axios from 'axios';
import { Platform } from 'react-native';
import { environment, environmentAndroid } from '../environments/environment';
import { 
    requestInterceptor as loadingRequestInterceptor, 
    responseInterceptor as loadingResponseInterceptor,
    errorInterceptor as loadingErrorInterceptor 
} from '../interceptors/loading.interceptor';
import { errorInterceptor as httpErrorInterceptor } from '../interceptors/error.interceptor';
import { jwtRequestInterceptor, jwtResponseInterceptor } from '../interceptors/jwt.interceptor';

// Выбор правильного URL в зависимости от платформы
const getBaseUrl = () => {
    if (Platform.OS === 'android') {
        return environmentAndroid.api;
    }
    return environment.api;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Request interceptors (выполняются в порядке добавления)
api.interceptors.request.use(async (config) => {
    // JWT интерцептор должен быть асинхронным
    config = await jwtRequestInterceptor(config);
    return config;
});
api.interceptors.request.use(loadingRequestInterceptor);

// Response interceptors (выполняются в обратном порядке)
api.interceptors.response.use(
    (response) => {
        loadingResponseInterceptor(response);
        return response;
    },
    (error) => {
        loadingErrorInterceptor(error);
        jwtResponseInterceptor(error);
        return httpErrorInterceptor(error);
    }
);

export default api;
```

## 6. Обновление контекста авторизации

**src/contexts/AuthContext.tsx:**
```tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import User from '../models/user.entity';
import { authService } from '../services/auth.service';

interface AuthContextType {
    currentUser: User | null;
    login: (login: string, password: string) => Promise<User | null>;
    register: (userData: any) => Promise<any>;
    logout: () => void;
    loading: boolean;
    token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Подписываемся на изменения пользователя из authService
        const unsubscribe = authService.subscribe((user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const login = async (login: string, password: string): Promise<User | null> => {
        try {
            const user = await authService.login({ login, password });
            if (user) {
                Alert.alert('Успех', 'Успешная авторизация!');
                return user;
            }
            return null;
        } catch (error: any) {
            const message = error.response?.data?.message || 'Ошибка авторизации';
            Alert.alert('Ошибка', message);
            throw error;
        }
    };

    const register = async (userData: any): Promise<any> => {
        try {
            const response = await authService.register(userData);
            Alert.alert('Успех', 'Регистрация успешна! Теперь войдите в систему');
            return response;
        } catch (error: any) {
            const errors = error.response?.data?.errors;
            if (errors) {
                const messages = Object.values(errors).flat().join('\n');
                Alert.alert('Ошибка регистрации', messages);
            } else {
                Alert.alert('Ошибка', error.response?.data?.message || 'Ошибка регистрации');
            }
            throw error;
        }
    };

    const logout = async () => {
        await authService.logout();
        Alert.alert('Выход', 'Вы вышли из системы');
    };

    const value = {
        currentUser,
        login,
        register,
        logout,
        loading,
        token: authService.getToken()
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
```

## 7. Создание защищенного маршрута (Auth Guard)

**src/components/ProtectedRoute.tsx:**
```tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    navigation: any;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, navigation }) => {
    const { currentUser, loading } = useAuth();

    useEffect(() => {
        if (!loading && !currentUser) {
            navigation.replace('Auth');
        }
    }, [currentUser, loading, navigation]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3f51b5" />
            </View>
        );
    }

    return currentUser ? <>{children}</> : null;
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
});
```

## 8. Обновление экрана Users с проверкой авторизации

**src/screens/UsersScreen.tsx:**
```tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    Alert,
    TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../services/users.service';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { LoadingSpinner } from '../components/LoadingSpinner';
import User from '../models/user.entity';

interface UsersScreenProps {
    navigation: any;
}

const UsersContent: React.FC<UsersScreenProps> = ({ navigation }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { currentUser, token } = useAuth();

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setError(null);
            const data = await usersService.getAll();
            setUsers(data);
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Сессия истекла. Пожалуйста, войдите в систему заново.');
            } else {
                setError('Не удалось загрузить пользователей');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadUsers();
        setRefreshing(false);
    };

    const handleUserPress = (user: User) => {
        Alert.alert(
            'Информация о пользователе',
            `ID: ${user.id}\nИмя: ${user.name}\nЛогин: ${user.login || 'Не указан'}\nТокен: ${user.token ? 'Есть' : 'Нет'}`,
            [{ text: 'OK' }]
        );
    };

    const renderUserItem = ({ item }: { item: User }) => (
        <TouchableOpacity
            style={styles.userCard}
            onPress={() => handleUserPress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.userAvatar, currentUser?.id === item.id && styles.currentUserAvatar]}>
                <Text style={styles.userAvatarText}>
                    {item.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
                {currentUser?.id === item.id && (
                    <View style={styles.currentUserBadge}>
                        <Icon name="star" size={12} color="#fff" />
                    </View>
                )}
            </View>
            
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name || 'Без имени'}</Text>
                <Text style={styles.userLogin}>{item.login || 'Нет логина'}</Text>
                <Text style={styles.userId}>ID: {item.id}</Text>
            </View>
            
            {item.token && (
                <View style={styles.tokenBadge}>
                    <Icon name="vpn-key" size={16} color="#4caf50" />
                </View>
            )}
            
            <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>
                Всего пользователей: {users.length}
            </Text>
            {token && (
                <View style={styles.tokenInfo}>
                    <Icon name="vpn-key" size={16} color="#4caf50" />
                    <Text style={styles.tokenText}>JWT активен</Text>
                </View>
            )}
        </View>
    );

    if (loading) {
        return <LoadingSpinner fullScreen text="Загрузка пользователей..." />;
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="error-outline" size={60} color="#f44336" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadUsers}>
                    <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={users}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderUserItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="people-outline" size={80} color="#ccc" />
                        <Text style={styles.emptyText}>Нет пользователей</Text>
                    </View>
                }
            />
        </View>
    );
};

const UsersScreen: React.FC<UsersScreenProps> = ({ navigation }) => {
    return (
        <ProtectedRoute navigation={navigation}>
            <UsersContent navigation={navigation} />
        </ProtectedRoute>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    listContent: {
        padding: 16,
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 16,
        color: '#666',
    },
    tokenInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    tokenText: {
        fontSize: 12,
        color: '#4caf50',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3f51b5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
    },
    currentUserAvatar: {
        backgroundColor: '#f50057',
    },
    userAvatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    currentUserBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#ffc107',
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    userLogin: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    userId: {
        fontSize: 12,
        color: '#999',
    },
    tokenBadge: {
        marginRight: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3f51b5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default UsersScreen;
```

## 9. Обновление экрана Profile с отображением токена

**src/screens/ProfileScreen.tsx:**
```tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Share
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../services/users.service';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { LoadingSpinner } from '../components/LoadingSpinner';
import User from '../models/user.entity';

interface ProfileScreenProps {
    navigation: any;
    route: any;
}

const ProfileContent: React.FC<ProfileScreenProps> = ({ navigation, route }) => {
    const { userId } = route.params;
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { currentUser, token } = useAuth();

    useEffect(() => {
        loadUser();
    }, [userId]);

    const loadUser = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await usersService.get(userId);
            setUser(data);
        } catch (err) {
            setError('Не удалось загрузить профиль пользователя');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Пользователь: ${user?.name}\nЛогин: ${user?.login}\nID: ${user?.id}`,
                title: 'Профиль пользователя',
            });
        } catch (error) {
            console.error(error);
        }
    };

    const isOwnProfile = currentUser?.id === user?.id;

    if (loading) {
        return <LoadingSpinner fullScreen text="Загрузка профиля..." />;
    }

    if (error || !user) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="error-outline" size={60} color="#f44336" />
                <Text style={styles.errorText}>{error || 'Пользователь не найден'}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadUser}>
                    <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                {/* Шапка профиля */}
                <View style={styles.header}>
                    <View style={[styles.avatar, isOwnProfile && styles.ownAvatar]}>
                        <Text style={styles.avatarText}>
                            {user.name?.charAt(0).toUpperCase() || user.login.charAt(0).toUpperCase()}
                        </Text>
                        {isOwnProfile && (
                            <View style={styles.ownBadge}>
                                <Icon name="star" size={16} color="#fff" />
                            </View>
                        )}
                    </View>
                    
                    <Text style={styles.name}>{user.name || 'Без имени'}</Text>
                    <Text style={styles.login}>@{user.login}</Text>
                    
                    {isOwnProfile && token && (
                        <View style={styles.tokenContainer}>
                            <Icon name="vpn-key" size={16} color="#4caf50" />
                            <Text style={styles.tokenText}>JWT токен активен</Text>
                        </View>
                    )}
                </View>

                {/* Информация о пользователе */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Информация</Text>
                    
                    <View style={styles.infoRow}>
                        <Icon name="badge" size={20} color="#666" />
                        <Text style={styles.infoLabel}>ID:</Text>
                        <Text style={styles.infoValue}>{user.id}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Icon name="person" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Логин:</Text>
                        <Text style={styles.infoValue}>{user.login}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Icon name="drive-file-rename-outline" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Имя:</Text>
                        <Text style={styles.infoValue}>{user.name || 'Не указано'}</Text>
                    </View>
                    
                    {user.token && (
                        <View style={styles.infoRow}>
                            <Icon name="vpn-key" size={20} color="#4caf50" />
                            <Text style={styles.infoLabel}>Токен:</Text>
                            <Text style={styles.tokenValue} numberOfLines={1}>
                                {user.token.substring(0, 20)}...
                            </Text>
                        </View>
                    )}
                </View>

                {/* Действия */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                        <Icon name="share" size={20} color="#3f51b5" />
                        <Text style={styles.actionText}>Поделиться</Text>
                    </TouchableOpacity>
                    
                    {isOwnProfile && (
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.editButton]}
                            onPress={() => navigation.navigate('Edit', { userId: user.id })}
                        >
                            <Icon name="edit" size={20} color="#fff" />
                            <Text style={[styles.actionText, styles.editButtonText]}>
                                Редактировать
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Дополнительная информация для своего профиля */}
                {isOwnProfile && token && (
                    <View style={styles.tokenInfoCard}>
                        <Text style={styles.tokenInfoTitle}>Ваш JWT токен</Text>
                        <Text style={styles.tokenFullValue} selectable>
                            {token}
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const ProfileScreen: React.FC<ProfileScreenProps> = (props) => {
    return (
        <ProtectedRoute navigation={props.navigation}>
            <ProfileContent {...props} />
        </ProtectedRoute>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 16,
    },
    header: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#3f51b5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    ownAvatar: {
        backgroundColor: '#f50057',
    },
    avatarText: {
        color: '#fff',
        fontSize: 40,
        fontWeight: 'bold',
    },
    ownBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#ffc107',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    login: {
        fontSize: 16,
        color: '#666',
        marginBottom: 12,
    },
    tokenContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    tokenText: {
        fontSize: 12,
        color: '#4caf50',
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 12,
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
        width: 60,
    },
    infoValue: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    tokenValue: {
        flex: 1,
        fontSize: 12,
        color: '#4caf50',
        fontFamily: 'monospace',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: '#3f51b5',
    },
    editButton: {
        backgroundColor: '#3f51b5',
        borderColor: '#3f51b5',
    },
    actionText: {
        fontSize: 14,
        color: '#3f51b5',
        fontWeight: '500',
    },
    editButtonText: {
        color: '#fff',
    },
    tokenInfoCard: {
        backgroundColor: '#e8f5e8',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    tokenInfoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4caf50',
        marginBottom: 8,
    },
    tokenFullValue: {
        fontSize: 12,
        color: '#333',
        fontFamily: 'monospace',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3f51b5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default ProfileScreen;
```

## 10. Обновление навигации

**src/App.tsx:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

import { AuthProvider } from './contexts/AuthContext';
import { LoadingOverlay } from './components/LoadingOverlay';
import HomeScreen from './screens/HomeScreen';
import UsersScreen from './screens/UsersScreen';
import ProfileScreen from './screens/ProfileScreen';
import AuthScreen from './screens/AuthScreen';
import SignScreen from './screens/SignScreen';
import LoadingDemoScreen from './screens/LoadingDemoScreen';
import Header from './components/Header';

export type RootStackParamList = {
    Home: undefined;
    Users: undefined;
    Profile: { userId: number };
    Auth: { registered?: boolean } | undefined;
    Sign: undefined;
    LoadingDemo: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
    return (
        <SafeAreaProvider>
            <StatusBar backgroundColor="#3f51b5" barStyle="light-content" />
            <AuthProvider>
                <NavigationContainer>
                    <LoadingOverlay text="Загрузка..." showProgress />
                    <Stack.Navigator
                        screenOptions={({ navigation, route }) => ({
                            header: () => (
                                <Header
                                    navigation={navigation}
                                    showBack={route.name !== 'Home'}
                                    title={route.name === 'Home' ? 'Главная' : 
                                           route.name === 'Users' ? 'Пользователи' :
                                           route.name === 'Profile' ? 'Профиль' :
                                           route.name === 'Auth' ? 'Вход' : 
                                           route.name === 'Sign' ? 'Регистрация' : 
                                           'Демо лоадера'}
                                />
                            ),
                        })}
                    >
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="Users" component={UsersScreen} />
                        <Stack.Screen name="Profile" component={ProfileScreen} />
                        <Stack.Screen name="Auth" component={AuthScreen} />
                        <Stack.Screen name="Sign" component={SignScreen} />
                        <Stack.Screen name="LoadingDemo" component={LoadingDemoScreen} />
                    </Stack.Navigator>
                </NavigationContainer>
            </AuthProvider>
        </SafeAreaProvider>
    );
};

export default App;
```

## 11. Обновление компонента Header

**src/components/Header.tsx:**
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
    navigation: any;
    showBack?: boolean;
    title: string;
}

const Header: React.FC<HeaderProps> = ({ navigation, showBack, title }) => {
    const { currentUser, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigation.replace('Auth');
    };

    const handleProfilePress = () => {
        if (currentUser) {
            navigation.navigate('Profile', { userId: currentUser.id });
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.leftContainer}>
                    {showBack ? (
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.iconButton}
                        >
                            <Icon name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                    ) : null}
                    <Text style={styles.title}>{title}</Text>
                </View>

                <View style={styles.rightContainer}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Home')}
                        style={styles.iconButton}
                    >
                        <Icon name="home" size={24} color="#fff" />
                    </TouchableOpacity>

                    {currentUser && (
                        <>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Users')}
                                style={styles.iconButton}
                            >
                                <Icon name="people" size={24} color="#fff" />
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                onPress={handleProfilePress}
                                style={styles.iconButton}
                            >
                                <Icon name="account-circle" size={24} color="#fff" />
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                onPress={handleLogout}
                                style={styles.iconButton}
                            >
                                <Icon name="logout" size={24} color="#fff" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
            {currentUser && (
                <View style={styles.userInfo}>
                    <Icon name="vpn-key" size={12} color="#ffeb3b" />
                    <Text style={styles.userText}>{currentUser.login}</Text>
                    {currentUser.token && (
                        <View style={styles.tokenDot} />
                    )}
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#3f51b5',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '500',
        marginLeft: 8,
    },
    iconButton: {
        padding: 8,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 6,
    },
    userText: {
        color: '#fff',
        fontSize: 12,
        opacity: 0.9,
    },
    tokenDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4caf50',
    },
});

export default Header;
```

## 12. Обновление экрана Home

**src/screens/HomeScreen.tsx:**
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
    navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    const { currentUser, token } = useAuth();

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.welcomeCard}>
                    <Icon name="waving-hand" size={60} color="#3f51b5" />
                    {currentUser ? (
                        <>
                            <Text style={styles.welcomeTitle}>
                                Добро пожаловать, {currentUser.login}!
                            </Text>
                            <Text style={styles.welcomeText}>
                                ID: {currentUser.id} • {currentUser.name || 'Без имени'}
                            </Text>
                            {token && (
                                <View style={styles.tokenBadge}>
                                    <Icon name="vpn-key" size={16} color="#4caf50" />
                                    <Text style={styles.tokenBadgeText}>JWT активен</Text>
                                </View>
                            )}
                        </>
                    ) : (
                        <>
                            <Text style={styles.welcomeTitle}>Добро пожаловать!</Text>
                            <Text style={styles.welcomeText}>
                                Войдите или зарегистрируйтесь чтобы продолжить
                            </Text>
                        </>
                    )}
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>О приложении</Text>
                    <Text style={styles.infoText}>
                        SampleApp.RN - мобильная версия приложения для управления пользователями.
                        Использует JWT авторизацию для защиты API запросов.
                    </Text>
                </View>

                <View style={styles.featuresContainer}>
                    <Text style={styles.featuresTitle}>Возможности:</Text>
                    
                    {currentUser ? (
                        <>
                            <TouchableOpacity
                                style={styles.featureItem}
                                onPress={() => navigation.navigate('Users')}
                            >
                                <Icon name="people" size={24} color="#3f51b5" />
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureTitle}>Пользователи</Text>
                                    <Text style={styles.featureDescription}>
                                        Просмотр списка пользователей
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#999" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.featureItem}
                                onPress={() => navigation.navigate('Profile', { userId: currentUser.id })}
                            >
                                <Icon name="account-circle" size={24} color="#3f51b5" />
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureTitle}>Мой профиль</Text>
                                    <Text style={styles.featureDescription}>
                                        Просмотр и редактирование профиля
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#999" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.featureItem}
                                onPress={() => navigation.navigate('LoadingDemo')}
                            >
                                <Icon name="hourglass-empty" size={24} color="#3f51b5" />
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureTitle}>Демо лоадера</Text>
                                    <Text style={styles.featureDescription}>
                                        Тестирование глобального индикатора загрузки
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#999" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={styles.featureItem}
                                onPress={() => navigation.navigate('Auth')}
                            >
                                <Icon name="login" size={24} color="#3f51b5" />
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureTitle}>Вход</Text>
                                    <Text style={styles.featureDescription}>
                                        Авторизуйтесь в системе
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#999" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.featureItem}
                                onPress={() => navigation.navigate('Sign')}
                            >
                                <Icon name="person-add" size={24} color="#3f51b5" />
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureTitle}>Регистрация</Text>
                                    <Text style={styles.featureDescription}>
                                        Создайте новый аккаунт
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#999" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {currentUser && token && (
                    <View style={styles.jwtInfo}>
                        <Text style={styles.jwtTitle}>JWT токен</Text>
                        <Text style={styles.jwtValue} numberOfLines={2}>
                            {token.substring(0, 50)}...
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 16,
    },
    welcomeCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    welcomeText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    tokenBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 12,
        gap: 6,
    },
    tokenBadgeText: {
        fontSize: 12,
        color: '#4caf50',
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    featuresContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    featuresTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    featureTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 12,
        color: '#999',
    },
    jwtInfo: {
        backgroundColor: '#e8f5e8',
        borderRadius: 12,
        padding: 16,
    },
    jwtTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4caf50',
        marginBottom: 8,
    },
    jwtValue: {
        fontSize: 12,
        color: '#333',
        fontFamily: 'monospace',
    },
});

export default HomeScreen;
```

## Тестирование функциональности

1. **Сохранение пользователя**:
   - Авторизуйтесь в системе
   - Закройте и перезапустите приложение
   - Пользователь должен остаться авторизованным

2. **JWT в запросах**:
   - Откройте экран пользователей
   - Все запросы должны содержать заголовок `Authorization: Bearer <token>`

3. **Защита маршрутов**:
   - Выйдите из системы
   - Попробуйте перейти на экран пользователей через навигацию
   - Должно перенаправить на экран входа

4. **Отображение токена**:
   - На главном экране отображается информация о JWT
   - В профиле виден полный токен (можно скопировать)

## Сравнение Angular vs React Native подходов для JWT

| Angular | React Native |
|---------|--------------|
| `localStorage` | `AsyncStorage` |
| `HttpInterceptorFn` | Axios interceptors |
| `authService.currentUser()` | `useAuth()` хук |
| `canActivate` guard | `ProtectedRoute` компонент |
| `Bearer ${token}` | `Bearer ${token}` в headers |
| `inject(Router)` | `navigation.replace()` |

## Команды Git

```bash
# Проверка статуса
git status

# Создание ветки sprint5
git checkout -b sprint5

# Добавление всех изменений
git add -A

# Создание коммита
git commit -m "Выполнен sprint5: JWT авторизация"

# Переключение на master
git checkout master

# Ребейз sprint5 в master
git rebase sprint5
```

Эта реализация полностью воспроизводит функциональность Angular JWT подхода на React Native с:
- Персистентностью пользователя при перезапуске приложения
- Автоматическим добавлением JWT токена к запросам
- Обработкой 401 ошибок
- Защитой маршрутов через компонент-обертку
- Отображением информации о токене в интерфейсе
=== React-Native-6.-Guard.md ===
В этом спринте мы реализуем защиту маршрутов (Auth Guard) и защиту от несохраненных изменений (CanDeactivate) в React Native приложении.

## 1. Установка дополнительных зависимостей

```bash
npm install @react-native-async-storage/async-storage
npm install react-native-vector-icons
npm install @react-navigation/native @react-navigation/native-stack

# Для iOS
cd ios && pod install && cd ..
```

## 2. Создание Auth Guard (защита авторизованных пользователей)

**src/components/guards/AuthGuard.tsx:**
```tsx
import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

interface AuthGuardProps {
    children: React.ReactNode;
    navigation: any;
    redirectTo?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
    children,
    navigation,
    redirectTo = 'Auth'
}) => {
    const { currentUser, loading } = useAuth();

    useEffect(() => {
        if (!loading && !currentUser) {
            // Показываем уведомление
            Alert.alert(
                'Доступ запрещен',
                'Для доступа к этой странице необходимо авторизоваться',
                [{ text: 'OK' }]
            );
            
            // Перенаправляем на страницу авторизации
            navigation.replace(redirectTo);
        }
    }, [currentUser, loading, navigation, redirectTo]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3f51b5" />
                <Text style={styles.loadingText}>Проверка авторизации...</Text>
            </View>
        );
    }

    return currentUser ? <>{children}</> : null;
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
});
```

## 3. Создание Guard для предотвращения несохраненных изменений

**src/components/guards/PreventUnsavedChanges.tsx:**
```tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    BackHandler,
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

interface PreventUnsavedChangesProps {
    when: boolean;
    message?: string;
    children: React.ReactNode;
    onConfirm?: () => void;
    onCancel?: () => void;
    title?: string;
}

export const PreventUnsavedChanges: React.FC<PreventUnsavedChangesProps> = ({
    when,
    message = 'У вас есть несохраненные изменения. Вы действительно хотите покинуть страницу?',
    children,
    onConfirm,
    onCancel,
    title = 'Несохраненные изменения'
}) => {
    const navigation = useNavigation();
    const [showDialog, setShowDialog] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

    // Перехватываем аппаратную кнопку "Назад" на Android
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (when) {
                setShowDialog(true);
                return true; // Предотвращаем стандартное поведение
            }
            return false;
        });

        return () => backHandler.remove();
    }, [when]);

    // Перехватываем навигацию внутри приложения
    useFocusEffect(
        React.useCallback(() => {
            const unsubscribe = navigation.addListener('beforeRemove', (e) => {
                if (!when) {
                    return;
                }

                // Предотвращаем навигацию
                e.preventDefault();

                // Показываем диалог подтверждения
                setShowDialog(true);
                setPendingNavigation(() => () => navigation.dispatch(e.data.action));
            });

            return unsubscribe;
        }, [navigation, when])
    );

    const handleConfirm = () => {
        setShowDialog(false);
        if (onConfirm) {
            onConfirm();
        }
        if (pendingNavigation) {
            pendingNavigation();
        }
        setPendingNavigation(null);
    };

    const handleCancel = () => {
        setShowDialog(false);
        setPendingNavigation(null);
        if (onCancel) {
            onCancel();
        }
    };

    return (
        <>
            {children}
            
            <Modal
                visible={showDialog}
                transparent
                animationType="fade"
                onRequestClose={handleCancel}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Icon name="warning" size={30} color="#ff9800" />
                            <Text style={styles.modalTitle}>{title}</Text>
                        </View>
                        
                        <Text style={styles.modalMessage}>{message}</Text>
                        
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={handleCancel}
                            >
                                <Text style={styles.cancelButtonText}>Отмена</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleConfirm}
                            >
                                <Text style={styles.confirmButtonText}>Покинуть страницу</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: '80%',
        maxWidth: 400,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    modalMessage: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        lineHeight: 20,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    confirmButton: {
        backgroundColor: '#f44336',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
});
```

## 4. Создание хука для защиты от несохраненных изменений

**src/hooks/usePreventUnsavedChanges.ts:**
```tsx
import { useState, useCallback, useEffect } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

interface UsePreventUnsavedChangesProps {
    isDirty: boolean;
    message?: string;
    title?: string;
}

export const usePreventUnsavedChanges = ({
    isDirty,
    message = 'У вас есть несохраненные изменения. Вы действительно хотите покинуть страницу?',
    title = 'Несохраненные изменения'
}: UsePreventUnsavedChangesProps) => {
    const navigation = useNavigation();
    const [showDialog, setShowDialog] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

    // Перехватываем аппаратную кнопку "Назад" на Android
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (isDirty) {
                setShowDialog(true);
                return true; // Предотвращаем стандартное поведение
            }
            return false;
        });

        return () => backHandler.remove();
    }, [isDirty]);

    // Перехватываем навигацию внутри приложения
    useFocusEffect(
        useCallback(() => {
            const unsubscribe = navigation.addListener('beforeRemove', (e) => {
                if (!isDirty) {
                    return;
                }

                // Предотвращаем навигацию
                e.preventDefault();

                // Показываем Alert
                Alert.alert(
                    title,
                    message,
                    [
                        {
                            text: 'Отмена',
                            style: 'cancel',
                            onPress: () => {}
                        },
                        {
                            text: 'Покинуть страницу',
                            style: 'destructive',
                            onPress: () => navigation.dispatch(e.data.action)
                        }
                    ]
                );
            });

            return unsubscribe;
        }, [navigation, isDirty, message, title])
    );

    const confirmNavigation = useCallback(() => {
        setShowDialog(false);
        if (pendingNavigation) {
            pendingNavigation();
        }
        setPendingNavigation(null);
    }, [pendingNavigation]);

    const cancelNavigation = useCallback(() => {
        setShowDialog(false);
        setPendingNavigation(null);
    }, []);

    return {
        showDialog,
        confirmNavigation,
        cancelNavigation,
        isDirty
    };
};
```

## 5. Создание экрана регистрации с защитой от несохраненных изменений

**src/screens/SignScreen.tsx:**
```tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { FormInput } from '../components/FormInput';
import { PreventUnsavedChanges } from '../components/guards/PreventUnsavedChanges';
import { validateLogin, validatePasswordLength, validateName } from '../validators/customValidators';

interface SignFormData {
    login: string;
    password: string;
    name: string;
}

interface SignScreenProps {
    navigation: any;
}

const SignScreen: React.FC<SignScreenProps> = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const { register: registerUser } = useAuth();

    const {
        control,
        handleSubmit,
        watch,
        formState: { errors, isValid, isDirty, touchedFields },
        setError,
        clearErrors,
        reset
    } = useForm<SignFormData>({
        mode: 'onChange',
        defaultValues: {
            login: '',
            password: '',
            name: ''
        }
    });

    const loginValue = watch('login');
    const passwordValue = watch('password');

    // Очистка ошибки для логина при изменении
    useEffect(() => {
        if (loginValue !== 'admin') {
            clearErrors('login');
        }
    }, [loginValue, clearErrors]);

    const onSubmit = async (data: SignFormData) => {
        try {
            setLoading(true);
            setServerError(null);
            await registerUser(data);
            reset(); // Сбрасываем форму после успешной регистрации
            navigation.replace('Auth', { registered: true });
        } catch (err: any) {
            const errors = err.response?.data?.errors;
            if (errors) {
                if (errors.Login) {
                    setError('login', { 
                        type: 'manual', 
                        message: errors.Login[0] 
                    });
                }
                if (errors.Password) {
                    setError('password', { 
                        type: 'manual', 
                        message: errors.Password[0] 
                    });
                }
                setServerError('Проверьте правильность заполнения полей');
            } else {
                setServerError(err.response?.data?.message || 'Ошибка регистрации');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <PreventUnsavedChanges
            when={isDirty && !loading}
            message="У вас есть несохраненные изменения. Вы действительно хотите покинуть страницу?"
            title="Несохраненные изменения"
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <Icon name="person-add" size={60} color="#3f51b5" />
                            <Text style={styles.title}>Регистрация</Text>
                            <Text style={styles.subtitle}>Создайте новый аккаунт</Text>
                        </View>

                        <View style={styles.form}>
                            {serverError && (
                                <View style={styles.serverErrorContainer}>
                                    <Icon name="error" size={16} color="#f44336" />
                                    <Text style={styles.serverErrorText}>{serverError}</Text>
                                </View>
                            )}

                            {/* Поле Name */}
                            <Controller
                                control={control}
                                name="name"
                                rules={{ validate: validateName }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <FormInput
                                        label="Имя"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        error={errors.name?.message}
                                        touched={touchedFields.name}
                                        autoCapitalize="words"
                                        icon="badge"
                                    />
                                )}
                            />

                            {/* Поле Login */}
                            <Controller
                                control={control}
                                name="login"
                                rules={{ validate: validateLogin }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <FormInput
                                        label="Логин"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        error={errors.login?.message}
                                        touched={touchedFields.login}
                                        required
                                        icon="person"
                                    />
                                )}
                            />

                            {/* Дополнительное предупреждение для admin */}
                            {loginValue === 'admin' && touchedFields.login && !errors.login && (
                                <View style={styles.warningContainer}>
                                    <Icon name="warning" size={16} color="#ff9800" />
                                    <Text style={styles.warningText}>
                                        Недопустимый логин пользователя!
                                    </Text>
                                </View>
                            )}

                            {/* Поле Password */}
                            <Controller
                                control={control}
                                name="password"
                                rules={{ validate: validatePasswordLength }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <FormInput
                                        label="Пароль"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        error={errors.password?.message}
                                        touched={touchedFields.password}
                                        secureTextEntry
                                        required
                                        icon="lock"
                                    />
                                )}
                            />

                            {/* Индикатор несохраненных изменений */}
                            {isDirty && (
                                <View style={styles.dirtyIndicator}>
                                    <Icon name="info" size={16} color="#2196f3" />
                                    <Text style={styles.dirtyText}>
                                        ✏️ У вас есть несохраненные изменения
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
                                onPress={handleSubmit(onSubmit)}
                                disabled={!isValid || loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Зарегистрироваться</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.linkButton}
                                onPress={() => {
                                    if (isDirty) {
                                        Alert.alert(
                                            'Несохраненные изменения',
                                            'У вас есть несохраненные изменения. Вы действительно хотите покинуть страницу?',
                                            [
                                                {
                                                    text: 'Отмена',
                                                    style: 'cancel'
                                                },
                                                {
                                                    text: 'Покинуть',
                                                    onPress: () => navigation.navigate('Auth')
                                                }
                                            ]
                                        );
                                    } else {
                                        navigation.navigate('Auth');
                                    }
                                }}
                            >
                                <Text style={styles.linkText}>
                                    Уже есть аккаунт? Войти
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </PreventUnsavedChanges>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    serverErrorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffebee',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    serverErrorText: {
        color: '#f44336',
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff3e0',
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
    },
    warningText: {
        color: '#ff9800',
        fontSize: 12,
        marginLeft: 8,
        flex: 1,
    },
    dirtyIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e3f2fd',
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
    },
    dirtyText: {
        color: '#2196f3',
        fontSize: 12,
        marginLeft: 8,
    },
    button: {
        backgroundColor: '#3f51b5',
        borderRadius: 8,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#9fa8da',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    linkText: {
        color: '#3f51b5',
        fontSize: 14,
    },
});

export default SignScreen;
```

## 6. Обновление экрана авторизации с обработкой returnUrl

**src/screens/AuthScreen.tsx:**
```tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { FormInput } from '../components/FormInput';

interface AuthFormData {
    login: string;
    password: string;
}

interface AuthScreenProps {
    navigation: any;
    route: any;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ navigation, route }) => {
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const { login, currentUser } = useAuth();

    // Получаем URL для редиректа после авторизации
    const returnUrl = route.params?.returnUrl || 'Home';

    useEffect(() => {
        if (route.params?.registered) {
            setSuccessMessage('Регистрация успешна! Теперь вы можете войти.');
        }
        
        if (currentUser) {
            navigation.replace(returnUrl);
        }
    }, [route.params, currentUser, navigation, returnUrl]);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid, touchedFields }
    } = useForm<AuthFormData>({
        mode: 'onChange',
        defaultValues: {
            login: '',
            password: ''
        }
    });

    const validateLogin = (value: string) => {
        if (!value) return 'Логин обязателен';
        return undefined;
    };

    const validatePassword = (value: string) => {
        if (!value) return 'Пароль обязателен';
        if (value.length < 3) return 'Пароль должен содержать минимум 3 символа';
        return undefined;
    };

    const onSubmit = async (data: AuthFormData) => {
        try {
            setLoading(true);
            await login(data.login, data.password);
            // Редирект произойдет в useEffect
        } catch (error) {
            // Ошибка уже обработана в контексте
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Icon name="lock" size={60} color="#3f51b5" />
                        <Text style={styles.title}>Авторизация</Text>
                        <Text style={styles.subtitle}>Войдите в свой аккаунт</Text>
                    </View>

                    <View style={styles.form}>
                        {successMessage && (
                            <View style={styles.successContainer}>
                                <Icon name="check-circle" size={16} color="#4caf50" />
                                <Text style={styles.successText}>{successMessage}</Text>
                            </View>
                        )}

                        {returnUrl !== 'Home' && (
                            <View style={styles.infoContainer}>
                                <Icon name="info" size={16} color="#2196f3" />
                                <Text style={styles.infoText}>
                                    Для доступа к запрошенной странице необходимо войти в систему
                                </Text>
                            </View>
                        )}

                        {/* Поле Login */}
                        <Controller
                            control={control}
                            name="login"
                            rules={{ validate: validateLogin }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <FormInput
                                    label="Логин"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.login?.message}
                                    touched={touchedFields.login}
                                    required
                                    icon="person"
                                />
                            )}
                        />

                        {/* Поле Password */}
                        <Controller
                            control={control}
                            name="password"
                            rules={{ validate: validatePassword }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <FormInput
                                    label="Пароль"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.password?.message}
                                    touched={touchedFields.password}
                                    secureTextEntry
                                    required
                                    icon="lock"
                                />
                            )}
                        />

                        <TouchableOpacity
                            style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
                            onPress={handleSubmit(onSubmit)}
                            disabled={!isValid || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Войти</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => navigation.navigate('Sign')}
                        >
                            <Text style={styles.linkText}>
                                Нет аккаунта? Зарегистрироваться
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    successContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    successText: {
        color: '#4caf50',
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e3f2fd',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    infoText: {
        color: '#2196f3',
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    button: {
        backgroundColor: '#3f51b5',
        borderRadius: 8,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#9fa8da',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    linkText: {
        color: '#3f51b5',
        fontSize: 14,
    },
});

export default AuthScreen;
```

## 7. Обновление экрана Users с защитой AuthGuard

**src/screens/UsersScreen.tsx:**
```tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    Alert,
    TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../services/users.service';
import { useAuth } from '../contexts/AuthContext';
import { AuthGuard } from '../components/guards/AuthGuard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import User from '../models/user.entity';

interface UsersScreenProps {
    navigation: any;
}

const UsersContent: React.FC<UsersScreenProps> = ({ navigation }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { currentUser, token } = useAuth();

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setError(null);
            const data = await usersService.getAll();
            setUsers(data);
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Сессия истекла. Пожалуйста, войдите в систему заново.');
                // Через 2 секунды перенаправляем на вход
                setTimeout(() => {
                    navigation.replace('Auth', { returnUrl: 'Users' });
                }, 2000);
            } else {
                setError('Не удалось загрузить пользователей');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadUsers();
        setRefreshing(false);
    };

    const handleUserPress = (user: User) => {
        navigation.navigate('Profile', { userId: user.id });
    };

    const renderUserItem = ({ item }: { item: User }) => (
        <TouchableOpacity
            style={styles.userCard}
            onPress={() => handleUserPress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.userAvatar, currentUser?.id === item.id && styles.currentUserAvatar]}>
                <Text style={styles.userAvatarText}>
                    {item.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
                {currentUser?.id === item.id && (
                    <View style={styles.currentUserBadge}>
                        <Icon name="star" size={12} color="#fff" />
                    </View>
                )}
            </View>
            
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name || 'Без имени'}</Text>
                <Text style={styles.userLogin}>{item.login || 'Нет логина'}</Text>
                <Text style={styles.userId}>ID: {item.id}</Text>
            </View>
            
            {item.token && (
                <View style={styles.tokenBadge}>
                    <Icon name="vpn-key" size={16} color="#4caf50" />
                </View>
            )}
            
            <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>
                Всего пользователей: {users.length}
            </Text>
            {token && (
                <View style={styles.tokenInfo}>
                    <Icon name="vpn-key" size={16} color="#4caf50" />
                    <Text style={styles.tokenText}>JWT активен</Text>
                </View>
            )}
        </View>
    );

    if (loading) {
        return <LoadingSpinner fullScreen text="Загрузка пользователей..." />;
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="error-outline" size={60} color="#f44336" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadUsers}>
                    <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={users}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderUserItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="people-outline" size={80} color="#ccc" />
                        <Text style={styles.emptyText}>Нет пользователей</Text>
                    </View>
                }
            />
        </View>
    );
};

const UsersScreen: React.FC<UsersScreenProps> = ({ navigation }) => {
    return (
        <AuthGuard navigation={navigation} redirectTo="Auth">
            <UsersContent navigation={navigation} />
        </AuthGuard>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    listContent: {
        padding: 16,
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 16,
        color: '#666',
    },
    tokenInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    tokenText: {
        fontSize: 12,
        color: '#4caf50',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3f51b5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
    },
    currentUserAvatar: {
        backgroundColor: '#f50057',
    },
    userAvatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    currentUserBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#ffc107',
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    userLogin: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    userId: {
        fontSize: 12,
        color: '#999',
    },
    tokenBadge: {
        marginRight: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3f51b5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default UsersScreen;
```

## 8. Обновление экрана Profile с защитой AuthGuard

**src/screens/ProfileScreen.tsx:**
```tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Share
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../services/users.service';
import { useAuth } from '../contexts/AuthContext';
import { AuthGuard } from '../components/guards/AuthGuard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import User from '../models/user.entity';

interface ProfileScreenProps {
    navigation: any;
    route: any;
}

const ProfileContent: React.FC<ProfileScreenProps> = ({ navigation, route }) => {
    const { userId } = route.params;
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { currentUser, token } = useAuth();

    useEffect(() => {
        loadUser();
    }, [userId]);

    const loadUser = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await usersService.get(userId);
            setUser(data);
        } catch (err) {
            setError('Не удалось загрузить профиль пользователя');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Пользователь: ${user?.name}\nЛогин: ${user?.login}\nID: ${user?.id}`,
                title: 'Профиль пользователя',
            });
        } catch (error) {
            console.error(error);
        }
    };

    const isOwnProfile = currentUser?.id === user?.id;

    if (loading) {
        return <LoadingSpinner fullScreen text="Загрузка профиля..." />;
    }

    if (error || !user) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="error-outline" size={60} color="#f44336" />
                <Text style={styles.errorText}>{error || 'Пользователь не найден'}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadUser}>
                    <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                {/* Шапка профиля */}
                <View style={styles.header}>
                    <View style={[styles.avatar, isOwnProfile && styles.ownAvatar]}>
                        <Text style={styles.avatarText}>
                            {user.name?.charAt(0).toUpperCase() || user.login.charAt(0).toUpperCase()}
                        </Text>
                        {isOwnProfile && (
                            <View style={styles.ownBadge}>
                                <Icon name="star" size={16} color="#fff" />
                            </View>
                        )}
                    </View>
                    
                    <Text style={styles.name}>{user.name || 'Без имени'}</Text>
                    <Text style={styles.login}>@{user.login}</Text>
                    
                    {isOwnProfile && token && (
                        <View style={styles.tokenContainer}>
                            <Icon name="vpn-key" size={16} color="#4caf50" />
                            <Text style={styles.tokenText}>JWT токен активен</Text>
                        </View>
                    )}
                </View>

                {/* Информация о пользователе */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Информация</Text>
                    
                    <View style={styles.infoRow}>
                        <Icon name="badge" size={20} color="#666" />
                        <Text style={styles.infoLabel}>ID:</Text>
                        <Text style={styles.infoValue}>{user.id}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Icon name="person" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Логин:</Text>
                        <Text style={styles.infoValue}>{user.login}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Icon name="drive-file-rename-outline" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Имя:</Text>
                        <Text style={styles.infoValue}>{user.name || 'Не указано'}</Text>
                    </View>
                    
                    {user.token && (
                        <View style={styles.infoRow}>
                            <Icon name="vpn-key" size={20} color="#4caf50" />
                            <Text style={styles.infoLabel}>Токен:</Text>
                            <Text style={styles.tokenValue} numberOfLines={1}>
                                {user.token.substring(0, 20)}...
                            </Text>
                        </View>
                    )}
                </View>

                {/* Действия */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                        <Icon name="share" size={20} color="#3f51b5" />
                        <Text style={styles.actionText}>Поделиться</Text>
                    </TouchableOpacity>
                    
                    {isOwnProfile && (
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.editButton]}
                            onPress={() => navigation.navigate('Edit', { userId: user.id })}
                        >
                            <Icon name="edit" size={20} color="#fff" />
                            <Text style={[styles.actionText, styles.editButtonText]}>
                                Редактировать
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Дополнительная информация для своего профиля */}
                {isOwnProfile && token && (
                    <View style={styles.tokenInfoCard}>
                        <Text style={styles.tokenInfoTitle}>Ваш JWT токен</Text>
                        <Text style={styles.tokenFullValue} selectable>
                            {token}
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const ProfileScreen: React.FC<ProfileScreenProps> = (props) => {
    return (
        <AuthGuard navigation={props.navigation} redirectTo="Auth">
            <ProfileContent {...props} />
        </AuthGuard>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 16,
    },
    header: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#3f51b5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    ownAvatar: {
        backgroundColor: '#f50057',
    },
    avatarText: {
        color: '#fff',
        fontSize: 40,
        fontWeight: 'bold',
    },
    ownBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#ffc107',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    login: {
        fontSize: 16,
        color: '#666',
        marginBottom: 12,
    },
    tokenContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    tokenText: {
        fontSize: 12,
        color: '#4caf50',
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 12,
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
        width: 60,
    },
    infoValue: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    tokenValue: {
        flex: 1,
        fontSize: 12,
        color: '#4caf50',
        fontFamily: 'monospace',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: '#3f51b5',
    },
    editButton: {
        backgroundColor: '#3f51b5',
        borderColor: '#3f51b5',
    },
    actionText: {
        fontSize: 14,
        color: '#3f51b5',
        fontWeight: '500',
    },
    editButtonText: {
        color: '#fff',
    },
    tokenInfoCard: {
        backgroundColor: '#e8f5e8',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    tokenInfoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4caf50',
        marginBottom: 8,
    },
    tokenFullValue: {
        fontSize: 12,
        color: '#333',
        fontFamily: 'monospace',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3f51b5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default ProfileScreen;
```

## 9. Обновление навигации для передачи параметров

**src/App.tsx:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

import { AuthProvider } from './contexts/AuthContext';
import { LoadingOverlay } from './components/LoadingOverlay';
import HomeScreen from './screens/HomeScreen';
import UsersScreen from './screens/UsersScreen';
import ProfileScreen from './screens/ProfileScreen';
import AuthScreen from './screens/AuthScreen';
import SignScreen from './screens/SignScreen';
import LoadingDemoScreen from './screens/LoadingDemoScreen';
import Header from './components/Header';

export type RootStackParamList = {
    Home: undefined;
    Users: undefined;
    Profile: { userId: number };
    Auth: { registered?: boolean; returnUrl?: string } | undefined;
    Sign: undefined;
    LoadingDemo: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
    return (
        <SafeAreaProvider>
            <StatusBar backgroundColor="#3f51b5" barStyle="light-content" />
            <AuthProvider>
                <NavigationContainer>
                    <LoadingOverlay text="Загрузка..." showProgress />
                    <Stack.Navigator
                        screenOptions={({ navigation, route }) => ({
                            header: () => (
                                <Header
                                    navigation={navigation}
                                    showBack={route.name !== 'Home'}
                                    title={route.name === 'Home' ? 'Главная' : 
                                           route.name === 'Users' ? 'Пользователи' :
                                           route.name === 'Profile' ? 'Профиль' :
                                           route.name === 'Auth' ? 'Вход' : 
                                           route.name === 'Sign' ? 'Регистрация' : 
                                           'Демо лоадера'}
                                />
                            ),
                        })}
                    >
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="Users" component={UsersScreen} />
                        <Stack.Screen name="Profile" component={ProfileScreen} />
                        <Stack.Screen name="Auth" component={AuthScreen} />
                        <Stack.Screen name="Sign" component={SignScreen} />
                        <Stack.Screen name="LoadingDemo" component={LoadingDemoScreen} />
                    </Stack.Navigator>
                </NavigationContainer>
            </AuthProvider>
        </SafeAreaProvider>
    );
};

export default App;
```

## Тестирование функциональности

1. **Тест AuthGuard**:
   - Выйдите из системы
   - Попробуйте перейти на экран пользователей через навигацию
   - Должно появиться уведомление о необходимости авторизации
   - Должен произойти редирект на экран входа

2. **Тест редиректа после авторизации**:
   - Попробуйте перейти на защищенный экран (например, Users)
   - Вы будете перенаправлены на Auth с returnUrl
   - После успешной авторизации вернетесь на запрошенный экран

3. **Тест PreventUnsavedChanges**:
   - Перейдите на экран регистрации
   - Заполните любое поле
   - Нажмите аппаратную кнопку "Назад" на Android
   - Должно появиться диалоговое окно с подтверждением

4. **Тест навигации с несохраненными изменениями**:
   - На экране регистрации заполните поля
   - Попробуйте перейти по ссылке "Уже есть аккаунт?"
   - Должен появиться диалог подтверждения

## Сравнение Angular vs React Native подходов для Guards

| Angular | React Native |
|---------|--------------|
| `CanActivateFn` | `AuthGuard` компонент-обертка |
| `CanDeactivateFn` | `PreventUnsavedChanges` компонент |
| `inject(Router)` | `navigation` из пропсов |
| `snackBar.open()` | `Alert.alert()` |
| `queryParams` | `route.params` |
| `confirm()` | Кастомный `Modal` или `Alert` |

## Команды Git

```bash
# Проверка статуса
git status

# Создание ветки sprint6
git checkout -b sprint6

# Добавление всех изменений
git add -A

# Создание коммита
git commit -m "Выполнен sprint6: Защитники маршрутов"

# Переключение на master
git checkout master

# Ребейз sprint6 в master
git rebase sprint6
```

Эта реализация полностью воспроизводит функциональность Angular guards на React Native с:
- Защитой маршрутов от неавторизованных пользователей
- Сохранением returnUrl для редиректа после авторизации
- Защитой от потери несохраненных данных в форме
- Диалогом подтверждения при попытке ухода со страницы
- Обработкой аппаратной кнопки "Назад" на Android
=== React-Native-7.-Профиль-пользователя.md ===
В этом спринте мы создадим профиль пользователя с меню в хедере и динамическим экраном для просмотра профиля.

## 1. Установка дополнительных зависимостей

```bash
npm install @react-native-async-storage/async-storage
npm install react-native-vector-icons
npm install @react-navigation/bottom-tabs
npm install react-native-safe-area-context
npm install react-native-screens
npm install react-native-gesture-handler

# Для iOS
cd ios && pod install && cd ..
```

## 2. Обновление модели User

**src/models/user.entity.ts:**
```typescript
export default interface User {
    id: number;
    name: string;
    login: string;
    token?: string;
    password?: string;
}
```

## 3. Создание компонента профиля в хедере

**src/components/Header.tsx:**
```tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    StatusBar,
    Modal,
    FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
    navigation: any;
    showBack?: boolean;
    title: string;
}

const Header: React.FC<HeaderProps> = ({ navigation, showBack, title }) => {
    const { currentUser, logout } = useAuth();
    const [menuVisible, setMenuVisible] = useState(false);

    const handleLogout = async () => {
        setMenuVisible(false);
        await logout();
        navigation.replace('Auth');
    };

    const handleProfilePress = () => {
        setMenuVisible(false);
        if (currentUser) {
            navigation.navigate('Profile', { userId: currentUser.id });
        }
    };

    const handleEditPress = () => {
        setMenuVisible(false);
        if (currentUser) {
            navigation.navigate('Edit', { userId: currentUser.id });
        }
    };

    const handleSettingsPress = () => {
        setMenuVisible(false);
        navigation.navigate('Settings');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.leftContainer}>
                    {showBack ? (
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.iconButton}
                        >
                            <Icon name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                    ) : null}
                    <Text style={styles.title}>{title}</Text>
                </View>

                <View style={styles.rightContainer}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Home')}
                        style={styles.iconButton}
                    >
                        <Icon name="home" size={24} color="#fff" />
                    </TouchableOpacity>

                    {currentUser && (
                        <>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Users')}
                                style={styles.iconButton}
                            >
                                <Icon name="people" size={24} color="#fff" />
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                onPress={() => setMenuVisible(true)}
                                style={styles.iconButton}
                            >
                                <Icon name="account-circle" size={24} color="#fff" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            {/* Меню профиля */}
            <Modal
                visible={menuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setMenuVisible(false)}
                >
                    <View style={styles.menuContainer}>
                        <View style={styles.menuHeader}>
                            <Icon name="account-circle" size={40} color="#3f51b5" />
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{currentUser?.name || 'Пользователь'}</Text>
                                <Text style={styles.userLogin}>@{currentUser?.login}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleProfilePress}
                        >
                            <Icon name="person" size={20} color="#666" />
                            <Text style={styles.menuItemText}>Профиль</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleEditPress}
                        >
                            <Icon name="edit" size={20} color="#666" />
                            <Text style={styles.menuItemText}>Редактировать</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleSettingsPress}
                        >
                            <Icon name="settings" size={20} color="#666" />
                            <Text style={styles.menuItemText}>Настройки</Text>
                        </TouchableOpacity>

                        <View style={styles.menuDivider} />

                        <TouchableOpacity
                            style={[styles.menuItem, styles.logoutItem]}
                            onPress={handleLogout}
                        >
                            <Icon name="logout" size={20} color="#f44336" />
                            <Text style={[styles.menuItemText, styles.logoutText]}>Выход</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#3f51b5',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        zIndex: 1000,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '500',
        marginLeft: 8,
    },
    iconButton: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
    },
    menuContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginTop: Platform.OS === 'ios' ? 90 : 70,
        marginRight: 16,
        minWidth: 200,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    menuHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    userInfo: {
        marginLeft: 12,
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    userLogin: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    menuItemText: {
        fontSize: 14,
        color: '#333',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 8,
    },
    logoutItem: {
        paddingVertical: 12,
    },
    logoutText: {
        color: '#f44336',
    },
});

export default Header;
```

## 4. Создание экрана профиля пользователя

**src/screens/ProfileScreen.tsx:**
```tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Share,
    RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../services/users.service';
import { useAuth } from '../contexts/AuthContext';
import { AuthGuard } from '../components/guards/AuthGuard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import User from '../models/user.entity';

interface ProfileScreenProps {
    navigation: any;
    route: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, route }) => {
    const { userId } = route.params;
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { currentUser, token } = useAuth();

    useEffect(() => {
        loadUser();
    }, [userId]);

    const loadUser = async () => {
        try {
            setError(null);
            const data = await usersService.get(userId);
            setUser(data);
        } catch (err) {
            setError('Не удалось загрузить профиль пользователя');
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadUser();
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Пользователь: ${user?.name || user?.login}\nЛогин: ${user?.login}\nID: ${user?.id}`,
                title: 'Профиль пользователя',
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = () => {
        navigation.navigate('Edit', { userId: user?.id });
    };

    const handleBack = () => {
        navigation.goBack();
    };

    const isOwnProfile = currentUser?.id === user?.id;

    if (loading) {
        return <LoadingSpinner fullScreen text="Загрузка профиля..." />;
    }

    if (error || !user) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="error-outline" size={60} color="#f44336" />
                <Text style={styles.errorText}>{error || 'Пользователь не найден'}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadUser}>
                    <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backButtonText}>Назад</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <View style={styles.content}>
                {/* Кнопка назад */}
                <TouchableOpacity style={styles.backIcon} onPress={handleBack}>
                    <Icon name="arrow-back" size={24} color="#666" />
                </TouchableOpacity>

                {/* Шапка профиля */}
                <View style={styles.header}>
                    <View style={[styles.avatar, isOwnProfile && styles.ownAvatar]}>
                        <Text style={styles.avatarText}>
                            {user.name?.charAt(0).toUpperCase() || user.login.charAt(0).toUpperCase()}
                        </Text>
                        {isOwnProfile && (
                            <View style={styles.ownBadge}>
                                <Icon name="star" size={16} color="#fff" />
                            </View>
                        )}
                    </View>
                    
                    <Text style={styles.name}>{user.name || 'Без имени'}</Text>
                    <Text style={styles.login}>@{user.login}</Text>
                    
                    {isOwnProfile && token && (
                        <View style={styles.tokenContainer}>
                            <Icon name="vpn-key" size={16} color="#4caf50" />
                            <Text style={styles.tokenText}>JWT токен активен</Text>
                        </View>
                    )}
                </View>

                {/* Информация о пользователе */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Информация</Text>
                    
                    <View style={styles.infoRow}>
                        <Icon name="badge" size={20} color="#666" />
                        <Text style={styles.infoLabel}>ID:</Text>
                        <Text style={styles.infoValue}>{user.id}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Icon name="person" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Логин:</Text>
                        <Text style={styles.infoValue}>{user.login}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Icon name="drive-file-rename-outline" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Имя:</Text>
                        <Text style={styles.infoValue}>{user.name || 'Не указано'}</Text>
                    </View>
                    
                    {user.token && (
                        <View style={styles.infoRow}>
                            <Icon name="vpn-key" size={20} color="#4caf50" />
                            <Text style={styles.infoLabel}>Токен:</Text>
                            <Text style={styles.tokenValue} numberOfLines={1}>
                                {user.token.substring(0, 20)}...
                            </Text>
                        </View>
                    )}
                </View>

                {/* Статистика */}
                <View style={styles.statsCard}>
                    <Text style={styles.statsTitle}>Статистика</Text>
                    
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Icon name="event" size={24} color="#3f51b5" />
                            <Text style={styles.statValue}>Активен</Text>
                            <Text style={styles.statLabel}>Статус</Text>
                        </View>
                        
                        <View style={styles.statItem}>
                            <Icon name="vpn-key" size={24} color={user.token ? "#4caf50" : "#f44336"} />
                            <Text style={[styles.statValue, { color: user.token ? "#4caf50" : "#f44336" }]}>
                                {user.token ? 'Есть' : 'Нет'}
                            </Text>
                            <Text style={styles.statLabel}>Токен</Text>
                        </View>
                    </View>
                </View>

                {/* Действия */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                        <Icon name="share" size={20} color="#3f51b5" />
                        <Text style={styles.actionText}>Поделиться</Text>
                    </TouchableOpacity>
                    
                    {isOwnProfile && (
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.editButton]}
                            onPress={handleEdit}
                        >
                            <Icon name="edit" size={20} color="#fff" />
                            <Text style={[styles.actionText, styles.editButtonText]}>
                                Редактировать
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Дополнительная информация для своего профиля */}
                {isOwnProfile && token && (
                    <View style={styles.tokenInfoCard}>
                        <Text style={styles.tokenInfoTitle}>Ваш JWT токен</Text>
                        <Text style={styles.tokenFullValue} selectable>
                            {token}
                        </Text>
                        <Text style={styles.tokenHint}>
                            Используется для авторизации запросов к API
                        </Text>
                    </View>
                )}

                {/* Информация о последнем обновлении */}
                <Text style={styles.lastUpdate}>
                    Последнее обновление: {new Date().toLocaleTimeString()}
                </Text>
            </View>
        </ScrollView>
    );
};

// Оборачиваем в AuthGuard для защиты маршрута
export default function ProtectedProfileScreen(props: ProfileScreenProps) {
    return (
        <AuthGuard navigation={props.navigation} redirectTo="Auth">
            <ProfileScreen {...props} />
        </AuthGuard>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 16,
    },
    backIcon: {
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    header: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#3f51b5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    ownAvatar: {
        backgroundColor: '#f50057',
    },
    avatarText: {
        color: '#fff',
        fontSize: 40,
        fontWeight: 'bold',
    },
    ownBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#ffc107',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    login: {
        fontSize: 16,
        color: '#666',
        marginBottom: 12,
    },
    tokenContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    tokenText: {
        fontSize: 12,
        color: '#4caf50',
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 12,
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
        width: 60,
    },
    infoValue: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    tokenValue: {
        flex: 1,
        fontSize: 12,
        color: '#4caf50',
        fontFamily: 'monospace',
    },
    statsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginTop: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: '#3f51b5',
    },
    editButton: {
        backgroundColor: '#3f51b5',
        borderColor: '#3f51b5',
    },
    actionText: {
        fontSize: 14,
        color: '#3f51b5',
        fontWeight: '500',
    },
    editButtonText: {
        color: '#fff',
    },
    tokenInfoCard: {
        backgroundColor: '#e8f5e8',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    tokenInfoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4caf50',
        marginBottom: 8,
    },
    tokenFullValue: {
        fontSize: 12,
        color: '#333',
        fontFamily: 'monospace',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    tokenHint: {
        fontSize: 11,
        color: '#666',
        fontStyle: 'italic',
    },
    lastUpdate: {
        fontSize: 11,
        color: '#999',
        textAlign: 'center',
        marginTop: 8,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3f51b5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    backButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3f51b5',
    },
    backButtonText: {
        color: '#3f51b5',
        fontSize: 14,
        fontWeight: '600',
    },
});
```

## 5. Создание экрана редактирования профиля

**src/screens/EditProfileScreen.tsx:**
```tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../services/users.service';
import { useAuth } from '../contexts/AuthContext';
import { AuthGuard } from '../components/guards/AuthGuard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FormInput } from '../components/FormInput';
import User from '../models/user.entity';

interface EditProfileScreenProps {
    navigation: any;
    route: any;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation, route }) => {
    const { userId } = route.params;
    const [user, setUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        login: '',
        password: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { currentUser, token } = useAuth();

    useEffect(() => {
        // Проверяем, что пользователь редактирует свой профиль
        if (currentUser && userId !== currentUser.id) {
            Alert.alert(
                'Ошибка',
                'Вы можете редактировать только свой профиль',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
            return;
        }

        loadUser();
    }, [userId, currentUser]);

    const loadUser = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await usersService.get(userId);
            setUser(data);
            setFormData({
                name: data.name || '',
                login: data.login,
                password: ''
            });
        } catch (err) {
            setError('Не удалось загрузить данные пользователя');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.login.trim()) {
            Alert.alert('Ошибка', 'Логин не может быть пустым');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const updatedUser = {
                ...user,
                name: formData.name,
                login: formData.login,
                ...(formData.password ? { password: formData.password } : {})
            };

            await usersService.update(updatedUser as User);
            Alert.alert(
                'Успех',
                'Профиль успешно обновлен',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (err: any) {
            const errors = err.response?.data?.errors;
            if (errors) {
                const messages = Object.values(errors).flat().join('\n');
                setError(messages);
            } else {
                setError(err.response?.data?.message || 'Ошибка при обновлении профиля');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingSpinner fullScreen text="Загрузка профиля..." />;
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="error-outline" size={60} color="#f44336" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadUser}>
                    <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    {/* Заголовок */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                            <Icon name="close" size={24} color="#666" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Редактирование профиля</Text>
                        <TouchableOpacity onPress={handleSave} disabled={saving}>
                            <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Аватар */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {formData.name?.charAt(0).toUpperCase() || formData.login.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.changeAvatarButton}>
                            <Text style={styles.changeAvatarText}>Изменить фото</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Форма */}
                    <View style={styles.form}>
                        <FormInput
                            label="Имя"
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                            icon="badge"
                            autoCapitalize="words"
                        />

                        <FormInput
                            label="Логин"
                            value={formData.login}
                            onChangeText={(text) => setFormData({ ...formData, login: text })}
                            icon="person"
                            required
                        />

                        <FormInput
                            label="Новый пароль (оставьте пустым, если не хотите менять)"
                            value={formData.password}
                            onChangeText={(text) => setFormData({ ...formData, password: text })}
                            secureTextEntry
                            icon="lock"
                        />

                        {token && (
                            <View style={styles.tokenInfo}>
                                <Icon name="vpn-key" size={16} color="#4caf50" />
                                <Text style={styles.tokenInfoText}>
                                    JWT токен останется активным после обновления
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Информация о пользователе */}
                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>Информация</Text>
                        <Text style={styles.infoText}>
                            ID: {user?.id}
                        </Text>
                        <Text style={styles.infoText}>
                            Текущий токен: {token ? 'Активен' : 'Не активен'}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default function ProtectedEditProfileScreen(props: EditProfileScreenProps) {
    return (
        <AuthGuard navigation={props.navigation} redirectTo="Auth">
            <EditProfileScreen {...props} />
        </AuthGuard>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    closeButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    saveButton: {
        fontSize: 16,
        color: '#3f51b5',
        fontWeight: '600',
        padding: 8,
    },
    saveButtonDisabled: {
        color: '#999',
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#3f51b5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: {
        color: '#fff',
        fontSize: 40,
        fontWeight: 'bold',
    },
    changeAvatarButton: {
        padding: 8,
    },
    changeAvatarText: {
        color: '#3f51b5',
        fontSize: 14,
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tokenInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
        gap: 8,
    },
    tokenInfoText: {
        fontSize: 12,
        color: '#4caf50',
        flex: 1,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3f51b5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
```

## 6. Обновление навигации

**src/App.tsx:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

import { AuthProvider } from './contexts/AuthContext';
import { LoadingOverlay } from './components/LoadingOverlay';
import HomeScreen from './screens/HomeScreen';
import UsersScreen from './screens/UsersScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import AuthScreen from './screens/AuthScreen';
import SignScreen from './screens/SignScreen';
import LoadingDemoScreen from './screens/LoadingDemoScreen';
import Header from './components/Header';

export type RootStackParamList = {
    Home: undefined;
    Users: undefined;
    Profile: { userId: number };
    Edit: { userId: number };
    Auth: { registered?: boolean; returnUrl?: string } | undefined;
    Sign: undefined;
    LoadingDemo: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
    return (
        <SafeAreaProvider>
            <StatusBar backgroundColor="#3f51b5" barStyle="light-content" />
            <AuthProvider>
                <NavigationContainer>
                    <LoadingOverlay text="Загрузка..." showProgress />
                    <Stack.Navigator
                        screenOptions={({ navigation, route }) => ({
                            header: () => (
                                <Header
                                    navigation={navigation}
                                    showBack={route.name !== 'Home'}
                                    title={route.name === 'Home' ? 'Главная' : 
                                           route.name === 'Users' ? 'Пользователи' :
                                           route.name === 'Profile' ? 'Профиль' :
                                           route.name === 'Edit' ? 'Редактирование' :
                                           route.name === 'Auth' ? 'Вход' : 
                                           route.name === 'Sign' ? 'Регистрация' : 
                                           'Демо лоадера'}
                                />
                            ),
                        })}
                    >
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="Users" component={UsersScreen} />
                        <Stack.Screen name="Profile" component={ProfileScreen} />
                        <Stack.Screen name="Edit" component={EditProfileScreen} />
                        <Stack.Screen name="Auth" component={AuthScreen} />
                        <Stack.Screen name="Sign" component={SignScreen} />
                        <Stack.Screen name="LoadingDemo" component={LoadingDemoScreen} />
                    </Stack.Navigator>
                </NavigationContainer>
            </AuthProvider>
        </SafeAreaProvider>
    );
};

export default App;
```

## 7. Обновление экрана Users с навигацией к профилю

**src/screens/UsersScreen.tsx** (добавляем обработчик нажатия):

```tsx
const handleUserPress = (user: User) => {
    navigation.navigate('Profile', { userId: user.id });
};
```

## Тестирование функциональности

1. **Меню профиля**:
   - Авторизуйтесь в системе
   - Нажмите на иконку профиля в хедере
   - Должно открыться меню с пунктами "Профиль", "Редактировать", "Выход"

2. **Просмотр профиля**:
   - Нажмите "Профиль" в меню
   - Должна открыться страница с информацией о пользователе
   - Для своего профиля отображается звездочка и JWT токен

3. **Редактирование профиля**:
   - Нажмите "Редактировать" в меню или на странице профиля
   - Измените данные и сохраните
   - Появится уведомление об успехе

4. **Защита маршрутов**:
   - Выйдите из системы
   - Попробуйте перейти напрямую по экрану профиля через Deeplink
   - Должен сработать AuthGuard и перенаправить на страницу входа

5. **Навигация по пользователям**:
   - На экране пользователей нажмите на любого пользователя
   - Откроется его профиль (с ограниченными правами)

## Сравнение Angular vs React Native подходов для профиля

| Angular | React Native |
|---------|--------------|
| `ActivatedRoute` для получения параметров | `route.params` |
| `router.navigate()` | `navigation.navigate()` |
| `authService.currentUser()` | `useAuth()` хук |
| `mat-menu` | Кастомный `Modal` с меню |
| `{{ user.login }}` | `{user.login}` в JSX |
| `@if` в шаблоне | Тернарные операторы |

## Команды Git

```bash
# Проверка статуса
git status

# Создание ветки sprint7
git checkout -b sprint7

# Добавление всех изменений
git add -A

# Создание коммита
git commit -m "Выполнен sprint7: Профиль пользователя"

# Переключение на master
git checkout master

# Ребейз sprint7 в master
git rebase sprint7
```

Эта реализация полностью воспроизводит функциональность Angular профиля пользователя на React Native с:
- Выпадающим меню профиля в хедере
- Защищенным экраном профиля с параметром id
- Загрузкой данных пользователя по ID из API
- Редактированием профиля (только для своего профиля)
- Отображением JWT токена в профиле
- Навигацией между профилями пользователей
- Pull-to-refresh для обновления данных
=== React-Native-8.-Сортировка,-пагинация,-поиск.md ===
В этом спринте мы добавим сортировку, пагинацию и поиск в список пользователей.

## 1. Установка дополнительных зависимостей

```bash
npm install react-native-vector-icons
npm install @react-native-async-storage/async-storage
npm install react-native-safe-area-context
npm install react-native-screens
npm install @react-navigation/native @react-navigation/native-stack

# Для iOS
cd ios && pod install && cd ..
```

## 2. Создание хуков для сортировки, пагинации и поиска

**src/hooks/useSort.ts:**
```typescript
import { useState, useMemo } from 'react';

export type Order = 'asc' | 'desc';

export interface SortConfig<T> {
    key: keyof T | null;
    direction: Order;
}

export const useSort = <T extends object>(initialData: T[], initialConfig?: SortConfig<T>) => {
    const [sortConfig, setSortConfig] = useState<SortConfig<T>>(
        initialConfig || { key: null, direction: 'asc' }
    );

    const sortedData = useMemo(() => {
        if (!sortConfig.key) return initialData;

        return [...initialData].sort((a, b) => {
            const aValue = a[sortConfig.key!]?.toString() || '';
            const bValue = b[sortConfig.key!]?.toString() || '';

            if (sortConfig.direction === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });
    }, [initialData, sortConfig]);

    const requestSort = (key: keyof T) => {
        let direction: Order = 'asc';
        
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        
        setSortConfig({ key, direction });
        console.log(`Sorted ${direction}ending by ${String(key)}`);
    };

    return { 
        sortedData, 
        sortConfig, 
        requestSort 
    };
};
```

**src/hooks/usePagination.ts:**
```typescript
import { useState, useMemo, useCallback } from 'react';

export interface PaginationConfig {
    initialPage?: number;
    initialRowsPerPage?: number;
    rowsPerPageOptions?: number[];
}

export const usePagination = <T>(
    data: T[],
    config?: PaginationConfig
) => {
    const [page, setPage] = useState(config?.initialPage || 0);
    const [rowsPerPage, setRowsPerPage] = useState(config?.initialRowsPerPage || 5);
    const [rowsPerPageOptions] = useState(config?.rowsPerPageOptions || [5, 10, 25, 50]);

    const paginatedData = useMemo(() => {
        const start = page * rowsPerPage;
        const end = start + rowsPerPage;
        return data.slice(start, end);
    }, [data, page, rowsPerPage]);

    const handleChangePage = useCallback((newPage: number) => {
        setPage(newPage);
    }, []);

    const handleChangeRowsPerPage = useCallback((newRowsPerPage: number) => {
        setRowsPerPage(newRowsPerPage);
        setPage(0);
    }, []);

    const nextPage = useCallback(() => {
        if (page < Math.ceil(data.length / rowsPerPage) - 1) {
            setPage(prev => prev + 1);
        }
    }, [page, data.length, rowsPerPage]);

    const prevPage = useCallback(() => {
        if (page > 0) {
            setPage(prev => prev - 1);
        }
    }, [page]);

    const resetPagination = useCallback(() => {
        setPage(0);
    }, []);

    return {
        paginatedData,
        page,
        rowsPerPage,
        rowsPerPageOptions,
        handleChangePage,
        handleChangeRowsPerPage,
        nextPage,
        prevPage,
        resetPagination,
        totalCount: data.length,
        totalPages: Math.ceil(data.length / rowsPerPage),
        hasNextPage: page < Math.ceil(data.length / rowsPerPage) - 1,
        hasPrevPage: page > 0,
        from: page * rowsPerPage + 1,
        to: Math.min((page + 1) * rowsPerPage, data.length)
    };
};
```

**src/hooks/useSearch.ts:**
```typescript
import { useState, useMemo, useCallback } from 'react';

export interface SearchConfig<T> {
    searchableFields: (keyof T)[];
    initialSearch?: string;
}

export const useSearch = <T extends object>(
    data: T[],
    config: SearchConfig<T>
) => {
    const [searchText, setSearchText] = useState(config.initialSearch || '');

    const filteredData = useMemo(() => {
        if (!searchText.trim()) return data;

        const searchLower = searchText.toLowerCase();
        return data.filter(item => {
            return config.searchableFields.some(field => {
                const value = item[field]?.toString().toLowerCase() || '';
                return value.includes(searchLower);
            });
        });
    }, [data, searchText, config.searchableFields]);

    const handleSearch = useCallback((text: string) => {
        setSearchText(text);
    }, []);

    const clearSearch = useCallback(() => {
        setSearchText('');
    }, []);

    return {
        searchText,
        filteredData,
        handleSearch,
        clearSearch,
        setSearchText
    };
};
```

## 3. Создание компонента SearchBar

**src/components/SearchBar.tsx:**
```tsx
import React, { useState, useRef } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    onClear?: () => void;
    placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChangeText,
    onClear,
    placeholder = 'Поиск...'
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleFocus = () => {
        setIsFocused(true);
        Animated.spring(scaleAnim, {
            toValue: 1.02,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    const handleBlur = () => {
        setIsFocused(false);
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    const handleClear = () => {
        onChangeText('');
        onClear?.();
        inputRef.current?.focus();
    };

    return (
        <Animated.View style={[
            styles.container,
            isFocused && styles.containerFocused,
            { transform: [{ scale: scaleAnim }] }
        ]}>
            <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
            
            <TextInput
                ref={inputRef}
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                placeholderTextColor="#999"
                returnKeyType="search"
                clearButtonMode="never"
                autoCapitalize="none"
                autoCorrect={false}
            />
            
            {value.length > 0 && (
                <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                    <Icon name="close" size={20} color="#999" />
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: '#ddd',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    containerFocused: {
        borderColor: '#3f51b5',
        borderWidth: 2,
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        padding: 0,
        ...Platform.select({
            ios: {
                paddingVertical: 12,
            },
            android: {
                paddingVertical: 8,
            },
        }),
    },
    clearButton: {
        padding: 4,
    },
});
```

## 4. Создание компонента SortHeader

**src/components/SortHeader.tsx:**
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ViewStyle
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface SortHeaderProps {
    title: string;
    active: boolean;
    direction?: 'asc' | 'desc';
    onPress: () => void;
    style?: ViewStyle;
}

export const SortHeader: React.FC<SortHeaderProps> = ({
    title,
    active,
    direction = 'asc',
    onPress,
    style
}) => {
    return (
        <TouchableOpacity
            style={[styles.container, style]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[styles.title, active && styles.titleActive]}>
                {title}
            </Text>
            {active && (
                <Icon
                    name={direction === 'asc' ? 'arrow-upward' : 'arrow-downward'}
                    size={16}
                    color="#3f51b5"
                    style={styles.icon}
                />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
    titleActive: {
        color: '#3f51b5',
        fontWeight: 'bold',
    },
    icon: {
        marginLeft: 4,
    },
});
```

## 5. Создание компонента Pagination

**src/components/Pagination.tsx:**
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface PaginationProps {
    page: number;
    totalPages: number;
    rowsPerPage: number;
    rowsPerPageOptions: number[];
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rowsPerPage: number) => void;
    from: number;
    to: number;
    totalCount: number;
}

export const Pagination: React.FC<PaginationProps> = ({
    page,
    totalPages,
    rowsPerPage,
    rowsPerPageOptions,
    onPageChange,
    onRowsPerPageChange,
    from,
    to,
    totalCount
}) => {
    const [showRowsSelector, setShowRowsSelector] = React.useState(false);

    return (
        <View style={styles.container}>
            <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                    {from}-{to} из {totalCount}
                </Text>
            </View>

            <View style={styles.controlsContainer}>
                <TouchableOpacity
                    style={[styles.pageButton, page === 0 && styles.pageButtonDisabled]}
                    onPress={() => onPageChange(0)}
                    disabled={page === 0}
                >
                    <Icon name="first-page" size={20} color={page === 0 ? '#ccc' : '#666'} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.pageButton, page === 0 && styles.pageButtonDisabled]}
                    onPress={() => onPageChange(page - 1)}
                    disabled={page === 0}
                >
                    <Icon name="chevron-left" size={20} color={page === 0 ? '#ccc' : '#666'} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.rowsPerPageButton}
                    onPress={() => setShowRowsSelector(true)}
                >
                    <Text style={styles.rowsPerPageText}>{rowsPerPage}</Text>
                    <Icon name="arrow-drop-down" size={20} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.pageButton, page === totalPages - 1 && styles.pageButtonDisabled]}
                    onPress={() => onPageChange(page + 1)}
                    disabled={page === totalPages - 1}
                >
                    <Icon name="chevron-right" size={20} color={page === totalPages - 1 ? '#ccc' : '#666'} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.pageButton, page === totalPages - 1 && styles.pageButtonDisabled]}
                    onPress={() => onPageChange(totalPages - 1)}
                    disabled={page === totalPages - 1}
                >
                    <Icon name="last-page" size={20} color={page === totalPages - 1 ? '#ccc' : '#666'} />
                </TouchableOpacity>
            </View>

            {/* Модальное окно выбора количества строк */}
            <Modal
                visible={showRowsSelector}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRowsSelector(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowRowsSelector(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Строк на странице</Text>
                        <FlatList
                            data={rowsPerPageOptions}
                            keyExtractor={(item) => item.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        rowsPerPage === item && styles.optionItemSelected
                                    ]}
                                    onPress={() => {
                                        onRowsPerPageChange(item);
                                        setShowRowsSelector(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        rowsPerPage === item && styles.optionTextSelected
                                    ]}>
                                        {item}
                                    </Text>
                                    {rowsPerPage === item && (
                                        <Icon name="check" size={20} color="#3f51b5" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    infoContainer: {
        flex: 1,
    },
    infoText: {
        fontSize: 12,
        color: '#666',
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pageButton: {
        padding: 8,
        borderRadius: 4,
    },
    pageButtonDisabled: {
        opacity: 0.5,
    },
    rowsPerPageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        marginHorizontal: 8,
    },
    rowsPerPageText: {
        fontSize: 14,
        color: '#333',
        marginRight: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        width: '80%',
        maxWidth: 300,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    optionItemSelected: {
        backgroundColor: '#f0f0f0',
    },
    optionText: {
        fontSize: 14,
        color: '#333',
    },
    optionTextSelected: {
        color: '#3f51b5',
        fontWeight: '500',
    },
});
```

## 6. Обновление экрана Users с сортировкой, пагинацией и поиском

**src/screens/UsersScreen.tsx:**
```tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    Alert,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../services/users.service';
import { useAuth } from '../contexts/AuthContext';
import { AuthGuard } from '../components/guards/AuthGuard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchBar } from '../components/SearchBar';
import { SortHeader } from '../components/SortHeader';
import { Pagination } from '../components/Pagination';
import { useSort } from '../hooks/useSort';
import { useSearch } from '../hooks/useSearch';
import { usePagination } from '../hooks/usePagination';
import User from '../models/user.entity';

interface UsersScreenProps {
    navigation: any;
}

const UsersContent: React.FC<UsersScreenProps> = ({ navigation }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { currentUser } = useAuth();

    // Загрузка данных
    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setError(null);
            const data = await usersService.getAll();
            setUsers(data);
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Сессия истекла. Пожалуйста, войдите в систему заново.');
                setTimeout(() => {
                    navigation.replace('Auth', { returnUrl: 'Users' });
                }, 2000);
            } else {
                setError('Не удалось загрузить пользователей');
            }
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadUsers();
    };

    // Поиск
    const {
        searchText,
        filteredData: searchedUsers,
        handleSearch,
        clearSearch
    } = useSearch(users, {
        searchableFields: ['login', 'name', 'id']
    });

    // Сортировка
    const {
        sortedData: sortedUsers,
        sortConfig,
        requestSort
    } = useSort(searchedUsers, { key: 'id', direction: 'asc' });

    // Пагинация
    const {
        paginatedData: paginatedUsers,
        page,
        rowsPerPage,
        rowsPerPageOptions,
        handleChangePage,
        handleChangeRowsPerPage,
        resetPagination,
        totalCount,
        totalPages,
        from,
        to,
        hasNextPage,
        hasPrevPage,
        nextPage,
        prevPage
    } = usePagination(sortedUsers, { initialRowsPerPage: 5 });

    // Сброс пагинации при поиске
    useEffect(() => {
        resetPagination();
    }, [searchText]);

    const handleUserPress = (user: User) => {
        navigation.navigate('Profile', { userId: user.id });
    };

    const renderUserItem = ({ item, index }: { item: User; index: number }) => (
        <TouchableOpacity
            style={[
                styles.userCard,
                index % 2 === 0 ? styles.cardEven : styles.cardOdd
            ]}
            onPress={() => handleUserPress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.userAvatar, currentUser?.id === item.id && styles.currentUserAvatar]}>
                <Text style={styles.userAvatarText}>
                    {item.name?.charAt(0).toUpperCase() || item.login.charAt(0).toUpperCase()}
                </Text>
                {currentUser?.id === item.id && (
                    <View style={styles.currentUserBadge}>
                        <Icon name="star" size={12} color="#fff" />
                    </View>
                )}
            </View>
            
            <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                    {item.name || 'Без имени'}
                </Text>
                <Text style={styles.userLogin}>@{item.login}</Text>
                <Text style={styles.userId}>ID: {item.id}</Text>
            </View>
            
            <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                    Показано: {paginatedUsers.length} из {totalCount}
                </Text>
                <Text style={styles.statsText}>
                    Всего пользователей: {users.length}
                </Text>
            </View>

            {/* Заголовки сортировки */}
            <View style={styles.sortHeader}>
                <SortHeader
                    title="ID"
                    active={sortConfig.key === 'id'}
                    direction={sortConfig.direction}
                    onPress={() => requestSort('id')}
                    style={styles.sortId}
                />
                <SortHeader
                    title="Имя"
                    active={sortConfig.key === 'name'}
                    direction={sortConfig.direction}
                    onPress={() => requestSort('name')}
                    style={styles.sortName}
                />
                <SortHeader
                    title="Логин"
                    active={sortConfig.key === 'login'}
                    direction={sortConfig.direction}
                    onPress={() => requestSort('login')}
                    style={styles.sortLogin}
                />
                <View style={styles.sortAction} />
            </View>
        </View>
    );

    const renderFooter = () => (
        <Pagination
            page={page}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={rowsPerPageOptions}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            from={from}
            to={to}
            totalCount={totalCount}
        />
    );

    if (loading) {
        return <LoadingSpinner fullScreen text="Загрузка пользователей..." />;
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="error-outline" size={60} color="#f44336" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadUsers}>
                    <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Поиск */}
            <View style={styles.searchContainer}>
                <SearchBar
                    value={searchText}
                    onChangeText={handleSearch}
                    onClear={clearSearch}
                    placeholder="Поиск по ID, логину или имени..."
                />
            </View>

            <FlatList
                data={paginatedUsers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderUserItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="people-outline" size={80} color="#ccc" />
                        <Text style={styles.emptyText}>
                            {searchText ? 'Пользователи не найдены' : 'Нет пользователей'}
                        </Text>
                        {searchText && (
                            <TouchableOpacity onPress={clearSearch}>
                                <Text style={styles.clearSearchText}>Очистить поиск</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                stickyHeaderIndices={[0]}
            />
        </View>
    );
};

const UsersScreen: React.FC<UsersScreenProps> = ({ navigation }) => {
    return (
        <AuthGuard navigation={navigation} redirectTo="Auth">
            <UsersContent navigation={navigation} />
        </AuthGuard>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    searchContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    listContent: {
        paddingBottom: 16,
    },
    headerContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    statsText: {
        fontSize: 12,
        color: '#666',
    },
    sortHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    sortId: {
        width: 60,
    },
    sortName: {
        width: 100,
    },
    sortLogin: {
        width: 100,
    },
    sortAction: {
        flex: 1,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    cardEven: {
        backgroundColor: '#fff',
    },
    cardOdd: {
        backgroundColor: '#fafafa',
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3f51b5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
    },
    currentUserAvatar: {
        backgroundColor: '#f50057',
    },
    userAvatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    currentUserBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#ffc107',
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    userLogin: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    userId: {
        fontSize: 12,
        color: '#999',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
        marginBottom: 8,
    },
    clearSearchText: {
        fontSize: 14,
        color: '#3f51b5',
        textDecorationLine: 'underline',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3f51b5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default UsersScreen;
```

## 7. Создание расширенной версии с комбинированным хуком

**src/hooks/useTableData.ts:**
```tsx
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSort, SortConfig } from './useSort';
import { useSearch, SearchConfig } from './useSearch';
import { usePagination, PaginationConfig } from './usePagination';

interface TableDataConfig<T> {
    searchConfig: SearchConfig<T>;
    sortConfig?: SortConfig<T>;
    paginationConfig?: PaginationConfig;
}

export const useTableData = <T extends object>(
    data: T[],
    config: TableDataConfig<T>
) => {
    const [items, setItems] = useState<T[]>(data);

    useEffect(() => {
        setItems(data);
    }, [data]);

    // Поиск
    const {
        searchText,
        filteredData,
        handleSearch,
        clearSearch,
        setSearchText
    } = useSearch(items, config.searchConfig);

    // Сортировка
    const {
        sortedData,
        sortConfig,
        requestSort
    } = useSort(filteredData, config.sortConfig);

    // Пагинация
    const {
        paginatedData,
        page,
        rowsPerPage,
        rowsPerPageOptions,
        handleChangePage,
        handleChangeRowsPerPage,
        resetPagination,
        totalCount,
        totalPages,
        from,
        to,
        hasNextPage,
        hasPrevPage
    } = usePagination(sortedData, config.paginationConfig);

    // Сброс пагинации при поиске или сортировке
    useEffect(() => {
        resetPagination();
    }, [searchText, sortConfig.key, sortConfig.direction]);

    return {
        // Данные
        items,
        filteredData,
        sortedData,
        paginatedData,
        totalCount,
        
        // Поиск
        searchText,
        handleSearch,
        clearSearch,
        setSearchText,
        
        // Сортировка
        sortConfig,
        requestSort,
        
        // Пагинация
        page,
        rowsPerPage,
        rowsPerPageOptions,
        handleChangePage,
        handleChangeRowsPerPage,
        resetPagination,
        totalPages,
        from,
        to,
        hasNextPage,
        hasPrevPage,
        
        // Метаданные
        filteredCount: filteredData.length,
        originalCount: items.length
    };
};
```

## 8. Создание расширенной версии экрана Users

**src/screens/UsersAdvancedScreen.tsx:**
```tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../services/users.service';
import { useAuth } from '../contexts/AuthContext';
import { AuthGuard } from '../components/guards/AuthGuard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchBar } from '../components/SearchBar';
import { SortHeader } from '../components/SortHeader';
import { Pagination } from '../components/Pagination';
import { useTableData } from '../hooks/useTableData';
import User from '../models/user.entity';

interface UsersAdvancedScreenProps {
    navigation: any;
}

const UsersAdvancedContent: React.FC<UsersAdvancedScreenProps> = ({ navigation }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { currentUser } = useAuth();

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setError(null);
            const data = await usersService.getAll();
            setUsers(data);
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Сессия истекла. Пожалуйста, войдите в систему заново.');
                setTimeout(() => {
                    navigation.replace('Auth', { returnUrl: 'UsersAdvanced' });
                }, 2000);
            } else {
                setError('Не удалось загрузить пользователей');
            }
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadUsers();
    };

    // Используем комбинированный хук
    const {
        paginatedData,
        searchText,
        handleSearch,
        clearSearch,
        sortConfig,
        requestSort,
        page,
        rowsPerPage,
        rowsPerPageOptions,
        handleChangePage,
        handleChangeRowsPerPage,
        from,
        to,
        totalCount,
        filteredCount,
        originalCount
    } = useTableData(users, {
        searchConfig: {
            searchableFields: ['login', 'name', 'id']
        },
        sortConfig: {
            key: 'id',
            direction: 'asc'
        },
        paginationConfig: {
            initialRowsPerPage: 5
        }
    });

    const handleUserPress = (user: User) => {
        navigation.navigate('Profile', { userId: user.id });
    };

    const renderUserItem = ({ item, index }: { item: User; index: number }) => (
        <TouchableOpacity
            style={[
                styles.userCard,
                index % 2 === 0 ? styles.cardEven : styles.cardOdd
            ]}
            onPress={() => handleUserPress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.userAvatar, currentUser?.id === item.id && styles.currentUserAvatar]}>
                <Text style={styles.userAvatarText}>
                    {item.name?.charAt(0).toUpperCase() || item.login.charAt(0).toUpperCase()}
                </Text>
                {currentUser?.id === item.id && (
                    <View style={styles.currentUserBadge}>
                        <Icon name="star" size={12} color="#fff" />
                    </View>
                )}
            </View>
            
            <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                    {item.name || 'Без имени'}
                </Text>
                <Text style={styles.userLogin}>@{item.login}</Text>
                <Text style={styles.userId}>ID: {item.id}</Text>
            </View>
            
            <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                    Показано: {paginatedData.length} из {filteredCount}
                </Text>
                <Text style={styles.statsText}>
                    Всего: {originalCount}
                </Text>
                {searchText ? (
                    <TouchableOpacity onPress={clearSearch}>
                        <Icon name="close" size={16} color="#999" />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Заголовки сортировки */}
            <View style={styles.sortHeader}>
                <SortHeader
                    title="ID"
                    active={sortConfig.key === 'id'}
                    direction={sortConfig.direction}
                    onPress={() => requestSort('id')}
                    style={styles.sortId}
                />
                <SortHeader
                    title="Имя"
                    active={sortConfig.key === 'name'}
                    direction={sortConfig.direction}
                    onPress={() => requestSort('name')}
                    style={styles.sortName}
                />
                <SortHeader
                    title="Логин"
                    active={sortConfig.key === 'login'}
                    direction={sortConfig.direction}
                    onPress={() => requestSort('login')}
                    style={styles.sortLogin}
                />
                <View style={styles.sortAction} />
            </View>
        </View>
    );

    const renderFooter = () => (
        <Pagination
            page={page}
            totalPages={Math.ceil(filteredCount / rowsPerPage)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={rowsPerPageOptions}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            from={from}
            to={to}
            totalCount={filteredCount}
        />
    );

    if (loading) {
        return <LoadingSpinner fullScreen text="Загрузка пользователей..." />;
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="error-outline" size={60} color="#f44336" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadUsers}>
                    <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Поиск */}
            <View style={styles.searchContainer}>
                <SearchBar
                    value={searchText}
                    onChangeText={handleSearch}
                    onClear={clearSearch}
                    placeholder="Поиск по ID, логину или имени..."
                />
            </View>

            <FlatList
                data={paginatedData}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderUserItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="people-outline" size={80} color="#ccc" />
                        <Text style={styles.emptyText}>
                            {searchText ? 'Пользователи не найдены' : 'Нет пользователей'}
                        </Text>
                        {searchText && (
                            <TouchableOpacity onPress={clearSearch}>
                                <Text style={styles.clearSearchText}>Очистить поиск</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                stickyHeaderIndices={[0]}
            />
        </View>
    );
};

const UsersAdvancedScreen: React.FC<UsersAdvancedScreenProps> = ({ navigation }) => {
    return (
        <AuthGuard navigation={navigation} redirectTo="Auth">
            <UsersAdvancedContent navigation={navigation} />
        </AuthGuard>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    searchContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    listContent: {
        paddingBottom: 16,
    },
    headerContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statsText: {
        fontSize: 12,
        color: '#666',
    },
    sortHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    sortId: {
        width: 60,
    },
    sortName: {
        width: 100,
    },
    sortLogin: {
        width: 100,
    },
    sortAction: {
        flex: 1,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    cardEven: {
        backgroundColor: '#fff',
    },
    cardOdd: {
        backgroundColor: '#fafafa',
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3f51b5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
    },
    currentUserAvatar: {
        backgroundColor: '#f50057',
    },
    userAvatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    currentUserBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#ffc107',
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    userLogin: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    userId: {
        fontSize: 12,
        color: '#999',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
        marginBottom: 8,
    },
    clearSearchText: {
        fontSize: 14,
        color: '#3f51b5',
        textDecorationLine: 'underline',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3f51b5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default UsersAdvancedScreen;
```

## 9. Обновление навигации

**src/App.tsx:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

import { AuthProvider } from './contexts/AuthContext';
import { LoadingOverlay } from './components/LoadingOverlay';
import HomeScreen from './screens/HomeScreen';
import UsersScreen from './screens/UsersScreen';
import UsersAdvancedScreen from './screens/UsersAdvancedScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import AuthScreen from './screens/AuthScreen';
import SignScreen from './screens/SignScreen';
import LoadingDemoScreen from './screens/LoadingDemoScreen';
import Header from './components/Header';

export type RootStackParamList = {
    Home: undefined;
    Users: undefined;
    UsersAdvanced: undefined;
    Profile: { userId: number };
    Edit: { userId: number };
    Auth: { registered?: boolean; returnUrl?: string } | undefined;
    Sign: undefined;
    LoadingDemo: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
    return (
        <SafeAreaProvider>
            <StatusBar backgroundColor="#3f51b5" barStyle="light-content" />
            <AuthProvider>
                <NavigationContainer>
                    <LoadingOverlay text="Загрузка..." showProgress />
                    <Stack.Navigator
                        screenOptions={({ navigation, route }) => ({
                            header: () => (
                                <Header
                                    navigation={navigation}
                                    showBack={route.name !== 'Home'}
                                    title={route.name === 'Home' ? 'Главная' : 
                                           route.name === 'Users' ? 'Пользователи' :
                                           route.name === 'UsersAdvanced' ? 'Расширенный список' :
                                           route.name === 'Profile' ? 'Профиль' :
                                           route.name === 'Edit' ? 'Редактирование' :
                                           route.name === 'Auth' ? 'Вход' : 
                                           route.name === 'Sign' ? 'Регистрация' : 
                                           'Демо лоадера'}
                                />
                            ),
                        })}
                    >
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="Users" component={UsersScreen} />
                        <Stack.Screen name="UsersAdvanced" component={UsersAdvancedScreen} />
                        <Stack.Screen name="Profile" component={ProfileScreen} />
                        <Stack.Screen name="Edit" component={EditProfileScreen} />
                        <Stack.Screen name="Auth" component={AuthScreen} />
                        <Stack.Screen name="Sign" component={SignScreen} />
                        <Stack.Screen name="LoadingDemo" component={LoadingDemoScreen} />
                    </Stack.Navigator>
                </NavigationContainer>
            </AuthProvider>
        </SafeAreaProvider>
    );
};

export default App;
```

## 10. Обновление HomeScreen с ссылками на оба экрана

**src/screens/HomeScreen.tsx:**
```tsx
// Добавить в featuresContainer:
<TouchableOpacity
    style={styles.featureItem}
    onPress={() => navigation.navigate('UsersAdvanced')}
>
    <Icon name="view-list" size={24} color="#3f51b5" />
    <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>Расширенный список</Text>
        <Text style={styles.featureDescription}>
            Сортировка, поиск и пагинация
        </Text>
    </View>
    <Icon name="chevron-right" size={24} color="#999" />
</TouchableOpacity>
```

## Тестирование функциональности

1. **Поиск**:
   - Введите текст в поле поиска
   - Список должен фильтроваться в реальном времени
   - Отображается количество найденных пользователей

2. **Сортировка**:
   - Нажмите на заголовки столбцов
   - Данные должны сортироваться по выбранному полю
   - Иконка показывает направление сортировки

3. **Пагинация**:
   - Используйте кнопки для переключения страниц
   - Измените количество элементов на странице
   - Отображается информация о текущем диапазоне

4. **Интеграция**:
   - Поиск и сортировка работают вместе
   - Пагинация сбрасывается при изменении поиска
   - Все функции оптимизированы с useMemo

## Сравнение Angular vs React Native подходов

| Angular | React Native |
|---------|--------------|
| `MatTableDataSource` | Кастомные хуки + FlatList |
| `@ViewChild(MatSort)` | `useSort` хук |
| `(matSortChange)` | `requestSort` функция |
| `mat-paginator` | Кастомный `Pagination` компонент |
| `[(ngModel)]` для поиска | `SearchBar` компонент |
| Фильтрация через `filter()` | `useSearch` хук с useMemo |

## Команды Git

```bash
# Проверка статуса
git status

# Создание ветки sprint8
git checkout -b sprint8

# Добавление всех изменений
git add -A

# Создание коммита
git commit -m "Выполнен sprint8: Сортировка, пагинация и поиск"

# Переключение на master
git checkout master

# Ребейз sprint8 в master
git rebase sprint8
```

Эта реализация полностью воспроизводит функциональность Angular на React Native с:
- Поиском с фильтрацией в реальном времени
- Сортировкой по всем столбцам
- Пагинацией с настраиваемым количеством строк
- Отображением статистики
- Оптимизацией производительности через хуки
- Адаптивным интерфейсом для мобильных устройств
=== React-Native-9.-CRUD-операции.md ===
В этом спринте мы добавим полноценные CRUD операции: создание, удаление и обновление пользователей.

## 1. Установка дополнительных зависимостей

```bash
npm install react-native-vector-icons
npm install @react-native-async-storage/async-storage
npm install react-native-safe-area-context
npm install react-native-screens
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-gesture-handler
npm install react-native-modal

# Для iOS
cd ios && pod install && cd ..
```

## 2. Создание сервиса для уведомлений

**src/services/message.service.ts:**
```typescript
import { Alert, Platform } from 'react-native';

class MessageService {
    message(text: string, duration: number = 3000) {
        Alert.alert('Успех', text, [{ text: 'OK' }]);
    }

    error(text: string, duration: number = 3000) {
        Alert.alert('Ошибка', text, [{ text: 'OK' }]);
    }

    info(text: string, duration: number = 3000) {
        Alert.alert('Информация', text, [{ text: 'OK' }]);
    }

    warning(text: string, duration: number = 3000) {
        Alert.alert('Предупреждение', text, [{ text: 'OK' }]);
    }

    confirm(title: string, message: string, onConfirm: () => void, onCancel?: () => void) {
        Alert.alert(
            title,
            message,
            [
                {
                    text: 'Отмена',
                    style: 'cancel',
                    onPress: onCancel
                },
                {
                    text: 'Подтвердить',
                    onPress: onConfirm,
                    style: 'destructive'
                }
            ]
        );
    }
}

export const messageService = new MessageService();
```

## 3. Создание компонента AddUserModal

**src/components/AddUserModal.tsx:**
```tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FormInput } from './FormInput';
import User from '../models/user.entity';

interface AddUserModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (user: Partial<User>) => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
    visible,
    onClose,
    onSave
}) => {
    const [user, setUser] = useState<Partial<User>>({
        login: '',
        password: '',
        name: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(false);

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!user.login?.trim()) {
            newErrors.login = 'Логин обязателен';
        }
        if (!user.password?.trim()) {
            newErrors.password = 'Пароль обязателен';
        }
        if (user.password && user.password.length < 3) {
            newErrors.password = 'Пароль должен содержать минимум 3 символа';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validate()) {
            setLoading(true);
            onSave(user);
            // Сброс формы
            setUser({ login: '', password: '', name: '' });
            setErrors({});
            setLoading(false);
            onClose();
        }
    };

    const handleCancel = () => {
        setUser({ login: '', password: '', name: '' });
        setErrors({});
        onClose();
    };

    const handleChange = (field: keyof User) => (text: string) => {
        setUser(prev => ({ ...prev, [field]: text }));
        // Очищаем ошибку для этого поля при изменении
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const isValid = user.login?.trim() && user.password?.trim() && user.password.length >= 3;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={handleCancel}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <View style={styles.header}>
                            <Icon name="person-add" size={24} color="#3f51b5" />
                            <Text style={styles.title}>Создание пользователя</Text>
                            <TouchableOpacity onPress={handleCancel}>
                                <Icon name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                            <FormInput
                                label="Логин"
                                value={user.login || ''}
                                onChangeText={handleChange('login')}
                                error={errors.login}
                                touched={true}
                                required
                                icon="person"
                            />

                            <FormInput
                                label="Пароль"
                                value={user.password || ''}
                                onChangeText={handleChange('password')}
                                error={errors.password}
                                touched={true}
                                secureTextEntry={!showPassword}
                                required
                                icon="lock"
                            />

                            <FormInput
                                label="Имя"
                                value={user.name || ''}
                                onChangeText={handleChange('name')}
                                icon="badge"
                                autoCapitalize="words"
                            />
                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleCancel}
                            >
                                <Text style={styles.cancelButtonText}>Отмена</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
                                onPress={handleSave}
                                disabled={!isValid || loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Создать</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        flex: 1,
        marginLeft: 12,
    },
    content: {
        padding: 16,
        maxHeight: 400,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 12,
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    saveButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#3f51b5',
        minWidth: 100,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#9fa8da',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
});
```

## 4. Создание компонента ConfirmDialog

**src/components/ConfirmDialog.tsx:**
```tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ConfirmDialogProps {
    visible: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    severity?: 'error' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    visible,
    title = 'Подтверждение',
    message,
    confirmText = 'Удалить',
    cancelText = 'Отмена',
    onConfirm,
    onCancel,
    severity = 'error'
}) => {
    const getIcon = () => {
        switch (severity) {
            case 'error':
                return <Icon name="error" size={40} color="#f44336" />;
            case 'warning':
                return <Icon name="warning" size={40} color="#ff9800" />;
            case 'info':
                return <Icon name="info" size={40} color="#2196f3" />;
            default:
                return <Icon name="error" size={40} color="#f44336" />;
        }
    };

    const getColor = () => {
        switch (severity) {
            case 'error': return '#f44336';
            case 'warning': return '#ff9800';
            case 'info': return '#2196f3';
            default: return '#f44336';
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.dialog}>
                    <View style={styles.iconContainer}>
                        {getIcon()}
                    </View>
                    
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>
                    
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onCancel}
                        >
                            <Text style={styles.cancelButtonText}>{cancelText}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.confirmButton, { backgroundColor: getColor() }]}
                            onPress={onConfirm}
                        >
                            <Text style={styles.confirmButtonText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dialog: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '80%',
        maxWidth: 400,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: '#666',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
});
```

## 5. Обновление экрана Users с CRUD операциями

**src/screens/UsersScreen.tsx:**
```tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    Alert,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../services/users.service';
import { messageService } from '../services/message.service';
import { useAuth } from '../contexts/AuthContext';
import { AuthGuard } from '../components/guards/AuthGuard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchBar } from '../components/SearchBar';
import { SortHeader } from '../components/SortHeader';
import { Pagination } from '../components/Pagination';
import { AddUserModal } from '../components/AddUserModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useSort } from '../hooks/useSort';
import { useSearch } from '../hooks/useSearch';
import { usePagination } from '../hooks/usePagination';
import User from '../models/user.entity';

interface UsersScreenProps {
    navigation: any;
}

const UsersContent: React.FC<UsersScreenProps> = ({ navigation }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const { currentUser } = useAuth();

    // Загрузка данных
    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setError(null);
            const data = await usersService.getAll();
            setUsers(data);
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Сессия истекла. Пожалуйста, войдите в систему заново.');
                setTimeout(() => {
                    navigation.replace('Auth', { returnUrl: 'Users' });
                }, 2000);
            } else {
                setError('Не удалось загрузить пользователей');
            }
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadUsers();
    };

    // Поиск
    const {
        searchText,
        filteredData: searchedUsers,
        handleSearch,
        clearSearch
    } = useSearch(users, {
        searchableFields: ['login', 'name', 'id']
    });

    // Сортировка
    const {
        sortedData: sortedUsers,
        sortConfig,
        requestSort
    } = useSort(searchedUsers, { key: 'id', direction: 'asc' });

    // Пагинация
    const {
        paginatedData: paginatedUsers,
        page,
        rowsPerPage,
        rowsPerPageOptions,
        handleChangePage,
        handleChangeRowsPerPage,
        resetPagination,
        totalCount,
        totalPages,
        from,
        to,
        hasNextPage,
        hasPrevPage,
        nextPage,
        prevPage
    } = usePagination(sortedUsers, { initialRowsPerPage: 5 });

    // Сброс пагинации при поиске
    useEffect(() => {
        resetPagination();
    }, [searchText]);

    // CRUD операции
    const handleAddUser = async (newUser: Partial<User>) => {
        try {
            await usersService.create(newUser as User);
            messageService.message('Пользователь успешно создан');
            loadUsers();
        } catch (err: any) {
            const errors = err.response?.data?.errors;
            if (errors) {
                const messages = Object.values(errors).flat().join('\n');
                messageService.error(messages);
            } else {
                messageService.error(err.response?.data?.message || 'Ошибка при создании пользователя');
            }
        }
    };

    const handleDeletePress = (user: User) => {
        setUserToDelete(user);
        setDeleteDialogVisible(true);
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;

        try {
            setDeleteDialogVisible(false);
            await usersService.del(userToDelete.id);
            messageService.message(`Пользователь ${userToDelete.login} удален`);
            loadUsers();
        } catch (err: any) {
            messageService.error(err.response?.data?.message || 'Ошибка при удалении пользователя');
        } finally {
            setUserToDelete(null);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogVisible(false);
        setUserToDelete(null);
    };

    const handleUserPress = (user: User) => {
        navigation.navigate('Profile', { userId: user.id });
    };

    const handleEditPress = (user: User) => {
        navigation.navigate('Edit', { userId: user.id });
    };

    const renderUserItem = ({ item, index }: { item: User; index: number }) => (
        <View style={[
            styles.userCard,
            index % 2 === 0 ? styles.cardEven : styles.cardOdd
        ]}>
            <TouchableOpacity
                style={styles.userInfoContainer}
                onPress={() => handleUserPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.userAvatar, currentUser?.id === item.id && styles.currentUserAvatar]}>
                    <Text style={styles.userAvatarText}>
                        {item.name?.charAt(0).toUpperCase() || item.login.charAt(0).toUpperCase()}
                    </Text>
                    {currentUser?.id === item.id && (
                        <View style={styles.currentUserBadge}>
                            <Icon name="star" size={12} color="#fff" />
                        </View>
                    )}
                </View>
                
                <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                        {item.name || 'Без имени'}
                    </Text>
                    <Text style={styles.userLogin}>@{item.login}</Text>
                    <Text style={styles.userId}>ID: {item.id}</Text>
                </View>
            </TouchableOpacity>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditPress(item)}
                >
                    <Icon name="edit" size={20} color="#3f51b5" />
                </TouchableOpacity>

                {currentUser?.id !== item.id && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeletePress(item)}
                    >
                        <Icon name="delete" size={20} color="#f44336" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                    Показано: {paginatedUsers.length} из {totalCount}
                </Text>
                <Text style={styles.statsText}>
                    Всего: {users.length}
                </Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setAddModalVisible(true)}
                >
                    <Icon name="add" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Создать</Text>
                </TouchableOpacity>
            </View>

            {/* Заголовки сортировки */}
            <View style={styles.sortHeader}>
                <SortHeader
                    title="ID"
                    active={sortConfig.key === 'id'}
                    direction={sortConfig.direction}
                    onPress={() => requestSort('id')}
                    style={styles.sortId}
                />
                <SortHeader
                    title="Имя"
                    active={sortConfig.key === 'name'}
                    direction={sortConfig.direction}
                    onPress={() => requestSort('name')}
                    style={styles.sortName}
                />
                <SortHeader
                    title="Логин"
                    active={sortConfig.key === 'login'}
                    direction={sortConfig.direction}
                    onPress={() => requestSort('login')}
                    style={styles.sortLogin}
                />
                <View style={styles.sortAction} />
            </View>
        </View>
    );

    const renderFooter = () => (
        <Pagination
            page={page}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={rowsPerPageOptions}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            from={from}
            to={to}
            totalCount={totalCount}
        />
    );

    if (loading) {
        return <LoadingSpinner fullScreen text="Загрузка пользователей..." />;
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="error-outline" size={60} color="#f44336" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadUsers}>
                    <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Поиск */}
            <View style={styles.searchContainer}>
                <SearchBar
                    value={searchText}
                    onChangeText={handleSearch}
                    onClear={clearSearch}
                    placeholder="Поиск по ID, логину или имени..."
                />
            </View>

            <FlatList
                data={paginatedUsers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderUserItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="people-outline" size={80} color="#ccc" />
                        <Text style={styles.emptyText}>
                            {searchText ? 'Пользователи не найдены' : 'Нет пользователей'}
                        </Text>
                        {searchText && (
                            <TouchableOpacity onPress={clearSearch}>
                                <Text style={styles.clearSearchText}>Очистить поиск</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                stickyHeaderIndices={[0]}
            />

            {/* Модальное окно добавления пользователя */}
            <AddUserModal
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                onSave={handleAddUser}
            />

            {/* Диалог подтверждения удаления */}
            <ConfirmDialog
                visible={deleteDialogVisible}
                title="Подтверждение удаления"
                message={`Вы действительно хотите удалить пользователя ${userToDelete?.login}? Это действие нельзя отменить.`}
                confirmText="Удалить"
                cancelText="Отмена"
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
                severity="error"
            />
        </View>
    );
};

const UsersScreen: React.FC<UsersScreenProps> = ({ navigation }) => {
    return (
        <AuthGuard navigation={navigation} redirectTo="Auth">
            <UsersContent navigation={navigation} />
        </AuthGuard>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    searchContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    listContent: {
        paddingBottom: 16,
    },
    headerContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statsText: {
        fontSize: 12,
        color: '#666',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4caf50',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    sortHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    sortId: {
        width: 60,
    },
    sortName: {
        width: 100,
    },
    sortLogin: {
        width: 100,
    },
    sortAction: {
        flex: 1,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    cardEven: {
        backgroundColor: '#fff',
    },
    cardOdd: {
        backgroundColor: '#fafafa',
    },
    userInfoContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3f51b5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
    },
    currentUserAvatar: {
        backgroundColor: '#f50057',
    },
    userAvatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    currentUserBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#ffc107',
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    userLogin: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    userId: {
        fontSize: 12,
        color: '#999',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 8,
    },
    actionButton: {
        padding: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
        marginBottom: 8,
    },
    clearSearchText: {
        fontSize: 14,
        color: '#3f51b5',
        textDecorationLine: 'underline',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3f51b5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default UsersScreen;
```

## 6. Обновление экрана редактирования профиля

**src/screens/EditProfileScreen.tsx:**
```tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../services/users.service';
import { messageService } from '../services/message.service';
import { useAuth } from '../contexts/AuthContext';
import { AuthGuard } from '../components/guards/AuthGuard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FormInput } from '../components/FormInput';
import { PreventUnsavedChanges } from '../components/guards/PreventUnsavedChanges';
import User from '../models/user.entity';

interface EditProfileScreenProps {
    navigation: any;
    route: any;
}

const EditProfileContent: React.FC<EditProfileScreenProps> = ({ navigation, route }) => {
    const { userId } = route.params;
    const [user, setUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        login: '',
        password: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const { currentUser, token } = useAuth();

    useEffect(() => {
        // Проверяем, что пользователь редактирует свой профиль
        if (currentUser && userId !== currentUser.id) {
            messageService.error('Вы можете редактировать только свой профиль');
            navigation.goBack();
            return;
        }

        loadUser();
    }, [userId, currentUser]);

    const loadUser = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await usersService.get(userId);
            setUser(data);
            setFormData({
                name: data.name || '',
                login: data.login,
                password: ''
            });
        } catch (err) {
            setError('Не удалось загрузить данные пользователя');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: keyof typeof formData) => (text: string) => {
        setFormData(prev => ({ ...prev, [field]: text }));
        setIsDirty(true);
    };

    const validateForm = (): boolean => {
        if (!formData.login.trim()) {
            messageService.warning('Логин не может быть пустым');
            return false;
        }
        if (formData.password && formData.password.length < 3) {
            messageService.warning('Пароль должен содержать минимум 3 символа');
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            setSaving(true);
            setError(null);

            const updatedUser = {
                ...user,
                name: formData.name,
                login: formData.login,
                ...(formData.password ? { password: formData.password } : {})
            };

            await usersService.update(updatedUser as User);
            messageService.message('Профиль успешно обновлен');
            setIsDirty(false);
            navigation.goBack();
        } catch (err: any) {
            const errors = err.response?.data?.errors;
            if (errors) {
                const messages = Object.values(errors).flat().join('\n');
                setError(messages);
                messageService.error(messages);
            } else {
                const errorMsg = err.response?.data?.message || 'Ошибка при обновлении профиля';
                setError(errorMsg);
                messageService.error(errorMsg);
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingSpinner fullScreen text="Загрузка профиля..." />;
    }

    if (error && !user) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="error-outline" size={60} color="#f44336" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadUser}>
                    <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <PreventUnsavedChanges
            when={isDirty && !saving}
            message="У вас есть несохраненные изменения. Вы действительно хотите покинуть страницу?"
            title="Несохраненные изменения"
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.content}>
                        {/* Заголовок */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                                <Icon name="arrow-back" size={24} color="#666" />
                            </TouchableOpacity>
                            <Text style={styles.title}>Редактирование профиля</Text>
                            <TouchableOpacity onPress={handleSave} disabled={saving}>
                                {saving ? (
                                    <ActivityIndicator size="small" color="#3f51b5" />
                                ) : (
                                    <Text style={[styles.saveButton, !isDirty && styles.saveButtonDisabled]}>
                                        Сохранить
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Аватар */}
                        <View style={styles.avatarSection}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {formData.name?.charAt(0).toUpperCase() || formData.login.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        {/* Форма */}
                        <View style={styles.form}>
                            <FormInput
                                label="Имя"
                                value={formData.name}
                                onChangeText={handleChange('name')}
                                icon="badge"
                                autoCapitalize="words"
                            />

                            <FormInput
                                label="Логин"
                                value={formData.login}
                                onChangeText={handleChange('login')}
                                icon="person"
                                required
                            />

                            <FormInput
                                label="Новый пароль (оставьте пустым, если не хотите менять)"
                                value={formData.password}
                                onChangeText={handleChange('password')}
                                secureTextEntry
                                icon="lock"
                            />

                            {token && (
                                <View style={styles.tokenInfo}>
                                    <Icon name="vpn-key" size={16} color="#4caf50" />
                                    <Text style={styles.tokenInfoText}>
                                        JWT токен останется активным после обновления
                                    </Text>
                                </View>
                            )}

                            {isDirty && (
                                <View style={styles.dirtyIndicator}>
                                    <Icon name="info" size={16} color="#2196f3" />
                                    <Text style={styles.dirtyText}>
                                        ✏️ У вас есть несохраненные изменения
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Информация о пользователе */}
                        <View style={styles.infoCard}>
                            <Text style={styles.infoTitle}>Информация</Text>
                            <Text style={styles.infoText}>
                                ID: {user?.id}
                            </Text>
                            <Text style={styles.infoText}>
                                Текущий токен: {token ? 'Активен' : 'Не активен'}
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </PreventUnsavedChanges>
    );
};

const EditProfileScreen: React.FC<EditProfileScreenProps> = (props) => {
    return (
        <AuthGuard navigation={props.navigation} redirectTo="Auth">
            <EditProfileContent {...props} />
        </AuthGuard>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    closeButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    saveButton: {
        fontSize: 16,
        color: '#3f51b5',
        fontWeight: '600',
        padding: 8,
    },
    saveButtonDisabled: {
        color: '#999',
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#3f51b5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: {
        color: '#fff',
        fontSize: 40,
        fontWeight: 'bold',
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tokenInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
        gap: 8,
    },
    tokenInfoText: {
        fontSize: 12,
        color: '#4caf50',
        flex: 1,
    },
    dirtyIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e3f2fd',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
        gap: 8,
    },
    dirtyText: {
        fontSize: 12,
        color: '#2196f3',
        flex: 1,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3f51b5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default EditProfileScreen;
```

## 7. Обновление навигации

**src/App.tsx:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

import { AuthProvider } from './contexts/AuthContext';
import { LoadingOverlay } from './components/LoadingOverlay';
import HomeScreen from './screens/HomeScreen';
import UsersScreen from './screens/UsersScreen';
import UsersAdvancedScreen from './screens/UsersAdvancedScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import AuthScreen from './screens/AuthScreen';
import SignScreen from './screens/SignScreen';
import LoadingDemoScreen from './screens/LoadingDemoScreen';
import Header from './components/Header';

export type RootStackParamList = {
    Home: undefined;
    Users: undefined;
    UsersAdvanced: undefined;
    Profile: { userId: number };
    Edit: { userId: number };
    Auth: { registered?: boolean; returnUrl?: string } | undefined;
    Sign: undefined;
    LoadingDemo: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
    return (
        <SafeAreaProvider>
            <StatusBar backgroundColor="#3f51b5" barStyle="light-content" />
            <AuthProvider>
                <NavigationContainer>
                    <LoadingOverlay text="Загрузка..." showProgress />
                    <Stack.Navigator
                        screenOptions={({ navigation, route }) => ({
                            header: () => (
                                <Header
                                    navigation={navigation}
                                    showBack={route.name !== 'Home'}
                                    title={route.name === 'Home' ? 'Главная' : 
                                           route.name === 'Users' ? 'Пользователи' :
                                           route.name === 'UsersAdvanced' ? 'Расширенный список' :
                                           route.name === 'Profile' ? 'Профиль' :
                                           route.name === 'Edit' ? 'Редактирование' :
                                           route.name === 'Auth' ? 'Вход' : 
                                           route.name === 'Sign' ? 'Регистрация' : 
                                           'Демо лоадера'}
                                />
                            ),
                        })}
                    >
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="Users" component={UsersScreen} />
                        <Stack.Screen name="UsersAdvanced" component={UsersAdvancedScreen} />
                        <Stack.Screen name="Profile" component={ProfileScreen} />
                        <Stack.Screen name="Edit" component={EditProfileScreen} />
                        <Stack.Screen name="Auth" component={AuthScreen} />
                        <Stack.Screen name="Sign" component={SignScreen} />
                        <Stack.Screen name="LoadingDemo" component={LoadingDemoScreen} />
                    </Stack.Navigator>
                </NavigationContainer>
            </AuthProvider>
        </SafeAreaProvider>
    );
};

export default App;
```

## 8. Обновление HomeScreen с ссылками на CRUD

**src/screens/HomeScreen.tsx:**
```tsx
// Добавить в featuresContainer:
<TouchableOpacity
    style={styles.featureItem}
    onPress={() => navigation.navigate('Users')}
>
    <Icon name="people" size={24} color="#3f51b5" />
    <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>Управление пользователями</Text>
        <Text style={styles.featureDescription}>
            Создание, просмотр, редактирование и удаление
        </Text>
    </View>
    <Icon name="chevron-right" size={24} color="#999" />
</TouchableOpacity>
```

## Тестирование функциональности

1. **Создание пользователя**:
   - Нажмите кнопку "Создать" в шапке списка
   - Заполните форму в модальном окне
   - Нажмите "Создать" - появится уведомление об успехе

2. **Удаление пользователя**:
   - Нажмите иконку корзины у любого пользователя (кроме себя)
   - Появится диалог подтверждения
   - Подтвердите удаление - появится уведомление

3. **Редактирование пользователя**:
   - Нажмите иконку карандаша у своего профиля
   - Перейдите на страницу редактирования
   - Измените данные и нажмите "Сохранить"
   - Появится уведомление об успехе

4. **Защита от несохраненных изменений**:
   - На странице редактирования измените данные
   - Попробуйте уйти со страницы - появится предупреждение

5. **Защита операций**:
   - Нельзя удалить самого себя
   - Нельзя редактировать чужой профиль

## Сравнение Angular vs React Native подходов для CRUD

| Angular | React Native |
|---------|--------------|
| `MatDialog` | `Modal` компонент |
| `MatSnackBar` | `Alert.alert()` через `messageService` |
| `(click)="delete(element)"` | `onPress` обработчик |
| `confirm()` | Кастомный `ConfirmDialog` |
| Отдельные компоненты | Модальные окна в том же экране |

## Команды Git

```bash
# Проверка статуса
git status

# Создание ветки sprint9
git checkout -b sprint9

# Добавление всех изменений
git add -A

# Создание коммита
git commit -m "Выполнен sprint9: CRUD операции"

# Переключение на master
git checkout master

# Ребейз sprint9 в master
git rebase sprint9
```

Эта реализация полностью воспроизводит функциональность Angular на React Native с:
- Модальным окном для создания пользователя
- Диалогом подтверждения перед удалением
- Страницей редактирования пользователя
- Уведомлениями об успешных операциях
- Защитой от удаления самого себя
- Защитой от потери несохраненных изменений
- Интеграцией всех CRUD операций
