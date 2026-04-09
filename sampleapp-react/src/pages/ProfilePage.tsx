import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Paper, Typography, Box, Avatar, Chip,
  CircularProgress, Alert, Button, Divider,
  Grid, IconButton, Tooltip,
} from '@mui/material';
import { User as UserIcon, Shield, Edit, ArrowLeft, Share2, Star, Award, Hash, AtSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserById } from '../api/users';
import { User } from '../types';

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <Box>
    <Box display="flex" alignItems="center" gap={1.5} py={1.5}>
      <Box sx={{ color: 'text.secondary', display: 'flex', flexShrink: 0 }}>{icon}</Box>
      <Box flex={1}>
        <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
        <Typography variant="body1" fontWeight={500}>{value}</Typography>
      </Box>
    </Box>
    <Divider />
  </Box>
);

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

      {/* Шапка профиля */}
      <Paper sx={{ p: 4, mb: 3, textAlign: 'center' }}>
        <Avatar
          sx={{
            width: 100, height: 100,
            bgcolor: isOwnProfile ? 'primary.main' : 'secondary.main',
            fontSize: '2.5rem',
            mx: 'auto',
            mb: 2,
          }}
        >
          {user.login.charAt(0).toUpperCase()}
        </Avatar>

        <Typography variant="h4" gutterBottom fontWeight={700}>
          {user.name || user.login}
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          @{user.login}
        </Typography>

        <Box display="flex" gap={1} justifyContent="center" mt={1.5}>
          {isOwnProfile && (
            <Chip icon={<Star size={14} />} label="Это вы" color="primary" size="small" />
          )}
          <Chip
            icon={<Shield size={14} />}
            label={user.token ? 'JWT активен' : 'Не авторизован'}
            color={user.token ? 'success' : 'default'}
            size="small"
          />
        </Box>

        {isOwnProfile && (
          <Button
            variant="outlined"
            startIcon={<Edit size={18} />}
            onClick={() => navigate(`/profile/${user.id}/edit`)}
            sx={{ mt: 2.5 }}
          >
            Редактировать профиль
          </Button>
        )}
      </Paper>

      {/* Карточки */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <UserIcon size={20} color="inherit" />
              <Typography variant="h6" fontWeight={600}>Основная информация</Typography>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <InfoRow icon={<Hash size={16} />} label="ID" value={user.id} />
            <InfoRow icon={<AtSign size={16} />} label="Логин" value={user.login} />
            <InfoRow
              icon={<UserIcon size={16} />}
              label="Имя"
              value={user.name || <Typography component="span" color="text.disabled">Не указано</Typography>}
            />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Award size={20} />
              <Typography variant="h6" fontWeight={600}>Статистика</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box display="flex" gap={2}>
              <Paper
                variant="outlined"
                sx={{
                  flex: 1, p: 2, textAlign: 'center',
                  borderColor: user.token ? 'success.main' : 'divider',
                }}
              >
                <Shield size={24} color={user.token ? '#4caf50' : 'inherit'} />
                <Typography variant="h6" fontWeight={700} mt={0.5}>
                  {user.token ? 'Активен' : 'Нет'}
                </Typography>
                <Typography variant="caption" color="text.secondary">Статус</Typography>
              </Paper>

              <Paper variant="outlined" sx={{ flex: 1, p: 2, textAlign: 'center' }}>
                <Star size={24} />
                <Typography variant="h6" fontWeight={700} mt={0.5}>#{user.id}</Typography>
                <Typography variant="caption" color="text.secondary">Номер</Typography>
              </Paper>
            </Box>
          </Paper>
        </Grid>

        {isOwnProfile && currentUser?.token && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Shield size={20} color="#4caf50" />
                <Typography variant="h6" fontWeight={600}>Ваш JWT токен</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Paper
                variant="outlined"
                sx={{ p: 2, bgcolor: 'action.hover', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}
              >
                {currentUser.token}
              </Paper>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Используется для авторизации запросов к API
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};
