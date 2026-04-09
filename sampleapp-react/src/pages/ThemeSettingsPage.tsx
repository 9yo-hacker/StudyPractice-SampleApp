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
} from '@mui/material';
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';

export const ThemeSettingsPage = () => {
  const { mode, setMode, isDark } = useTheme();

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

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 6 }}>
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

          <Grid size={{ xs: 12, md: 6 }}>
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

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Дополнительные настройки
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Анимированные переходы"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Плавные переходы при смене темы
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
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
