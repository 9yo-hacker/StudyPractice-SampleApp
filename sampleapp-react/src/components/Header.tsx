import { useState } from 'react';
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
  Edit,
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

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => { logout(); handleClose(); navigate('/'); };
  const handleProfile = () => { handleClose(); if (user) navigate(`/profile/${user.id}`); };
  const handleEditProfile = () => { handleClose(); if (user) navigate(`/profile/${user.id}/edit`); };
  const handleSettings = () => { handleClose(); setSettingsOpen(true); };

  return (
    <>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography
            variant="h6"
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

      <ThemeSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};

export default Header;
