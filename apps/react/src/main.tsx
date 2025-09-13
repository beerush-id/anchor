import { createRoot } from 'react-dom/client';
import './index.css';
import { StrictMode } from 'react';
import { setDebugRenderer, setDevMode } from '@anchor/react';
import { BrowserRouter, Route, Routes } from 'react-router';
import Home from '@pages/home/Home.js';
import { CustomRenderer } from '@pages/custom-renderer/CustomRenderer.js';
import { BASE_PATH } from '@lib/nav.js';
import Playground from '@pages/playground/Playground.js';

setDevMode(process.env.NODE_ENV === 'development');
setDebugRenderer(true);

createRoot(document.body).render(
  <StrictMode>
    <BrowserRouter basename={BASE_PATH}>
      <Routes>
        <Route index element={<Home />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/custom-renderer" element={<CustomRenderer />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
