import { createRoot } from 'react-dom/client';
import './index.css';
import { setDebugRenderer, setDevMode } from '@anchorlib/react';
import { BrowserRouter, Route, Routes } from 'react-router';
import Home from '@pages/home/Home.js';
import { CustomRenderer } from '@pages/custom-renderer/CustomRenderer.js';
import { BASE_PATH } from '@lib/nav.js';
import Playground from '@pages/playground/Playground.js';
import TodoApp from '@pages/playground/TodoApp.js';
import { Basic } from '@pages/runtime/Basic.js';

setDevMode(process.env.NODE_ENV === 'development');
setDebugRenderer(true);

createRoot(document.body).render(
  <BrowserRouter basename={BASE_PATH}>
    <Routes>
      <Route index element={<Home />} />
      <Route path="/playground" element={<Playground />} />
      <Route path="/playground/todo-app" element={<TodoApp />} />
      <Route path="/runtime/basic" element={<Basic />} />
      <Route path="/custom-renderer" element={<CustomRenderer />} />
    </Routes>
  </BrowserRouter>
);
