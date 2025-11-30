import '@anchorlib/react-next/client';
import { createRoot } from 'react-dom/client';
import './index.css';
import { anchor, setDebugRenderer, setDevMode } from '@anchorlib/react-classic';
import { BASE_PATH } from '@lib/nav.js';
import { CustomRenderer } from '@pages/custom-renderer/CustomRenderer.js';
import Home from '@pages/home/Home.js';
import DemoTodoApp from '@pages/playground/DemoTodoApp.js';
import Playground from '@pages/playground/Playground.js';
import TodoApp from '@pages/playground/TodoApp.js';
import { BrowserRouter, Route, Routes } from 'react-router';

anchor.configure({
  production: process.env.NODE_ENV !== 'development',
});

setDevMode(process.env.NODE_ENV === 'development');
setDebugRenderer(true);

createRoot(document.body).render(
  <BrowserRouter basename={BASE_PATH}>
    <Routes>
      <Route index element={<Home />} />
      <Route path="/playground" element={<Playground />} />
      <Route path="/playground/todo-app" element={<TodoApp />} />
      <Route path="/playground/demo-todo-app" element={<DemoTodoApp />} />
      <Route path="/custom-renderer" element={<CustomRenderer />} />
    </Routes>
  </BrowserRouter>
);
