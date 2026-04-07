import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import UsersPage from './pages/UsersPage';

function App() {
  return (
    <BrowserRouter>
      <CssBaseline />
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/users" element={<UsersPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
