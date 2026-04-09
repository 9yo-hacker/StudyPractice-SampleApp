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
  Eye,
} from 'lucide-react';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';

type ThemeSettingsProps = {
  open: boolean;
  onClose: () => void;
};

export const ThemeSettings = ({ open, onClose }: ThemeSettingsProps) => {
  const { mode, setMode, isDark } = useTheme();

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
