import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Paper, Typography, Box, Avatar, Chip,
  CircularProgress, Alert, Button, Divider,
  Card, CardContent, Grid, IconButton, Tooltip,
} from '@mui/material';
import { User as UserIcon, Shield, Edit, ArrowLeft, Share2, Star, Award } from 'lucide-react';
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
      } catch {
        setError('Не удалось загрузить профиль пользователя');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [id]);

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
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Пользователь не найден'}</Alert>
        <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate(-1)}>Назад</Button>
      </Container>
    );
  }

  const isOwnProfile = currentUser?.id === user.id;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate(-1)}>Назад</Button>
        <Tooltip title="Поделиться">
          <IconButton onClick={() => alert('Ссылка на профиль скопирована')}>
            <Share2 size={20} />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper sx={{ p: 4, mb: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <Avatar
            sx={{
              width: 120, height: 120,
              bgcolor: isOwnProfile ? 'primary.main' : 'secondary.main',
              mb: 2, fontSize: '3rem',
            }}
          >
            {user.login.charAt(0).toUpperCase()}
          </Avatar>

          <Typography variant="h4" gutterBottom>{user.name || user.login}</Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>@{user.login}</Typography>

          <Box display="flex" gap={1} mt={1}>
            {isOwnProfile && (
              <Chip icon={<Star size={14} />} label="Это вы" color="primary" size="small" />
            )}
            {user.token && (
              <Chip icon={<Shield size={14} />} label="JWT активен" color="success" size="small" />
            )}
          </Box>

          {isOwnProfile && (
            <Button
              variant="outlined"
              startIcon={<Edit size={18} />}
              onClick={() => navigate(`/profile/${user.id}/edit`)}
              sx={{ mt: 2 }}
            >
              Редактировать профиль
            </Button>
          )}
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <UserIcon size={20} color="#3f51b5" />
                <Typography variant="h6">Основная информация</Typography>
              </Box>
              <Box display="flex" flexDirection="column" gap={2}>
                {[
                  { label: 'ID', value: user.id },
                  { label: 'Логин', value: user.login },
                  { label: 'Имя', value: user.name || 'Не указано' },
                ].map(({ label, value }) => (
                  <Box key={label} display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>{label}:</Typography>
                    <Typography variant="body1">{value}</Typography>
                  </Box>
                ))}
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
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>Статус:</Typography>
                  <Chip size="small" label={user.token ? 'Активен' : 'Не активен'} color={user.token ? 'success' : 'default'} />
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>Токен:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {user.token ? `${user.token.substring(0, 15)}...` : 'Нет'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {isOwnProfile && currentUser?.token && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Shield size={20} color="#4caf50" />
                  <Typography variant="h6">Ваш JWT токен</Typography>
                </Box>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
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
