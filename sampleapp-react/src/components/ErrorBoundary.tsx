import { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box, Container, Paper, Typography, Button,
  Alert, AlertTitle, Collapse,
} from '@mui/material';
import { AlertTriangle, Home, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  expanded: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, expanded: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, expanded: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => window.location.reload();
  handleGoHome = () => { window.location.href = '/'; };
  toggleExpand = () => this.setState(prev => ({ expanded: !prev.expanded }));

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <Container maxWidth="md" sx={{ py: 8 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Box display="flex" justifyContent="center" mb={3}>
              <AlertTriangle size={64} color="#f44336" />
            </Box>
            <Typography variant="h3" gutterBottom color="error">Ошибка!</Typography>
            <Typography variant="h5" gutterBottom>Что-то пошло не так</Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
              Произошла критическая ошибка в приложении. Наша команда уже уведомлена.
            </Typography>

            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              <AlertTitle>Ошибка:</AlertTitle>
              {this.state.error?.message || 'Неизвестная ошибка'}
            </Alert>

            <Box display="flex" gap={2} justifyContent="center" sx={{ mb: 3 }}>
              <Button variant="contained" startIcon={<RefreshCw size={18} />} onClick={this.handleReload}>
                Перезагрузить страницу
              </Button>
              <Button variant="outlined" startIcon={<Home size={18} />} onClick={this.handleGoHome}>
                На главную
              </Button>
            </Box>

            {this.state.errorInfo && (
              <Box>
                <Button
                  onClick={this.toggleExpand}
                  endIcon={this.state.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                >
                  {this.state.expanded ? 'Скрыть детали' : 'Показать детали'}
                </Button>
                <Collapse in={this.state.expanded}>
                  <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', textAlign: 'left', overflow: 'auto', maxHeight: 300 }}>
                    <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace' }}>
                      {this.state.error?.stack}
                      {'\n\n'}
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  </Paper>
                </Collapse>
              </Box>
            )}
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}
