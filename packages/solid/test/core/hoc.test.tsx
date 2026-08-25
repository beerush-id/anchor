/** @jsxImportSource solid-js */

import { render } from '@solidjs/testing-library';
import type { JSX } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { BindingRef } from '../../src/binding.js';
import { bindable, setup } from '../../src/hoc.js';
import { type BindableComponentProps, classx, getContext, Slot, setContext } from '../../src/index.js';

describe('Anchor Solid - HOC API', () => {
  describe('bindable', () => {
    describe('basic functionality', () => {
      it('should create a bindable component that wraps the original component', () => {
        type TestProps = { name: string; count: number };

        const mockComponent = vi.fn((props: BindableComponentProps<TestProps>) => {
          return { props };
        });

        const BindableComponent = bindable(mockComponent as never);

        const result = BindableComponent({ name: 'test', count: 42 });

        // Verify that the mock component was called with proxied props
        expect(mockComponent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'test',
            count: 42,
          })
        );

        // Check that the result is returned properly
        expect(result).toBeDefined();
      });

      it('should apply proxyProps to the input props', () => {
        type TestProps = { value: number };

        const capturedProps: any[] = [];
        const mockComponent = vi.fn((props: BindableComponentProps<TestProps>) => {
          capturedProps.push(props);
          return { props };
        });

        const BindableComponent = bindable(mockComponent as never);
        const inputProps = { value: 42 };

        BindableComponent(inputProps);

        const proxiedProps = capturedProps[0];

        // Verify that the props are proxied (has $omit and $pick methods)
        expect(typeof proxiedProps.$omit).toBe('function');
        expect(typeof proxiedProps.$pick).toBe('function');
      });
    });

    describe('prop handling', () => {
      it('should handle binding references in props', () => {
        type TestProps = { count: number };

        const capturedProps: any[] = [];
        const mockComponent = vi.fn((props: BindableComponentProps<TestProps>) => {
          capturedProps.push(props);
          return { props };
        });

        const BindableComponent = bindable(mockComponent as never);

        const source = { count: 100 };
        const bindingRef = new BindingRef(source, 'count');
        const propsWithBinding = { count: bindingRef };

        BindableComponent(propsWithBinding);

        const proxiedProps = capturedProps[0];

        // The proxy should resolve the binding value
        expect(proxiedProps.count).toBe(100);
      });

      it('should allow prop mutation through the proxy', () => {
        type TestProps = { count: number };

        const capturedProps: any[] = [];
        const mockComponent = vi.fn((props: BindableComponentProps<TestProps>) => {
          capturedProps.push(props);
          return { props };
        });

        const BindableComponent = bindable(mockComponent as never);

        const source = { count: 10 };
        const bindingRef = new BindingRef(source, 'count');
        const propsWithBinding = { count: bindingRef };

        BindableComponent(propsWithBinding);

        const proxiedProps = capturedProps[0];

        // Set the value through the proxied props
        proxiedProps.count = 20;

        // The source should be updated
        expect(source.count).toBe(20);
      });

      it('should preserve event handler protection', () => {
        type TestProps = { name: string; onClick: () => void };

        const mockComponent = vi.fn((props: BindableComponentProps<TestProps>) => {
          return { props };
        });

        const BindableComponent = bindable(mockComponent as never);
        const onClickHandler = vi.fn();

        BindableComponent({ name: 'test', onClick: onClickHandler });

        const callArgs = mockComponent.mock.calls[0][0];
        const proxiedProps = callArgs;

        // Event handlers should still be protected when set on the proxy
        // This is tested through the proxyProps functionality
        expect(proxiedProps.onClick).toBe(onClickHandler);
      });
    });

    describe('integration with omit and pick', () => {
      it('should work with $omit method on proxied props', () => {
        type TestProps = { name: string; count: number; email: string };

        const capturedProps: any[] = [];
        const mockComponent = vi.fn((props: BindableComponentProps<TestProps>) => {
          capturedProps.push(props);
          return { props };
        });

        const BindableComponent = bindable(mockComponent as never);

        BindableComponent({ name: 'test', count: 42, email: 'test@example.com' });

        const proxiedProps = capturedProps[0];

        // Test $omit functionality
        const omitted = { ...proxiedProps.$omit(['email']) };
        expect(omitted.name).toBe('test');
        expect(omitted.count).toBe(42);
        expect(omitted.email).toBeUndefined();
      });

      it('should work with $pick method on proxied props', () => {
        type TestProps = { name: string; count: number; email: string };

        const capturedProps: any[] = [];
        const mockComponent = vi.fn((props: BindableComponentProps<TestProps>) => {
          capturedProps.push(props);
          return { props };
        });

        const BindableComponent = bindable(mockComponent as never);

        BindableComponent({ name: 'test', count: 42, email: 'test@example.com' });

        const proxiedProps = capturedProps[0];

        // Test $pick functionality
        const picked = { ...proxiedProps.$pick(['name', 'count']) };
        expect(picked.name).toBe('test');
        expect(picked.count).toBe(42);
        expect(picked.email).toBeUndefined();
      });
    });
  });

  describe('setup', () => {
    it('should create component with setup', async () => {
      setContext('name', 'Root');

      const TopComponent = setup<{ children?: JSX.Element }>(function TopComp({ children }) {
        setContext('name', 'TOP');
        expect(getContext('name')).toBe('TOP');

        return <div class="top">{children}</div>;
      });

      const BottomComponent = setup<{ children?: JSX.Element }>((props) => (
        <div class="bottom">
          {props.children}
          <span class="name">{getContext('name')}</span>
        </div>
      ));

      const { unmount } = render(() => (
        <TopComponent>
          <BottomComponent>
            <div>Hello World</div>
          </BottomComponent>
        </TopComponent>
      ));

      expect(getContext('name')).toBe('Root');
      expect(getContext('foo', 'bar')).toBe('bar');

      unmount();
    });

    it('should isolate context between sibling and nested setup components', async () => {
      const Tab = setup<{ name: string; children?: JSX.Element; className?: string }>(function TabComp(props) {
        setContext('tab', props.name);
        return <div class={props.className}>{props.children}</div>;
      });

      const Child = setup<{ id: string }>(function ChildComp(props) {
        return <span data-testid={props.id}>{getContext('tab')}</span>;
      });

      const { unmount, getByTestId, container } = render(() => (
        <div>
          <Tab name="A" className={classx('tab')}>
            <Child id="a-child" />
            <Tab name="A-nested">
              <Child id="a-nested-child" />
            </Tab>
            <Child id="a-after" />
          </Tab>
          <Tab name="B">
            <Child id="b-child" />
          </Tab>
        </div>
      ));

      expect(container.querySelector('.tab')?.textContent).includes('A');
      expect(getByTestId('a-child').textContent).toBe('A');
      expect(getByTestId('a-after').textContent).toBe('A');
      expect(getByTestId('a-nested-child').textContent).toBe('A-nested');
      expect(getByTestId('b-child').textContent).toBe('B');

      unmount();
    });

    it('should correctly detect render prop children via typeof in component body', async () => {
      const Wrapper = setup<{ children?: JSX.Element | ((value: string) => JSX.Element) }>(function WrapperComp(props) {
        const isRenderProp = typeof props.children === 'function';

        return (
          <div>
            <span data-testid="type">{isRenderProp ? 'function' : 'element'}</span>
            <div data-testid="content">
              {isRenderProp ? (props.children as (v: string) => JSX.Element)('hello') : props.children}
            </div>
          </div>
        );
      });

      // Regular JSX children — typeof should be 'element'
      const regular = render(() => (
        <Wrapper>
          <span>static child</span>
        </Wrapper>
      ));

      expect(regular.getByTestId('type').textContent).toBe('element');
      expect(regular.getByTestId('content').textContent).toBe('static child');
      regular.unmount();

      // Render prop children — typeof should be 'function'
      const renderProp = render(() => <Wrapper>{(value: string) => <span>got: {value}</span>}</Wrapper>);

      expect(renderProp.getByTestId('type').textContent).toBe('function');
      expect(renderProp.getByTestId('content').textContent).toBe('got: hello');
      renderProp.unmount();
    });

    it('falls back to Anonymous when component has no name or displayName', () => {
      const fn = () => <div>Anonymous</div>;
      Object.defineProperty(fn, 'name', { value: '' });
      const AnonymousComp = setup(fn);
      const { getByText } = render(() => <AnonymousComp />);
      expect(getByText('Anonymous')).toBeDefined();
    });

    it('handles execution outside reactive owner when self is null', () => {
      const Comp = setup(() => <div>Direct</div>);
      const res = Comp({});
      expect(res).toBeDefined();
    });

    it('handles slotted components with snippets', () => {
      type SlottedProps = { children?: JSX.Element };
      type Slots = { header?: () => JSX.Element; footer?: () => JSX.Element };

      const Card = setup<SlottedProps, Slots>((props, snippets) => {
        return (
          <div>
            <div data-testid="header">
              <Slot for={snippets.header?.()}>
                <span>Default Header</span>
              </Slot>
            </div>
            <div data-testid="body">{props.children}</div>
            <div data-testid="footer">
              <Slot for={snippets.footer?.()}>
                <span>Default Footer</span>
              </Slot>
            </div>
          </div>
        );
      });

      const { getByTestId, unmount } = render(() => (
        <Card>
          <Card.Snippet for={'header'}>{() => <span>Custom Header</span>}</Card.Snippet>
          <span>Body Content</span>
        </Card>
      ));

      expect(getByTestId('header').textContent).toBe('Custom Header');
      expect(getByTestId('body').textContent).toBe('Body Content');
      expect(getByTestId('footer').textContent).toBe('Default Footer');
      unmount();
    });

    it('handles snippet with function children and edge cases', () => {
      type SlottedProps = { children?: JSX.Element | (() => JSX.Element) };
      type Slots = { custom?: () => JSX.Element };

      const Slotted = setup<SlottedProps, Slots>((props, snippets) => {
        return (
          <div>
            <Slot for={snippets.custom?.()}>
              <span>none</span>
            </Slot>
            {typeof props.children === 'function' ? (props.children as () => JSX.Element)() : props.children}
          </div>
        );
      });

      // Snippet without for or non-function children
      const { container, unmount } = render(() => (
        <Slotted>
          {() => (
            <>
              <Slotted.Snippet for={undefined as never}>{() => <span>No For</span>}</Slotted.Snippet>
              <Slotted.Snippet for={'custom'}>{'Not a function' as never}</Slotted.Snippet>
              <span>Fallback Children</span>
            </>
          )}
        </Slotted>
      ));

      expect(container.textContent).toContain('none');
      expect(container.textContent).toContain('Fallback Children');
      unmount();
    });
  });
});
