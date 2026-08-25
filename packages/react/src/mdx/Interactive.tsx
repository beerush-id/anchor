import type { HTMLAttributes, ReactNode } from 'react';
import { type Bindable, classx, render, Show, Snippet, setup, snippet, uIndex } from '../index.js';

export type InteractivePanel = 'source' | 'preview';

export interface InteractiveProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: ReactNode;
  panel?: Bindable<InteractivePanel>;
  children?: ReactNode;
  standalone?: boolean;
}

const INTERACTIVE_INDEX = Symbol.for('air.mdx.interactive');

const DEFAULT_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
    <path d="M460-171.46v-297.08L200-619.08v283.23q0 6.16 3.08 11.54 3.07 5.39 9.23 9.23L460-171.46Zm40 0 247.69-143.62q6.16-3.84 9.23-9.23 3.08-5.38 3.08-11.54v-283.23L500-468.54v297.08Zm-20-331.46 257-148.54-244.69-141.62q-6.16-3.84-12.31-3.84t-12.31 3.84L223-651.46l257 148.54ZM192.31-279.69q-15.16-8.69-23.73-23.62-8.58-14.92-8.58-32.31v-288.76q0-17.39 8.58-32.31 8.57-14.93 23.73-23.62l255.38-147.15q15.16-8.69 32.31-8.69 17.15 0 32.31 8.69l255.38 147.15q15.16 8.69 23.73 23.62 8.58 14.92 8.58 32.31v288.76q0 17.39-8.58 32.31-8.57 14.93-23.73 23.62L512.31-132.54q-15.16 8.69-32.31 8.69-17.15 0-32.31-8.69L192.31-279.69ZM480-480Z" />
  </svg>
);

export const Interactive = setup<InteractiveProps>((props) => {
  const $restProps = props.$omit(['title', 'icon', 'panel', 'children', 'className', 'id', 'standalone']);
  const name = props.id ?? `air-interactive-${uIndex(INTERACTIVE_INDEX)}`;
  props.panel = props.panel ?? 'preview';

  const InteractiveHeader = snippet(() => (
    <div className="air-interactive-header">
      <span className="air-interactive-controls" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <div className="air-interactive-title-bar">
        <Snippet>
          {() => (
            <>
              <span className="air-interactive-icon" aria-hidden="true">
                {props.icon ?? DEFAULT_ICON}
              </span>
              <span className="air-interactive-title">{props.title ?? 'Interactive Demo'}</span>
            </>
          )}
        </Snippet>
      </div>
      <Show when={() => !('standalone' in props)}>
        {() => (
          <div className="air-interactive-toggle" role="radiogroup" aria-label="Toggle panel" data-panel={props.panel}>
            <label>
              <input
                type="radio"
                name={name}
                value="source"
                checked={props.panel === 'source'}
                onChange={() => (props.panel = 'source')}
              />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
                <path d="M320-267.69 107.69-480 320-692.31l28.54 28.54-184 184L348.31-296 320-267.69Zm320 0-28.54-28.54 184-184L611.69-664 640-692.31 852.31-480 640-267.69Z" />
              </svg>
              Source
            </label>
            <label>
              <input
                type="radio"
                name={name}
                value="preview"
                checked={props.panel === 'preview'}
                onChange={() => (props.panel = 'preview')}
              />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
                <path d="M759-201q41-41 41-99v-80H520v80q0 58 41 99t99 41q58 0 99-41ZM520.23-420H640v-137.85q-52.62 7.16-85.5 45.85t-34.27 92ZM680-420h119.77q-1.39-53.31-34.27-92T680-557.85V-420ZM532.46-172.46Q480-224.92 480-300v-120q0-75.08 52.46-127.54Q584.92-600 660-600q75.08 0 127.54 52.46Q840-495.08 840-420v120q0 75.08-52.46 127.54Q735.08-120 660-120q-75.08 0-127.54-52.46ZM160-240v-480 480Zm24.62 40q-27.62 0-46.12-18.5Q120-237 120-264.62v-430.76q0-27.62 18.5-46.12Q157-760 184.62-760h590.76q27.62 0 46.12 18.5Q840-723 840-695.38h-40q0-10.77-6.92-17.7-6.93-6.92-17.7-6.92H184.62q-10.77 0-17.7 6.92-6.92 6.93-6.92 17.7v430.76q0 10.77 6.92 17.7 6.93 6.92 17.7 6.92h200.23v40H184.62Z" />
              </svg>
              Preview
            </label>
          </div>
        )}
      </Show>
    </div>
  ));

  return render(
    () => (
      <div {...$restProps} id={props.id} className={classx('air-interactive', props.className)}>
        <InteractiveHeader />
        <div className="air-interactive-content">{props.children}</div>
      </div>
    ),
    'Interactive'
  );
}, 'Interactive');
