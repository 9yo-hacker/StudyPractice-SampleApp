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

  if (variant === 'switch') {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={isDark}
            onChange={toggleTheme}
            color="default"
          />
        }
        label={showLabel ? (isDark ? 'Темная' : 'Светлая') : ''}
      />
    );
  }

  if (variant === 'full') {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <Tooltip title="Переключить тему">
          <IconButton onClick={toggleTheme} color="inherit" size="small">
            {getIcon()}
          </IconButton>
        </Tooltip>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Palette size={16} />
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

  return (
    <Tooltip title={isDark ? 'Светлая тема' : 'Темная тема'}>
      <IconButton onClick={toggleTheme} color="inherit">
        {getIcon()}
      </IconButton>
    </Tooltip>
  );
};
