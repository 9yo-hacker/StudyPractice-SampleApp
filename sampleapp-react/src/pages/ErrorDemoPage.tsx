import { useState, useEffect } from 'react';
import { ErrorResponse } from '../services/error.service';
import {
  Container, Paper, Typography, Box, Button,
  TextField, Grid, Card, CardContent, Alert, Divider, Chip,
} from '@mui/material';
import { Bug, AlertCircle, WifiOff, Shield, Server, FileWarning, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { errorService } from '../services/error.service';

export const ErrorDemoPage = () => {
  const [userId, setUserId] = useState('999999');
  const [loading, setLoading] = useState<string | null>(null);
  const [lastError, setLastError] = useState<ErrorResponse | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    const unsubscribe = errorService.subscribe((err) => {
      setLastError(err);
      setErrorCount(errorService.getErrorCount());
    });
    return unsubscribe;
  }, []);

  const trigger404 = async () => {
    setLoading('404');
    try { await apiClient.get(`/Users/${userId}`); } catch { /* handled */ }
    finally { setLoading(null); }
  };

  const trigger401 = () => {
    errorService.handleError({
      response: { status: 401, data: { message: 'Не авторизован' }, config: { url: '/Users/admin' } },
      config: { url: '/Users/admin' },
    });
  };

  const triggerValidation = async () => {
    setLoading('validation');
    try { await apiClient.post('/Users', { login: '', password: '123' }); } catch { /* handled */ }
    finally { setLoading(null); }
  };

  const triggerNetwork = () => {
    errorService.handleError({ request: {}, message: 'Network Error' });
  };

  const triggerProgram = () => {
    try { throw new Error('Это тестовая программная ошибка'); }
    catch (error) { errorService.handleError(error); }
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
      loading: false,
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
      action: () => { window.location.href = '/500'; },
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
                        width: 48, height: 48, borderRadius: '50%',
                        bgcolor: `${type.color}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: type.color,
                      }}
                    >
                      {type.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6">{type.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{type.description}</Typography>
                    </Box>
                  </Box>

                  {type.params && <Box sx={{ mb: 2 }}>{type.params}</Box>}

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={type.action}
                    disabled={!!type.loading}
                    sx={{ bgcolor: type.color, '&:hover': { bgcolor: type.color, filter: 'brightness(0.9)' } }}
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
          <Typography variant="h6" gutterBottom>Статистика ошибок</Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip label={`Всего ошибок: ${errorCount}`} color="primary" />
            {lastError && (
              <Chip
                label={`Последняя: ${lastError.status} - ${lastError.message.substring(0, 30)}...`}
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      </Paper>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </Container>
  );
};
