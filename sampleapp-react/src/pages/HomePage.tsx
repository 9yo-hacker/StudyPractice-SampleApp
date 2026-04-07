import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export default function HomePage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: 6, textAlign: 'center', maxWidth: 800, width: '100%' }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Добро пожаловать
        </Typography>
        <Typography variant="h5" color="text.secondary">
          SampleApp на React
        </Typography>
        <Typography variant="body1" sx={{ mt: 3 }}>
          Демонстрационное приложение, показывающее пользователей из API.
        </Typography>
      </Paper>
    </Container>
  );
}
