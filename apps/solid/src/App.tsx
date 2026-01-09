import './App.css';
import TodoApp from './components/TodoApp.js';

function App() {
  return (
    <div class="flex w-screen h-screen flex-col justify-center items-center gap-8 md:flex-row">
      <TodoApp />
    </div>
  );
}

export default App;
