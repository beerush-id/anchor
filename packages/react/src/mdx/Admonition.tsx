import type { HTMLAttributes, ReactNode } from 'react';
import { classx, template } from '../index.js';

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
        {(heading || visualIcon) && (
          <div className="admonition-header">
            {visualIcon && (
              <span className="admonition-icon" aria-hidden="true">
                {visualIcon}
              </span>
            )}
            {heading && <span className="admonition-title">{heading}</span>}
          </div>
        )}
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
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
      <path d="M200-200h360v-160q0-17 11.5-28.5T600-400h160v-360H200v560Zm0 80q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v367q0 16-6 30.5T817-337L623-143q-11 11-25.5 17t-30.5 6H200Zm240-280H320q-17 0-28.5-11.5T280-440q0-17 11.5-28.5T320-480h120q17 0 28.5 11.5T480-440q0 17-11.5 28.5T440-400Zm200-160H320q-17 0-28.5-11.5T280-600q0-17 11.5-28.5T320-640h320q17 0 28.5 11.5T680-600q0 17-11.5 28.5T640-560ZM200-200v-560 560Z" />
    </svg>
  ),
  tip: (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
      <path d="M423.5-103.5Q400-127 400-160h160q0 33-23.5 56.5T480-80q-33 0-56.5-23.5ZM360-200q-17 0-28.5-11.5T320-240q0-17 11.5-28.5T360-280h240q17 0 28.5 11.5T640-240q0 17-11.5 28.5T600-200H360Zm-30-120q-69-41-109.5-110T180-580q0-125 87.5-212.5T480-880q125 0 212.5 87.5T780-580q0 81-40.5 150T630-320H330Zm24-80h252q45-32 69.5-79T700-580q0-92-64-156t-156-64q-92 0-156 64t-64 156q0 54 24.5 101t69.5 79Zm126 0Z" />
    </svg>
  ),
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
      <path d="M508.5-291.5Q520-303 520-320v-160q0-17-11.5-28.5T480-520q-17 0-28.5 11.5T440-480v160q0 17 11.5 28.5T480-280q17 0 28.5-11.5Zm0-320Q520-623 520-640t-11.5-28.5Q497-680 480-680t-28.5 11.5Q440-657 440-640t11.5 28.5Q463-600 480-600t28.5-11.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
    </svg>
  ),
  warning: (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
      <path d="M109-120q-11 0-20-5.5T75-140q-5-9-5.5-19.5T75-180l370-640q6-10 15.5-15t19.5-5q10 0 19.5 5t15.5 15l370 640q6 10 5.5 20.5T885-140q-5 9-14 14.5t-20 5.5H109Zm69-80h604L480-720 178-200Zm330.5-51.5Q520-263 520-280t-11.5-28.5Q497-320 480-320t-28.5 11.5Q440-297 440-280t11.5 28.5Q463-240 480-240t28.5-11.5Zm0-120Q520-383 520-400v-120q0-17-11.5-28.5T480-560q-17 0-28.5 11.5T440-520v120q0 17 11.5 28.5T480-360q17 0 28.5-11.5ZM480-460Z" />
    </svg>
  ),
  danger: (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
      <path d="M363-120q-16 0-30.5-6T307-143L143-307q-11-11-17-25.5t-6-30.5v-234q0-16 6-30.5t17-25.5l164-164q11-11 25.5-17t30.5-6h234q16 0 30.5 6t25.5 17l164 164q11 11 17 25.5t6 30.5v234q0 16-6 30.5T817-307L653-143q-11 11-25.5 17t-30.5 6H363Zm1-80h232l164-164v-232L596-760H364L200-596v232l164 164Zm116-224 86 86q11 11 28 11t28-11q11-11 11-28t-11-28l-86-86 86-86q11-11 11-28t-11-28q-11-11-28-11t-28 11l-86 86-86-86q-11-11-28-11t-28 11q-11 11-11 28t11 28l86 86-86 86q-11 11-11 28t11 28q11 11 28 11t28-11l86-86Zm0-56Z" />
    </svg>
  ),
  important: (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
      <path d="M200-200q-17 0-28.5-11.5T160-240q0-17 11.5-28.5T200-280h40v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h40q17 0 28.5 11.5T800-240q0 17-11.5 28.5T760-200H200Zm280-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Zm188.5-171.5Q520-463 520-480v-120q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600v120q0 17 11.5 28.5T480-440q17 0 28.5-11.5ZM480-320q17 0 28.5-11.5T520-360q0-17-11.5-28.5T480-400q-17 0-28.5 11.5T440-360q0 17 11.5 28.5T480-320Z" />
    </svg>
  ),
  caution: (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
      <path d="M508.5-291.5Q520-303 520-320t-11.5-28.5Q497-360 480-360t-28.5 11.5Q440-337 440-320t11.5 28.5Q463-280 480-280t28.5-11.5Zm0-160Q520-463 520-480v-160q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640v160q0 17 11.5 28.5T480-440q17 0 28.5-11.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
    </svg>
  ),
};
