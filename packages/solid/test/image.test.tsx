/** @jsxImportSource solid-js */

import { render } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';
import '../src/client/index.js';
import { type AirImage, Image } from '../src/image.js';

describe('Image Component (Solid)', () => {
  const mockImage: AirImage = {
    src: '/mock-original.webp',
    width: 1000,
    height: 800,
    alt: 'Mock Image',
    srcset: '/mock-128.webp 128w, /mock-256.webp 256w',
    sizes: {
      128: {
        src: '/mock-128.webp',
        width: 128,
        height: 102,
        alt: 'Mock Image',
      },
      256: {
        src: '/mock-256.webp',
        width: 256,
        height: 204,
        alt: 'Mock Image',
      },
    },
  };

  // Attach the proxy-like behavior for array/number indexing
  mockImage[128] = mockImage.sizes[128];
  mockImage[256] = mockImage.sizes[256];

  it('renders original image properties when no size is provided', () => {
    const { container } = render(() => <Image from={mockImage} />);
    const img = container.querySelector('img');

    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/mock-original.webp');
    expect(img?.getAttribute('width')).toBe('1000');
    expect(img?.getAttribute('height')).toBe('800');
    expect(img?.getAttribute('alt')).toBe('Mock Image');
    expect(img?.getAttribute('srcset')).toBe('/mock-128.webp 128w, /mock-256.webp 256w');
  });

  it('renders specific size properties when size is provided and exists', () => {
    const { container } = render(() => <Image from={mockImage} size={128} />);
    const img = container.querySelector('img');

    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/mock-128.webp');
    expect(img?.getAttribute('width')).toBe('128');
    expect(img?.getAttribute('height')).toBe('102');
    expect(img?.getAttribute('alt')).toBe('Mock Image');
    // Sizes inside the Proxy don't have srcset
    expect(img?.getAttribute('srcset')).toBeNull();
  });

  it('falls back to original properties when requested size does not exist', () => {
    const { container } = render(() => <Image from={mockImage} size={512} />);
    const img = container.querySelector('img');

    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/mock-original.webp');
    expect(img?.getAttribute('width')).toBe('1000');
    // The fallback target is the root mockImage which has srcset
    expect(img?.getAttribute('srcset')).toBe('/mock-128.webp 128w, /mock-256.webp 256w');
  });

  it('allows explicit props to override from properties', () => {
    const { container } = render(() => <Image from={mockImage} size={128} alt="Overridden Alt" class="custom-class" />);
    const img = container.querySelector('img');

    expect(img?.getAttribute('src')).toBe('/mock-128.webp'); // from proxy
    expect(img?.getAttribute('alt')).toBe('Overridden Alt'); // overridden
    expect(img?.getAttribute('class')).toBe('custom-class'); // standard html prop
  });

  it('renders a safe empty image without crashing if from is undefined or empty', () => {
    // Suppress Solid JS warning for missing required prop in test
    const originalError = console.error;
    console.error = () => {};

    const { container } = render(() => <Image from={undefined} class="fallback-img" />);
    const img = container.querySelector('img');

    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBeNull();
    expect(img?.getAttribute('class')).toBe('fallback-img');

    console.error = originalError;
  });
});
