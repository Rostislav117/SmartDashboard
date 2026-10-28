import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Kiosk from './pages/Kiosk.jsx';
import Staff from './pages/Staff.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Kiosk />} />
      <Route path="/staff" element={<Staff />} />
    </Routes>
  </BrowserRouter>
);
