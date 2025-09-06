import { anchor, shortId } from '@anchor/core';

export const TOOL_ICON_SIZE = 16;

export type NodeStyle = {
  [K in keyof CSSStyleDeclaration]?: string | number;
};

export type StyleRec = Record<string, string | number>;
export type StyleVariant = {
  style: StyleRec;
  selector: string;
};

export type CssNode = {
  id: string;
  type: 'general' | 'input' | 'select';
  label?: string;
  style: StyleRec;
  selector: string;
  stateStyles: StyleVariant[];
  children?: CssNode[];
};

export type Editor = {
  current: CssNode;
  rootStyle: NodeStyle;
  currentStyle: NodeStyle;
  currentCssContent: string;
  nodes: CssNode[];
  viewMode: 'canvas' | 'code' | 'json';
  css: () => string;
  json: () => string;
};

export function createInitVariants(type: CssNode['type']) {
  const variants = [
    {
      style: {},
      selector: ':focus',
    },
    {
      style: {},
      selector: ':focus-visible',
    },
    {
      style: {},
      selector: ':focus-within',
    },
    {
      style: {},
      selector: ':hover',
    },
    {
      style: {},
      selector: ':active',
    },
    {
      style: {},
      selector: ':disabled',
    },
  ];

  if (type === 'input') {
    variants.push({
      style: {},
      selector: '::placeholder',
    });

    return variants.filter((variant) => variant.selector !== ':active');
  }

  return variants;
}

export function createNode(
  type: CssNode['type'],
  selector: string,
  label?: string,
  init?: StyleRec,
  initVariants = true
) {
  return {
    id: shortId(),
    type,
    label,
    selector,
    style: init ?? {},
    stateStyles: initVariants ? createInitVariants(type) : [],
    children: [],
  } as CssNode;
}

const initNodes: CssNode[] = [
  {
    id: shortId(),
    type: 'general',
    label: 'Main',
    selector: '.main',
    style: {
      color: '#f4f4f4',
      fontSize: 14,
      margin: 0,
      padding: 0,
    },
    stateStyles: [],
  },
  {
    id: shortId(),
    type: 'general',
    label: 'Button',
    selector: '.button',
    style: {
      color: '#000000',
      display: 'inline-flex',
      alignItems: 'center',
      height: 40,
      backgroundColor: '#cf942a',
      fontWeight: '500',
      paddingBlock: 8,
      paddingInline: 16,
      borderRadius: 5,
    },
    stateStyles: [
      {
        style: {},
        selector: ':focus',
      },
      {
        style: {},
        selector: ':focus-visible',
      },
      {
        style: {},
        selector: ':focus-within',
      },
      {
        style: {
          backgroundColor: '#e6ad40',
        },
        selector: ':hover',
      },
      {
        style: {
          backgroundColor: '#bc8419',
        },
        selector: ':active',
      },
      {
        style: {},
        selector: ':disabled',
      },
    ],
  },
  createNode('general', '.link', 'Link'),
  createNode('general', '.label', 'Label'),
  createNode('general', '.heading-1', 'Heading'),
  createNode('general', '.heading-2', 'Sub Heading'),
  createNode('general', '.heading-3', 'Subtitle'),
  createNode('input', '.input', 'Input'),
  createNode('select', '.select', 'Select'),
];

export const editorApp = anchor.immutable({
  current: initNodes[1],
  rootStyle: initNodes[0].style,
  currentStyle: initNodes[1].style,
  currentCssContent: '',
  nodes: initNodes,
  viewMode: 'canvas',
  css: () => parseAllCss(),
  json: () => JSON.stringify(anchor.read(editorApp.nodes), null, 2),
} as Editor);

export const editorWriter = anchor.writable(editorApp, ['currentStyle', 'current', 'currentCssContent']);

export function parseAllCss() {
  const contents: string[] = [];

  for (const node of anchor.read(editorApp.nodes)) {
    const content = parseCss(node as CssNode);
    if (content) {
      contents.push(content);
    }
  }

  return contents.join('\n\n');
}

export function parseCss(node: CssNode) {
  if (anchor.has(node)) node = anchor.read(node) as CssNode;
  if (!Object.keys(node?.style ?? {}).length) return '';

  const contents = [styleToCss(node.selector, node.style)];

  for (const variant of node.stateStyles) {
    if (Object.keys(variant.style).length) {
      contents.push(styleToCss(`${node.selector}${variant.selector}`, variant.style));
    }
  }

  return contents.join('\n');
}

export function styleToCss(selector: string, style: StyleRec) {
  const contents: string[] = [`${selector} {`];

  for (const [key, value] of Object.entries(style)) {
    if (typeof value === 'undefined' || value === null) continue;
    contents.push(`  ${toDashed(key)}: ${typeof value === 'number' ? `${value}px` : value};`);
  }

  contents.push('}');

  return contents.join('\n');
}

export function stylize(elem: HTMLElement, style: StyleRec): StyleRec {
  const declarations: StyleRec = {};

  for (const [key, value] of Object.entries(style)) {
    if (typeof value === 'undefined' || value === null) continue;
    if (typeof value === 'number' && !isNaN(value)) {
      declarations[key] = `${value}px`;
    } else {
      declarations[key] = value;
    }
  }

  elem.setAttribute('style', '');
  Object.assign(elem.style, declarations);

  return declarations;
}

function toDashed(str: string) {
  return str.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`);
}
