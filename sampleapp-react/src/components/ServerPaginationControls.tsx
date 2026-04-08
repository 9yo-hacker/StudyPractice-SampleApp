import {
  Box, IconButton, Typography, Select, MenuItem,
  FormControl, InputLabel, Paper, Tooltip,
} from '@mui/material';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

type ServerPaginationControlsProps = {
  pageNumber: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions?: number[];
  totalCount: number;
  from: number;
  to: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export const ServerPaginationControls = ({
  pageNumber,
  totalPages,
  pageSize,
  pageSizeOptions = [5, 10, 25, 50],
  totalCount,
  from,
  to,
  loading = false,
  onPageChange,
  onPageSizeChange,
  hasNextPage,
  hasPrevPage,
}: ServerPaginationControlsProps) => (
  <Paper
    variant="outlined"
    sx={{
      mt: 2, p: 2,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 2, bgcolor: 'background.default',
    }}
  >
    <Typography variant="body2" color="text.secondary">
      Записи {from}-{to} из {totalCount}
    </Typography>

    <Box display="flex" alignItems="center" gap={1}>
      <Tooltip title="Первая страница">
        <span>
          <IconButton onClick={() => onPageChange(1)} disabled={!hasPrevPage || loading} size="small">
            <ChevronsLeft size={20} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Предыдущая страница">
        <span>
          <IconButton onClick={() => onPageChange(pageNumber - 1)} disabled={!hasPrevPage || loading} size="small">
            <ChevronLeft size={20} />
          </IconButton>
        </span>
      </Tooltip>

      <Typography variant="body2" sx={{ mx: 1 }}>
        Страница {pageNumber} из {totalPages}
      </Typography>

      <Tooltip title="Следующая страница">
        <span>
          <IconButton onClick={() => onPageChange(pageNumber + 1)} disabled={!hasNextPage || loading} size="small">
            <ChevronRight size={20} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Последняя страница">
        <span>
          <IconButton onClick={() => onPageChange(totalPages)} disabled={!hasNextPage || loading} size="small">
            <ChevronsRight size={20} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>

    <FormControl size="small" sx={{ minWidth: 120 }}>
      <InputLabel id="page-size-label">На странице</InputLabel>
      <Select
        labelId="page-size-label"
        value={pageSize}
        label="На странице"
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        disabled={loading}
      >
        {pageSizeOptions.map((option) => (
          <MenuItem key={option} value={option}>{option} записей</MenuItem>
        ))}
      </Select>
    </FormControl>
  </Paper>
);
