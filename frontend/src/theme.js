import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1', // Indigo 500
      light: '#818cf8', // Indigo 400
      dark: '#4f46e5', // Indigo 600
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#94a3b8', // Slate 400
      light: '#cbd5e1', // Slate 300
      dark: '#475569', // Slate 600
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
    background: {
      default: '#000000',
      paper: '#0a0a0a',
    },
    divider: 'rgba(255, 255, 255, 0.06)',
  },
  typography: {
    fontFamily: [
      'Inter',
      'Plus Jakarta Sans',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'sans-serif',
    ].join(','),
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontFamily: 'Plus Jakarta Sans, sans-serif',
    },
    h1: { fontFamily: 'Plus Jakarta Sans, sans-serif' },
    h2: { fontFamily: 'Plus Jakarta Sans, sans-serif' },
    h3: { fontFamily: 'Plus Jakarta Sans, sans-serif' },
    h4: { fontFamily: 'Plus Jakarta Sans, sans-serif' },
    h5: { fontFamily: 'Plus Jakarta Sans, sans-serif' },
    h6: { fontFamily: 'Plus Jakarta Sans, sans-serif' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: 'none',
          padding: '8px 16px',
          fontWeight: 600,
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none', // Remove default MUI overlay gradient
          border: '1px solid rgba(255, 255, 255, 0.06)',
          backgroundColor: 'rgba(15, 15, 15, 0.75)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontWeight: 600,
          fontSize: '0.8rem',
          minHeight: 0,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0a0a0a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
  },
});

export default theme;
