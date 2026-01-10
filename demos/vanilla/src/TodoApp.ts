import { effect, mutable, untrack } from '@anchorlib/core';
import { type TodoRec, type TodoRecList, todoTable } from './todos.js';

export class TodoApp {
  private container: HTMLElement;
  private todos: TodoRecList = [];
  private loadingElement: HTMLElement | null = null;
  private errorElement: HTMLElement | null = null;
  private formElement: HTMLElement | null = null;
  private listElement: HTMLElement | null = null;
  private statsElement: HTMLElement | null = null;

  private newText = mutable('');

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.setupReactivity();
  }

  private render() {
    this.container.innerHTML = `
      <div class="mt-10 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white p-10 dark:border-slate-700 dark:bg-slate-800">
        <div class="mb-10 flex flex-col items-center justify-center">
          <img src="/images/anchor-logo.svg" alt="Anchor Logo" class="mb-4 w-16" />
          <h1 class="text-3xl font-medium text-gray-800 dark:text-white">Todo App</h1>
        </div>
        <div class="todo-app-content">
          <!-- Loading/Error/Content will be rendered here dynamically -->
        </div>
      </div>
    `;

    const contentContainer = this.container.querySelector('.todo-app-content');
    if (contentContainer) {
      this.loadingElement = document.createElement('div');
      this.loadingElement.className = 'loading';
      this.loadingElement.textContent = 'Loading...';

      this.errorElement = document.createElement('div');
      this.errorElement.className = 'error';

      contentContainer.appendChild(this.loadingElement);
    }
  }

  private setupReactivity() {
    const todosState = todoTable.list();

    effect(() => {
      if (todosState.status === 'pending') {
        untrack(() => this.handlePendingState());
      } else if (todosState.status === 'error') {
        untrack(() => this.handleErrorState());
      } else if (todosState.status === 'ready') {
        untrack(() => this.handleReadyState(todosState.data));
      }
    });
  }

  private handlePendingState() {
    if (this.loadingElement) {
      this.loadingElement.style.display = 'block';
    }
    if (this.formElement) this.formElement.style.display = 'none';
    if (this.listElement) this.listElement.style.display = 'none';
    if (this.statsElement) this.statsElement.style.display = 'none';
    if (this.errorElement) this.errorElement.style.display = 'none';
  }

  private handleErrorState(error?: Error) {
    if (this.loadingElement) {
      this.loadingElement.style.display = 'none';
    }
    if (this.errorElement) {
      this.errorElement.style.display = 'block';
      this.errorElement.textContent = `Error: ${error?.message || 'Unknown error'}`;
    }
    if (this.formElement) this.formElement.style.display = 'none';
    if (this.listElement) this.listElement.style.display = 'none';
    if (this.statsElement) this.statsElement.style.display = 'none';
  }

  private handleReadyState(data: TodoRecList) {
    this.todos = data;

    if (this.loadingElement) {
      this.loadingElement.style.display = 'none';
    }
    if (this.errorElement) {
      this.errorElement.style.display = 'none';
    }

    this.renderForm();
    this.renderList();
    this.renderStats();
  }

  private renderForm() {
    if (!this.formElement) {
      this.formElement = document.createElement('div');
      this.formElement.className = 'todo-form mb-6';
      const contentContainer = this.container.querySelector('.todo-app-content');
      if (contentContainer) {
        contentContainer.appendChild(this.formElement);
      }
    }

    const handleAdd = () => {
      if (this.newText.value.trim() !== '') {
        const todo = todoTable.add({ text: this.newText.value, completed: false });
        this.todos.push(todo.data);
        this.newText.value = '';
        (this.formElement!.querySelector('input[type="text"]') as HTMLInputElement).value = '';
      }
    };

    this.formElement.innerHTML = `
      <div class="flex gap-2">
        <input
          type="text"
          placeholder="Add a new task..."
          value=""
          class="new-text-input flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
        <button
          type="button"
          class="add-button rounded-lg bg-blue-500 px-4 py-2 font-bold text-white transition duration-200 hover:bg-blue-700 disabled:opacity-25 disabled:pointer-events-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    `;

    const input = this.formElement.querySelector('.new-text-input') as HTMLInputElement;
    const button = this.formElement.querySelector('.add-button') as HTMLButtonElement;

    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.newText.value = target.value;
    });

    input.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        handleAdd();
      }
    });

    button.addEventListener('click', handleAdd);

    effect(() => {
      button.disabled = !this.newText.value.trim();
    });
  }

  private renderList() {
    if (!this.listElement) {
      this.listElement = document.createElement('ul');
      this.listElement.className =
        'todo-list divide-y divide-gray-200 rounded-lg bg-gray-50 dark:divide-slate-600 dark:bg-slate-700';
      const contentContainer = this.container.querySelector('.todo-app-content');
      if (contentContainer) {
        contentContainer.appendChild(this.listElement);
      }
    }

    effect(() => {
      // Filter out deleted items
      const items = this.todos.filter((todo) => !todo.deleted_at);

      if (items.length > 0) {
        this.listElement!.innerHTML = '';

        items.forEach((todo) => {
          const itemElement = untrack(() => this.createTodoItemElement(todo));
          this.listElement!.appendChild(itemElement);
        });
      } else {
        this.listElement!.innerHTML = `
        <li class="p-4 text-center text-gray-500 dark:text-slate-400">
          No tasks yet. Add a new task to get started!
        </li>
      `;
      }
    });
  }

  private createTodoItemElement(todo: TodoRec): HTMLElement {
    const li = document.createElement('li');
    li.className = 'todo-item flex items-center p-4 transition duration-150 hover:bg-gray-100 dark:hover:bg-slate-900';

    li.innerHTML = `
      <input
        type="checkbox"
        class="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
      />
      <span class="todo-text ml-3 flex-1 text-gray-700 dark:text-slate-200"></span>
      <button
        type="button"
        class="remove-button ml-2 rounded px-2 py-1 text-red-600 opacity-80 transition duration-200 hover:opacity-100 dark:text-slate-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      </button>
    `;

    const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const textSpan = li.querySelector('.todo-text') as HTMLSpanElement;
    const removeButton = li.querySelector('.remove-button') as HTMLButtonElement;

    // Set initial state
    textSpan.textContent = todo.text;

    // Setup event handlers
    checkbox.addEventListener('change', (e) => {
      todo.completed = (e.target as HTMLInputElement).checked;
    });

    removeButton.addEventListener('click', () => {
      todoTable.remove(todo.id);
      this.renderList(); // Re-render the list to update UI
    });

    effect(() => {
      checkbox.checked = todo.completed;

      if (todo.completed) {
        textSpan.classList.add('line-through', 'text-gray-400');
      } else {
        textSpan.classList.remove('line-through', 'text-gray-400');
      }
    });

    return li;
  }

  private renderStats() {
    if (!this.statsElement) {
      this.statsElement = document.createElement('div');
      this.statsElement.className =
        'todo-stats mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800';
      const contentContainer = this.container.querySelector('.todo-app-content');
      if (contentContainer) {
        contentContainer.appendChild(this.statsElement);
      }
    }

    effect(() => {
      // Calculate stats
      const available = this.todos.filter((todo) => !todo.deleted_at);
      const total = available.length;
      const active = available.filter((todo) => !todo.completed).length;
      const completed = available.filter((todo) => todo.completed).length;

      this.statsElement!.innerHTML = `
      <div class="todo-stats-item flex flex-col items-center">
        <span class="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Total</span>
        <span class="todo-stats-value text-lg font-semibold dark:text-white">${total}</span>
      </div>
      <div class="todo-stats-item flex flex-col items-center">
        <span class="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Active</span>
        <span class="todo-stats-value text-lg font-semibold text-blue-600 dark:text-blue-400">${active}</span>
      </div>
      <div class="todo-stats-item flex flex-col items-center">
        <span class="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Completed</span>
        <span class="todo-stats-value text-lg font-semibold text-green-600 dark:text-green-400">${completed}</span>
      </div>
    `;
    });
  }
}
