import { Grid, Paper, Typography, Box } from '@mui/material';
import { Users, Files, Activity } from 'lucide-react';

type StatsCardsProps = {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export const StatsCards = ({ totalCount, totalPages, currentPage, pageSize }: StatsCardsProps) => {
  const cards = [
    { title: 'Всего записей', value: totalCount, icon: <Files size={24} />, color: '#3f51b5' },
    { title: 'Всего страниц', value: totalPages, icon: <Activity size={24} />, color: '#f50057' },
    {
      title: 'На текущей странице',
      value: Math.min(pageSize, totalCount - (currentPage - 1) * pageSize),
      icon: <Users size={24} />,
      color: '#4caf50',
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderLeft: `4px solid ${card.color}` }}>
            <Box
              sx={{
                width: 48, height: 48, borderRadius: '50%',
                bgcolor: `${card.color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: card.color,
              }}
            >
              {card.icon}
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold">{card.value}</Typography>
              <Typography variant="body2" color="text.secondary">{card.title}</Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};
