import { useState } from 'react';
import { Container, Typography, Box, Paper, Avatar, Button, Snackbar, Alert } from '@mui/material';
import { Home, Users, Sparkles, LogIn, UserPlus, Loader2, Shield, Server, Bug, Palette, DatabaseZap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { seedUsers } from '../api/users';

export const HomePage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ count: number } | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const users = await seedUsers();
      setSeedResult({ count: users.length });
    } catch {
      setSeedError('Ошибка при заполнении базы данных');
    } finally {
      setSeeding(false);
    }
  };

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
        {user && token && (
          <Box mt={3} p={2} bgcolor="action.hover" borderRadius={1} display="flex" alignItems="center" justifyContent="center" gap={1}>
            <Shield size={16} color="#4caf50" />
            <Typography variant="caption" color="text.secondary">
              JWT токен активен
            </Typography>
          </Box>
        )}

        <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap" mt={2}>
          <Button
            variant="outlined"
            startIcon={<Loader2 size={20} />}
            onClick={() => navigate('/loading-demo')}
          >
            Демо лоадера
          </Button>
          <Button
            variant="outlined"
            startIcon={<Server size={20} />}
            onClick={() => navigate('/users-server')}
          >
            Серверная пагинация
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Bug size={20} />}
            onClick={() => navigate('/error-demo')}
          >
            Демо ошибок
          </Button>
          <Button
            variant="outlined"
            startIcon={<Palette size={20} />}
            onClick={() => navigate('/theme-settings')}
          >
            Настройки темы
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={seeding ? <Loader2 size={20} /> : <DatabaseZap size={20} />}
            onClick={handleSeed}
            disabled={seeding}
          >
            {seeding ? 'Заполняется...' : 'Seed 50 пользователей'}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={!!seedResult}
        autoHideDuration={4000}
        onClose={() => setSeedResult(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSeedResult(null)}>
          Добавлено {seedResult?.count} пользователей
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!seedError}
        autoHideDuration={4000}
        onClose={() => setSeedError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSeedError(null)}>
          {seedError}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default HomePage;
