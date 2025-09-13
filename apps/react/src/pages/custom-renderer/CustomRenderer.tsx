import { anchor, createObserver, type StateObserver } from '@anchorlib/core';
import { useRefTrap } from '@anchorlib/react';

type DOMFactory = () => HTMLElement | HTMLElement[];
type ComponentFactory = () => DOMFactory;

function createRenderer(component: ComponentFactory): () => HTMLElement | HTMLElement[] {
  const onChange = (() => {
    // Re-render when the state changed.
    render();
  }) satisfies StateObserver['onChange'];

  const observer = createObserver(onChange); // Create the observer to track the state.
  const template = observer.run(() => component()) as DOMFactory; // Track the state read during component setup.

  const render = () => {
    // Render the template while tracking the state read.
    return observer.run(() => template()) as HTMLElement | HTMLElement[];
  };

  return render;
}

function mount(component: ComponentFactory, target: HTMLElement) {
  const render = createRenderer(component);
  const elements = render();

  if (Array.isArray(elements)) {
    for (const element of elements) {
      target.appendChild(element);
    }
  } else {
    target.appendChild(elements);
  }
}

function Counter() {
  // Setup phase.
  const state = anchor({ count: 1 });

  const view = document.createElement('div');
  view.setAttribute('class', 'text-slate-300 font-bold text-lg mb-2');

  const button = document.createElement('button');
  button.setAttribute('class', 'bg-blue-500 text-blue-50 px-4 py-2 rounded-md');

  button.textContent = 'Increment';
  button.addEventListener('click', () => {
    state.count++;
  });

  console.log('Component setup done (run once).');

  // Render phase.
  return (() => {
    console.log('Rendering the view (re-run on state change).');

    view.textContent = `Count: ${state.count}`;
    return [view, button];
  }) as DOMFactory;
}

export function CustomRenderer() {
  const ref = useRefTrap<HTMLDivElement>(null, (target) => {
    if (!target) return null;
    mount(Counter, target as HTMLElement);
    return target;
  });

  return (
    <div className="flex flex-col gap-6 justify-center items-center w-screen h-screen" ref={ref}>
      <h1 className="text-3xl font-light">Custom Renderer</h1>
    </div>
  );
}
