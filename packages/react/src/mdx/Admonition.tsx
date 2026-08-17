import type { HTMLAttributes, ReactNode } from 'react';
import { classx, Show, template } from '../index.js';

export type AdmonitionType = 'note' | 'tip' | 'info' | 'warning' | 'danger' | 'important' | 'caution';

export interface AdmonitionProps extends HTMLAttributes<HTMLDivElement> {
  type?: AdmonitionType;
  title?: string;
  icon?: ReactNode;
  children?: ReactNode;
}

export const Admonition = template<AdmonitionProps>(
  ({ type = 'note', title, icon, className, children, role, ...restProps }) => {
    const isAlert = type === 'warning' || type === 'danger' || type === 'caution';
    const heading = title ?? defaultTitles[type];
    const visualIcon = icon ?? defaultIcons[type];

    return (
      <div role={role ?? (isAlert ? 'alert' : 'note')} {...restProps} className={classx('admonition', type, className)}>
        <Show when={() => heading || visualIcon}>
          {() => (
            <div className="admonition-header">
              <Show when={() => visualIcon}>
                {() => (
                  <span className="admonition-icon" aria-hidden="true">
                    {visualIcon}
                  </span>
                )}
              </Show>
              <Show when={() => heading}>{() => <span className="admonition-title">{heading}</span>}</Show>
            </div>
          )}
        </Show>
        <div className="admonition-content">{children}</div>
      </div>
    );
  },
  'Admonition'
);

export const NoteBlock = template<Omit<AdmonitionProps, 'type'>>(
  (props) => <Admonition type="note" {...props} />,
  'NoteBlock'
);

export const TipBlock = template<Omit<AdmonitionProps, 'type'>>(
  (props) => <Admonition type="tip" {...props} />,
  'TipBlock'
);

export const InfoBlock = template<Omit<AdmonitionProps, 'type'>>(
  (props) => <Admonition type="info" {...props} />,
  'InfoBlock'
);

export const WarningBlock = template<Omit<AdmonitionProps, 'type'>>(
  (props) => <Admonition type="warning" {...props} />,
  'WarningBlock'
);

export const DangerBlock = template<Omit<AdmonitionProps, 'type'>>(
  (props) => <Admonition type="danger" {...props} />,
  'DangerBlock'
);

export const ImportantBlock = template<Omit<AdmonitionProps, 'type'>>(
  (props) => <Admonition type="important" {...props} />,
  'ImportantBlock'
);

export const CautionBlock = template<Omit<AdmonitionProps, 'type'>>(
  (props) => <Admonition type="caution" {...props} />,
  'CautionBlock'
);

const defaultTitles: Record<AdmonitionType, string> = {
  note: 'Note',
  tip: 'Tip',
  info: 'Info',
  warning: 'Warning',
  danger: 'Danger',
  important: 'Important',
  caution: 'Caution',
};

const defaultIcons: Record<AdmonitionType, ReactNode> = {
  note: (
    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
      <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h360q17 0 28.5 11.5T600-800q0 17-11.5 28.5T560-760H200v560h560v-280q0-17 11.5-28.5T800-520q17 0 28.5 11.5T840-480v280q0 33-23.5 56.5T760-120H200Zm380-460 226-226q9-9 22.5-9t22.5 9l40 40q9 9 9 22.5t-9 22.5L664-494l-84-86Zm-60 60-160 160v84h84l160-160-84-84Z" />
    </svg>
  ),
  tip: (
    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
      <path d="M480-80q-17 0-28.5-11.5T440-120h80q0 17-11.5 28.5T480-80Zm-80-80q-17 0-28.5-11.5T360-200q0-17 11.5-28.5T400-240h160q17 0 28.5 11.5T600-200q0 17-11.5 28.5T560-160H400Zm-80-120q-17 0-28.5-11.5T280-320q0-17 11.5-28.5T320-360h320q17 0 28.5 11.5T680-320q0 17-11.5 28.5T640-280H320Zm-40-120q-67-46-103.5-115.5T140-580q0-142 99-241t241-99q142 0 241 99t99 241q0 75-36.5 144.5T680-400H280Zm40-80h320q48-35 74-88.5t26-111.5q0-108-76-184t-184-76q-108 0-184 76t-76 184q0 58 26 111.5t74 88.5Zm160-200Z" />
    </svg>
  ),
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
      <path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
    </svg>
  ),
  warning: (
    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
      <path d="m82-176 348-604q12-21 28-30.5t32-9.5q16 0 32 9.5t28 30.5l348 604q12 21 6.5 44.5T884-108q-14 12-34 12H110q-20 0-34-12t-6.5-44.5q6.5-23.5 12.5-23.5Zm134-64h528L480-692 216-240Zm264-40q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-120h80v-160h-80v160Zm40-100Z" />
    </svg>
  ),
  danger: (
    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
      <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
    </svg>
  ),
  important: (
    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
      <path d="M480-160q-17 0-28.5-11.5T440-200q0-17 11.5-28.5T480-240q17 0 28.5 11.5T520-200q0 17-11.5 28.5T480-160Zm-40-200q-17 0-28.5-11.5T400-400v-360q0-17 11.5-28.5T440-800h80q17 0 28.5 11.5T560-760v360q0 17-11.5 28.5T520-360h-80Z" />
    </svg>
  ),
  caution: (
    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
      <path d="M330-120 120-330v-300l210-210h300l210 210v300L630-120H330Zm33-80h234l163-163v-234L597-760H363L200-597v234l163 163Zm117-80q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-200h-80v200Zm40-80Z" />
    </svg>
  ),
};
