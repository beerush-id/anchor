import './App.css';
import TodoApp from './components/TodoApp';

function App() {
  return (
    <div className="flex w-screen h-screen flex-col justify-center items-center gap-8 md:flex-row">
      <TodoApp />
    </div>
  );
}

export default App;
