import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Paper, Typography, Box, Avatar,
  TextField, Button, CircularProgress, Alert, Divider,
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
  const [formData, setFormData] = useState({ name: '', login: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.id === Number(id);
  const isDirty = formData.name !== (user?.name || '') || formData.login !== (user?.login || '');

  usePreventUnsavedChanges({ isDirty: isDirty && !saving });

  useEffect(() => {
    if (!isOwnProfile) { navigate('/users', { replace: true }); return; }

    const loadUser = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getUserById(parseInt(id));
        setUser(data);
        setFormData({ name: data.name || '', login: data.login });
      } catch {
        setError('Не удалось загрузить данные профиля');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [id, isOwnProfile, navigate]);

  const handleChange = (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.login.trim()) { alert('Логин не может быть пустым'); return; }

    try {
      setSaving(true);
      setError(null);
      await updateUser(Number(id), { name: formData.name, login: formData.login });
      if (currentUser) {
        localStorage.setItem('user', JSON.stringify({ ...currentUser, name: formData.name, login: formData.login }));
      }
      navigate(`/profile/${id}`);
    } catch (err: unknown) {
      const apiErrors = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors;
      if (apiErrors) {
        setError(Object.values(apiErrors).flat().join('. '));
      } else {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg || 'Ошибка при обновлении профиля');
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
        <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>Назад</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>Назад</Button>

      <Paper sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
            <UserIcon size={32} />
          </Avatar>
          <Box>
            <Typography variant="h5">Редактирование профиля</Typography>
            <Typography variant="body2" color="text.secondary">ID: {user?.id}</Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Box display="flex" flexDirection="column" gap={3}>
            <TextField fullWidth label="Имя" value={formData.name} onChange={handleChange('name')} disabled={saving} />
            <TextField fullWidth label="Логин" value={formData.login} onChange={handleChange('login')} disabled={saving} required />

            {isDirty && <Alert severity="info">✏️ У вас есть несохраненные изменения</Alert>}

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
