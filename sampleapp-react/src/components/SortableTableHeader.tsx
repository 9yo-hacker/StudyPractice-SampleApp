import { TableCell, TableSortLabel } from '@mui/material';
import { SortDirection } from '../hooks/useSort';

type SortableTableHeaderProps<T> = {
  field: keyof T;
  label: string;
  currentSort: keyof T | null;
  direction: SortDirection;
  onSort: (field: keyof T) => void;
  width?: string | number;
};

export const SortableTableHeader = <T extends Record<string, unknown>>({
  field,
  label,
  currentSort,
  direction,
  onSort,
  width,
}: SortableTableHeaderProps<T>) => (
  <TableCell width={width}>
    <TableSortLabel
      active={currentSort === field}
      direction={currentSort === field ? direction : 'asc'}
      onClick={() => onSort(field)}
    >
      {label}
    </TableSortLabel>
  </TableCell>
);
