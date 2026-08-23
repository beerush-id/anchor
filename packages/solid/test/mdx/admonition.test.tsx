/** @jsxImportSource solid-js */

import { render } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';
import {
  Admonition,
  CautionBlock,
  DangerBlock,
  ImportantBlock,
  InfoBlock,
  NoteBlock,
  TipBlock,
  WarningBlock,
} from '../../src/mdx/Admonition.js';

describe('Documentation Callouts and Admonitions', () => {
  describe('Accessibility & Semantic Roles', () => {
    it('assigns alert role to hazardous callouts so screen readers announce potential risks', () => {
      const hazardTypes = ['warning', 'danger', 'caution'] as const;

      for (const type of hazardTypes) {
        const { container } = render(() => (
          <Admonition type={type}>
            <p>Risk message</p>
          </Admonition>
        ));
        const el = container.firstElementChild;
        expect(el?.getAttribute('role')).toBe('alert');
      }
    });

    it('assigns note role to informational callouts to avoid interrupting the reader unnecessarily', () => {
      const infoTypes = ['note', 'tip', 'info', 'important', 'interactive'] as const;

      for (const type of infoTypes) {
        const { container } = render(() => (
          <Admonition type={type}>
            <p>Helpful info</p>
          </Admonition>
        ));
        const el = container.firstElementChild;
        expect(el?.getAttribute('role')).toBe('note');
      }
    });

    it('assigns note role by default when type prop is omitted', () => {
      const { container } = render(() => (
        <Admonition>
          <p>Default note</p>
        </Admonition>
      ));
      const el = container.firstElementChild;
      expect(el?.getAttribute('role')).toBe('note');
      expect(el?.className).toContain('air-mdx-admonition-note');
    });

    it('allows authors to explicitly override the semantic role when needed', () => {
      const { container } = render(() => (
        <Admonition type="warning" role="region">
          <p>Overridden role</p>
        </Admonition>
      ));
      const el = container.firstElementChild;
      expect(el?.getAttribute('role')).toBe('region');
    });
  });

  describe('Callout Header & Visual Cues', () => {
    it('renders default category title and visual icon for quick visual scanning', () => {
      const { container } = render(() => (
        <Admonition type="tip">
          <p>Pro tip text</p>
        </Admonition>
      ));

      const title = container.querySelector('.air-mdx-admonition-title');
      const icon = container.querySelector('.air-mdx-admonition-icon');

      expect(title?.textContent).toBe('Tip');
      expect(icon).not.toBeNull();
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });

    it('allows authors to override the callout heading for specific context', () => {
      const { container } = render(() => (
        <Admonition type="warning" title="Breaking Change in v2">
          <p>Migration guide</p>
        </Admonition>
      ));

      const title = container.querySelector('.air-mdx-admonition-title');
      expect(title?.textContent).toBe('Breaking Change in v2');
    });

    it('resolves custom headings from a titles mapping dictionary', () => {
      const { container } = render(() => (
        <Admonition type="caution" titles={{ caution: 'System Prerequisite' }}>
          <p>Prerequisite details</p>
        </Admonition>
      ));

      const title = container.querySelector('.air-mdx-admonition-title');
      expect(title?.textContent).toBe('System Prerequisite');
    });

    it('allows authors to supply a custom icon replacement', () => {
      const customIcon = <span data-testid="custom-bulb">💡</span>;
      const { getByTestId } = render(() => (
        <Admonition type="note" icon={customIcon}>
          <p>Idea note</p>
        </Admonition>
      ));

      expect(getByTestId('custom-bulb')).not.toBeNull();
    });

    it('allows customization of titles through titles dictionary mapping', () => {
      const { container } = render(() => (
        <Admonition type="tip" titles={{ tip: 'Petunjuk Penting' }}>
          <p>Petunjuk</p>
        </Admonition>
      ));
      expect(container.querySelector('.air-mdx-admonition-title')?.textContent).toBe('Petunjuk Penting');
    });

    it('renders interactive admonition with default icon', () => {
      const { container } = render(() => (
        <Admonition type="interactive">
          <p>Try it out</p>
        </Admonition>
      ));
      expect(container.querySelector('.air-mdx-admonition-icon svg')).not.toBeNull();
    });

    it('omits header container when both icon and title are empty', () => {
      const { container } = render(() => (
        <Admonition type={'custom' as never} title="">
          <p>Body only</p>
        </Admonition>
      ));
      expect(container.querySelector('.air-mdx-admonition-header')).toBeNull();
      expect(container.querySelector('.air-mdx-admonition-icon')).toBeNull();
      expect(container.querySelector('.air-mdx-admonition-title')).toBeNull();
    });
  });

  describe('Collapsible & Secondary Details', () => {
    it('renders as native details element when type is details to prevent visual clutter', () => {
      const { container } = render(() => (
        <Admonition type="details">
          <p>Deep dive implementation details</p>
        </Admonition>
      ));

      const details = container.querySelector('details');
      const summary = container.querySelector('summary');

      expect(details).not.toBeNull();
      expect(summary).not.toBeNull();
      expect(summary?.textContent).toContain('Details');
    });

    it('renders as collapsible details when collapsible prop is enabled', () => {
      const { container } = render(() => (
        <Admonition type="note" title="Optional Configuration" collapsible>
          <p>Advanced flags</p>
        </Admonition>
      ));

      const details = container.querySelector('details');
      expect(details).not.toBeNull();
      expect(details?.className).toContain('air-mdx-admonition-note');
    });

    it('renders as collapsible details when collapsible is passed as string true', () => {
      const { container } = render(() => (
        <Admonition type="danger" collapsible="true">
          <p>Collapsible danger notice</p>
        </Admonition>
      ));

      const details = container.querySelector('details');
      expect(details).not.toBeNull();
      expect(details?.getAttribute('role')).toBe('alert');
    });

    it('renders interactive type with Live Demo title', () => {
      const { container } = render(() => (
        <Admonition type="interactive">
          <div>Widget</div>
        </Admonition>
      ));

      const title = container.querySelector('.air-mdx-admonition-title');
      expect(title?.textContent).toBe('Live Demo');
    });

    it('keeps standard div container when collapsible is passed as string false', () => {
      const { container } = render(() => (
        <Admonition type="note" collapsible="false">
          <p>Always visible note</p>
        </Admonition>
      ));

      expect(container.querySelector('details')).toBeNull();
      expect(container.querySelector('div.air-mdx-admonition')).not.toBeNull();
    });

    it('omits summary header in details callout when heading and icon are both falsy', () => {
      const { container } = render(() => (
        <Admonition type="details" title="" icon={false as never}>
          <p>No header details content</p>
        </Admonition>
      ));

      expect(container.querySelector('summary')).toBeNull();
      expect(container.querySelector('.air-mdx-admonition-content')?.textContent).toBe('No header details content');
    });

    it('omits header div in standard callout when heading and icon are both falsy', () => {
      const { container } = render(() => (
        <Admonition type="note" title="" icon={false as never}>
          <p>No header div content</p>
        </Admonition>
      ));

      expect(container.querySelector('.air-mdx-admonition-header')).toBeNull();
      expect(container.querySelector('.air-mdx-admonition-content')?.textContent).toBe('No header div content');
    });

    it('allows custom role on details callout', () => {
      const { container } = render(() => (
        <Admonition type="details" role="region">
          <p>Region details</p>
        </Admonition>
      ));

      expect(container.querySelector('details')?.getAttribute('role')).toBe('region');
    });
  });

  describe('Shorthand Block Components', () => {
    it('renders NoteBlock with note styling and semantics', () => {
      const { container } = render(() => <NoteBlock>General note</NoteBlock>);
      const el = container.firstElementChild;

      expect(el?.className).toContain('air-mdx-admonition-note');
      expect(el?.getAttribute('role')).toBe('note');
      expect(container.querySelector('.air-mdx-admonition-title')?.textContent).toBe('Note');
    });

    it('renders TipBlock with tip styling and semantics', () => {
      const { container } = render(() => <TipBlock>Helpful tip</TipBlock>);
      const el = container.firstElementChild;

      expect(el?.className).toContain('air-mdx-admonition-tip');
      expect(container.querySelector('.air-mdx-admonition-title')?.textContent).toBe('Tip');
    });

    it('renders InfoBlock with info styling and semantics', () => {
      const { container } = render(() => <InfoBlock>Informational text</InfoBlock>);
      const el = container.firstElementChild;

      expect(el?.className).toContain('air-mdx-admonition-info');
      expect(container.querySelector('.air-mdx-admonition-title')?.textContent).toBe('Info');
    });

    it('renders WarningBlock with alert role and warning styling', () => {
      const { container } = render(() => <WarningBlock>Caution ahead</WarningBlock>);
      const el = container.firstElementChild;

      expect(el?.className).toContain('air-mdx-admonition-warning');
      expect(el?.getAttribute('role')).toBe('alert');
      expect(container.querySelector('.air-mdx-admonition-title')?.textContent).toBe('Warning');
    });

    it('renders DangerBlock with alert role and danger styling', () => {
      const { container } = render(() => <DangerBlock>Destructive operation</DangerBlock>);
      const el = container.firstElementChild;

      expect(el?.className).toContain('air-mdx-admonition-danger');
      expect(el?.getAttribute('role')).toBe('alert');
      expect(container.querySelector('.air-mdx-admonition-title')?.textContent).toBe('Danger');
    });

    it('renders ImportantBlock with important styling', () => {
      const { container } = render(() => <ImportantBlock>Key requirement</ImportantBlock>);
      const el = container.firstElementChild;

      expect(el?.className).toContain('air-mdx-admonition-important');
      expect(container.querySelector('.air-mdx-admonition-title')?.textContent).toBe('Important');
    });

    it('renders CautionBlock with alert role and caution styling', () => {
      const { container } = render(() => <CautionBlock>Careful with settings</CautionBlock>);
      const el = container.firstElementChild;

      expect(el?.className).toContain('air-mdx-admonition-caution');
      expect(el?.getAttribute('role')).toBe('alert');
      expect(container.querySelector('.air-mdx-admonition-title')?.textContent).toBe('Caution');
    });
  });

  describe('Content Layout & Attributes', () => {
    it('isolates children inside content wrapper for consistent text flow', () => {
      const { container } = render(() => (
        <Admonition type="info">
          <h4>Custom Subheading</h4>
          <p>Paragraph inside admonition.</p>
        </Admonition>
      ));

      const content = container.querySelector('.air-mdx-admonition-content');
      expect(content?.querySelector('h4')?.textContent).toBe('Custom Subheading');
      expect(content?.querySelector('p')?.textContent).toBe('Paragraph inside admonition.');
    });

    it('forwards custom class names and HTML attributes to root container', () => {
      const { container } = render(() => (
        <Admonition type="note" class="custom-callout" id="anchor-notice" data-custom="value">
          <p>Body</p>
        </Admonition>
      ));

      const el = container.firstElementChild;
      expect(el?.className).toContain('custom-callout');
      expect(el?.id).toBe('anchor-notice');
      expect(el?.getAttribute('data-custom')).toBe('value');
    });

    it('renders collapsible callout without header icon and title when both are omitted', () => {
      const { container } = render(() => (
        <Admonition type={'unknown-custom' as any} collapsible title={null as never} icon={null as never}>
          <p>Collapsible Body</p>
        </Admonition>
      ));

      expect(container.querySelector('details')).not.toBeNull();
      expect(container.querySelector('.air-mdx-admonition-title')).toBeNull();
      expect(container.querySelector('.air-mdx-admonition-icon')).toBeNull();
    });

    it('renders header with heading but with falsy icon', () => {
      const { container } = render(() => (
        <Admonition type="tip" icon={false as never}>
          <p>Tip with no icon</p>
        </Admonition>
      ));
      expect(container.querySelector('.air-mdx-admonition-title')?.textContent).toBe('Tip');
      expect(container.querySelector('.air-mdx-admonition-icon')).toBeNull();
    });

    it('renders header with icon but with empty title', () => {
      const { container } = render(() => (
        <Admonition type="tip" title="">
          <p>Tip with no title</p>
        </Admonition>
      ));
      expect(container.querySelector('.air-mdx-admonition-icon')).not.toBeNull();
      expect(container.querySelector('.air-mdx-admonition-title')).toBeNull();
    });
  });
});
