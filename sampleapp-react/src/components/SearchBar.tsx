import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Search, X } from 'lucide-react';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export const SearchBar = ({
  value,
  onChange,
  placeholder = 'Поиск...',
  disabled = false,
}: SearchBarProps) => (
  <TextField
    fullWidth
    variant="outlined"
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    slotProps={{
      htmlInput: { autoComplete: 'new-password' },
      input: {
        startAdornment: (
          <InputAdornment position="start">
            <Search size={20} color="#999" />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton onClick={() => onChange('')} size="small" edge="end">
              <X size={18} />
            </IconButton>
          </InputAdornment>
        ) : undefined,
      },
    }}
    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
  />
);
