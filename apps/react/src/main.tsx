import { createRoot } from 'react-dom/client';
import './index.css';
import { StrictMode } from 'react';
import { setDevMode } from '@anchor/react';
import { BrowserRouter, Route, Routes } from 'react-router';
import Home from '@pages/Home.js';

setDevMode(process.env.NODE_ENV === 'development');

createRoot(document.body).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route index element={<Home />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
