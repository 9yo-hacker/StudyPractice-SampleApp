import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const { pathname } = useLocation();

  return (
    <AppBar position="static">
      <Toolbar>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            component={Link}
            to="/"
            color="inherit"
            variant={pathname === '/' ? 'outlined' : 'text'}
          >
            Главная
          </Button>
          <Button
            component={Link}
            to="/users"
            color="inherit"
            variant={pathname === '/users' ? 'outlined' : 'text'}
          >
            Пользователи
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
