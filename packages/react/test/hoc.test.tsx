import '../src/client/index';
import { classx, getContext, mutable, setContext } from '@anchorlib/core';
import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $inline, render as renderView, setup, snippet, stubScheduler, template } from '../src/hoc.js';
import type { DynamicProps } from '../src/index.js';

stubScheduler();

describe('Anchor React - HOC', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe('setup', () => {
    it('should create a setup component', () => {
      const TestComponent = () => 'Test Component';
      const SetupComponent = setup(TestComponent, 'TestComponent');

      expect(SetupComponent).toBeDefined();
      expect(typeof SetupComponent).toBe('object');
    });

    it('should handle non-function components', () => {
      vi.useFakeTimers();

      const NotAFunction = 'not-a-function' as any;
      const ErrorComponent = setup(NotAFunction, 'ErrorComponent');
      const AnotherError = setup(NotAFunction);

      vi.runAllTimers();

      render(<ErrorComponent />);
      render(<AnotherError />);

      expect(ErrorComponent).toBeDefined();
      expect(AnotherError).toBeDefined();
      expect(AnotherError.displayName).toBe('Error(Anonymous)');

      expect(errSpy).toHaveBeenCalled();
      expect(typeof ErrorComponent).toBe('function');
    });

    it('should preserve displayName', () => {
      const TestComponent = () => 'Test Component';
      TestComponent.displayName = 'CustomDisplayName';
      const SetupComponent = setup(TestComponent);

      expect(SetupComponent.displayName).toBe('Component(CustomDisplayName)');
    });

    it('should render setup component correctly', () => {
      const TestComponent = () => 'Test Component';
      const SetupComponent = setup(TestComponent);

      const { container } = render(<SetupComponent />);
      expect(container.textContent).toBe('Test Component');
    });

    it('should only re-render when props change', () => {
      let renderCount = 0;
      const TestComponent = (props: { value?: string }) => {
        renderCount++;

        return renderView(() => <span>Test Component: {props.value || 'default'}</span>);
      };

      const SetupComponent = setup<{ value?: string }>(TestComponent);

      const { rerender } = render(<SetupComponent value="first" />);
      expect(renderCount).toBe(1);
      expect(screen.getByText('Test Component: first')).toBeDefined();

      // Re-render with same props (should not cause re-render)
      rerender(<SetupComponent value="first" />);
      expect(renderCount).toBe(1);

      // Re-render with different props (should not cause re-render)
      act(() => {
        rerender(<SetupComponent value="second" />);
      });
      expect(renderCount).toBe(1);
      expect(screen.getByText('Test Component: second')).toBeDefined();
    });

    it('should handle errors in component render gracefully', () => {
      const ErrorComponent = setup(() => {
        throw new Error('Render error');
      }, 'ErrorComponent');

      const { container } = render(<ErrorComponent />);

      expect(container.textContent).toContain('[ErrorComponent] failed to render.');
      expect(errSpy).toHaveBeenCalled();
    });
  });

  describe('template/snippet', () => {
    it('should create a template component', () => {
      const TestTemplate = template(() => 'Test Template', 'TestTemplate');

      expect(TestTemplate).toBeDefined();
      expect(typeof TestTemplate).toBe('object');
    });

    it('should handle non-function renderers', () => {
      vi.useFakeTimers();

      const NotAFunction = 'not-a-function' as any;
      const ErrorTemplate = template(NotAFunction, 'ErrorTemplate');
      const AnotherError = template(NotAFunction);
      vi.runAllTimers();

      render(<ErrorTemplate />);

      expect(ErrorTemplate).toBeDefined();
      expect(AnotherError).toBeDefined();
      expect(AnotherError.displayName).toBe('Error(Anonymous)');

      expect(errSpy).toHaveBeenCalled();
      expect(typeof ErrorTemplate).toBe('function');

      vi.useRealTimers();
    });

    it('should preserve displayName', () => {
      const TestTemplate = template(() => 'Test Template');
      TestTemplate.displayName = 'CustomTemplate';

      expect(TestTemplate.displayName).toBe('CustomTemplate');
    });

    it('should render template component correctly', () => {
      const TestTemplate = template(() => 'Test Template');

      const { container } = render(<TestTemplate />);
      expect(container.textContent).toBe('Test Template');
    });

    it('should log error when declaring snippet outside of component', () => {
      vi.useFakeTimers();

      const TestTemplate = snippet(() => 'Test Template');
      const OptSnippet = snippet(() => 'test', 'Test', 'View', false, false, true);

      const { container } = render(<TestTemplate />);
      expect(container.textContent).toBe('Test Template');
      render(<OptSnippet />);

      vi.runAllTimers();

      expect(errSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should re-render when observed state changes', () => {
      let renderCount = 0;
      const count = mutable(0);

      const TestComponent = setup(() => {
        const Template = snippet(() => {
          renderCount++;
          return `Count: ${count.value}`;
        });

        return <Template />;
      });

      const { rerender } = render(<TestComponent />);
      expect(screen.getByText('Count: 0')).toBeDefined();
      expect(renderCount).toBe(1);

      // Change state - should trigger re-render of view only
      act(() => {
        count.value++;
      });

      rerender(<TestComponent />);
      // The setup component should not re-render, but the view should
      expect(renderCount).toBe(2);

      // Should not re-render.
      vi.stubGlobal('window', undefined);
      act(() => {
        count.value++;
      });
      expect(renderCount).toBe(2);
      vi.unstubAllGlobals();
    });

    it('should handle errors in snippet render gracefully', () => {
      const ErrorSnippet = setup(() => {
        const ErrorView = snippet(() => {
          throw new Error('Snippet render error');
        }, 'ErrorView');

        return <ErrorView />;
      }, 'ErrorSnippet');

      const { container } = render(<ErrorSnippet />);

      expect(container.textContent).toContain('[Snippet(ErrorView)] failed to render.');
      expect(errSpy).toHaveBeenCalled();
    });
  });

  describe('Context Logic (Unified Real-World Application Simulation)', () => {
    // All Domain Contexts
    const APP_CTX = Symbol('APP');
    const AUTH_CTX = Symbol('AUTH');
    const ROUTER_CTX = Symbol('ROUTER');
    const FORM_CTX = Symbol('FORM');
    const LIST_CTX = Symbol('LIST');
    const ITEM_CTX = Symbol('ITEM');
    const MENU_CTX = Symbol('MENU_CTX');

    // Domain Models
    interface AppConfig {
      theme: string;
    }
    interface AuthUser {
      id: string;
    }
    interface Route {
      path: string;
    }
    interface FormState {
      id: string;
    }
    interface ListState {
      id: string;
    }
    interface ItemState {
      id: string;
    }
    interface MenuState {
      id: string;
      isOpen: boolean;
    }

    it('should flawlessly maintain context integrity across massive DOM trees combining deep lists, adjacent menus, submenus, and independent async fragment re-renders all at once', () => {
      // 1. Unified Telemetry
      const renders = {
        app: 0,
        auth: 0,
        layout: 0,
        other: 0,
        lists: {} as Record<string, number>,
        items: {} as Record<string, number>,
        forms: {} as Record<string, number>,
        inputs: {} as Record<string, number>,
        menuItems: {} as Record<string, number>,
        menuContents: {} as Record<string, number>,
        menuTriggers: {} as Record<string, number>,
      };

      const refs = {
        items: {} as Record<string, { app: AppConfig; auth: AuthUser; list: ListState; item: ItemState }>,
        inputs: {} as Record<string, { app: AppConfig; route: Route; form: FormState }>,
        menuItems: {} as Record<string, MenuState>,
        menuContents: {} as Record<string, MenuState>,
        menuTriggers: {} as Record<string, MenuState>,
      };

      const triggers = {
        app: mutable(0),
        items: {} as Record<string, { value: number }>,
        inputs: {} as Record<string, { value: number }>,
        forms: {} as Record<string, { value: number }>,
        lists: {} as Record<string, { value: number }>,
        menuItems: {} as Record<string, { value: number }>,
        menuContents: {} as Record<string, { value: number }>,
      };

      const getTrigger = (type: keyof typeof triggers, id: string) => {
        if (!(triggers[type] as any)[id]) (triggers[type] as any)[id] = mutable(0);
        return (triggers[type] as any)[id];
      };

      // --- MENU DOMAIN ---
      const MenuTrigger = setup<{ id: string; expectedMenuId: string }>((props) => {
        // FETCH CONTEXT IN SETUP BODY (Runs once)
        const ctx = getContext<MenuState>(MENU_CTX)!;

        // INLINE SETUP ASSERTION
        expect(ctx).toBeDefined();
        expect(ctx.id).toBe(props.expectedMenuId);

        refs.menuTriggers[props.id] = ctx;

        // REAL BEHAVIOR
        const toggle = () => {
          ctx.isOpen = !ctx.isOpen;
        };

        const View = snippet(() => {
          renders.menuTriggers[props.id] = (renders.menuTriggers[props.id] || 0) + 1;
          return (
            <button data-testid={`trigger-${props.id}`} onClick={toggle}>
              {ctx.isOpen ? 'Close' : 'Open'} {props.id}
            </button>
          );
        });
        return <View />;
      });

      const MenuItem = snippet<{ id: string; expectedMenuId: string }>((props) => {
        renders.menuItems[props.id] = (renders.menuItems[props.id] || 0) + 1;
        getTrigger('menuItems', props.id).value;
        const ctx = getContext<MenuState>(MENU_CTX)!;

        // INLINE ACTIVE RENDER ASSERTION
        expect(ctx).toBeDefined();
        expect(ctx.id).toBe(props.expectedMenuId);

        refs.menuItems[props.id] = ctx;
        return <div data-testid={`menu-item-${props.id}`}>{props.id}</div>;
      });

      const MenuContent = snippet<{ id: string; expectedMenuId: string; children: ReactNode }>((props) => {
        renders.menuContents[props.id] = (renders.menuContents[props.id] || 0) + 1;
        getTrigger('menuContents', props.id).value;
        const ctx = getContext<MenuState>(MENU_CTX)!;

        // INLINE ACTIVE RENDER ASSERTION
        expect(ctx).toBeDefined();
        expect(ctx.id).toBe(props.expectedMenuId);

        refs.menuContents[props.id] = ctx;

        // REAL CONDITIONAL RENDERING BASED ON STATE
        if (!ctx.isOpen) return null;

        return <div data-testid={`menu-content-${props.id}`}>{props.children}</div>;
      });

      const Menu = setup<{ id: string; children: ReactNode }>((props) => {
        const state = mutable<MenuState>({ id: props.id, isOpen: true });
        setContext(MENU_CTX, state);
        const View = snippet(() => <div data-testid={`menu-${props.id}`}>{props.children}</div>);
        return <View />;
      });

      const OtherThing = snippet(() => {
        renders.other++;
        return <div data-testid="other-thing">Other Thing</div>;
      });

      const DeepMenuWidget = snippet(() => (
        <div>
          <Menu id="m1">
            <MenuTrigger id="trig-m1" expectedMenuId="m1" />
            <MenuContent id="cont-m1" expectedMenuId="m1">
              <MenuItem id="item-m1-1" expectedMenuId="m1" />
              <MenuItem id="item-m1-2" expectedMenuId="m1" />
              <Menu id="sub-m1">
                <MenuTrigger id="trig-sub-m1" expectedMenuId="sub-m1" />
                <MenuContent id="cont-sub-m1" expectedMenuId="sub-m1">
                  <MenuItem id="item-sub-m1-1" expectedMenuId="sub-m1" />
                  <MenuItem id="item-sub-m1-2" expectedMenuId="sub-m1" />
                </MenuContent>
              </Menu>
            </MenuContent>
          </Menu>

          <Menu id="m2">
            <MenuTrigger id="trig-m2" expectedMenuId="m2" />
            <MenuContent id="cont-m2" expectedMenuId="m2">
              <MenuItem id="item-m2-1" expectedMenuId="m2" />
              <MenuItem id="item-m2-2" expectedMenuId="m2" />
            </MenuContent>
          </Menu>

          <OtherThing />

          <Menu id="m3">
            <MenuTrigger id="trig-m3" expectedMenuId="m3" />
            <MenuContent id="cont-m3" expectedMenuId="m3">
              <MenuItem id="item-m3-1" expectedMenuId="m3" />
            </MenuContent>
          </Menu>
        </div>
      ));

      // --- ENTERPRISE LIST/FORM DOMAIN ---
      const FormInput = snippet<{ id: string; field: string; expectedFormId: string }>((props) => {
        renders.inputs[props.id] = (renders.inputs[props.id] || 0) + 1;
        getTrigger('inputs', props.id).value;
        refs.inputs[props.id] = {
          app: getContext<AppConfig>(APP_CTX)!,
          route: getContext<Route>(ROUTER_CTX)!,
          form: getContext<FormState>(FORM_CTX)!,
        };

        // INLINE ACTIVE RENDER ASSERTION
        expect(refs.inputs[props.id].app.theme).toBe('system');
        expect(refs.inputs[props.id].route.path).toBe('/unified');
        expect(refs.inputs[props.id].form.id).toBe(props.expectedFormId);

        return <input data-testid={`input-${props.id}`} name={props.field} />;
      });

      const ComplexForm = setup<{ id: string; fields: string[] }>((props) => {
        const formState = mutable<FormState>({ id: props.id });
        setContext(FORM_CTX, formState);
        const View = snippet(() => {
          renders.forms[props.id] = (renders.forms[props.id] || 0) + 1;
          getTrigger('forms', props.id).value;
          return (
            <form data-testid={`form-${props.id}`}>
              {props.fields.map((f, i) => (
                <FormInput key={f} id={`${props.id}-input-${i}`} field={f} expectedFormId={props.id} />
              ))}
            </form>
          );
        });
        return <View />;
      });

      const ListItem = setup<{ id: string; label: string; index: number; expectedListId: string }>((props) => {
        const itemState = mutable<ItemState>({ id: props.id });
        setContext(ITEM_CTX, itemState);
        const View = snippet(() => {
          renders.items[props.id] = (renders.items[props.id] || 0) + 1;
          getTrigger('items', props.id).value;
          refs.items[props.id] = {
            app: getContext<AppConfig>(APP_CTX)!,
            auth: getContext<AuthUser>(AUTH_CTX)!,
            list: getContext<ListState>(LIST_CTX)!,
            item: getContext<ItemState>(ITEM_CTX)!,
          };

          // INLINE ACTIVE RENDER ASSERTION
          expect(refs.items[props.id].app.theme).toBe('system');
          expect(refs.items[props.id].auth.id).toBe('usr_mega');
          expect(refs.items[props.id].list.id).toBe(props.expectedListId);
          expect(refs.items[props.id].item.id).toBe(props.id);

          return (
            <div data-testid={`item-${props.id}`}>
              <span>{itemState.id}</span>
              {props.index % 2 === 0 && <ComplexForm id={`item-form-${props.id}`} fields={['note']} />}
            </div>
          );
        });
        return <View />;
      });

      const DataList = setup<{ id: string; count: number }>((props) => {
        const listState = mutable<ListState>({ id: props.id });
        setContext(LIST_CTX, listState);
        const View = snippet(() => {
          renders.lists[props.id] = (renders.lists[props.id] || 0) + 1;
          getTrigger('lists', props.id).value;
          const items = Array.from({ length: props.count }).map((_, i) => (
            <ListItem key={i} id={`${props.id}-itm-${i}`} label={`Item ${i}`} index={i} expectedListId={props.id} />
          ));
          return <div data-testid={`list-${props.id}`}>{items}</div>;
        });
        return <View />;
      });

      const Layout = snippet(() => {
        renders.layout++;
        return (
          <div data-testid="layout">
            <aside>
              <DataList id="sidebar-nav" count={3} />
            </aside>
            <main>
              {/* Combine both massive architectures right here in the exact same view pass */}
              <DeepMenuWidget />
              <DataList id="main-feed" count={5} />
              <ComplexForm id="checkout" fields={['email', 'card']} />
            </main>
          </div>
        );
      });

      const Router = setup<{ children: ReactNode }>((props) => {
        const route = mutable<Route>({ path: '/unified' });
        setContext(ROUTER_CTX, route);
        const View = snippet(() => props.children);
        return <View />;
      });

      const AuthBoundary = setup<{ children: ReactNode }>((props) => {
        const user = mutable<AuthUser>({ id: 'usr_mega' });
        setContext(AUTH_CTX, user);
        const View = snippet(() => {
          renders.auth++;
          return <Router>{props.children}</Router>;
        });
        return <View />;
      });

      const EnterpriseApp = setup(() => {
        const config = mutable<AppConfig>({ theme: 'system' });
        setContext(APP_CTX, config);
        const View = snippet(() => {
          renders.app++;
          triggers.app.value;
          return (
            <AuthBoundary>
              <Layout />
            </AuthBoundary>
          );
        });
        return <View />;
      });

      render(<EnterpriseApp />);

      // --- INITIAL MOUNT ASSERTIONS (Everything alive simultaneously) ---
      expect(renders.app).toBe(1);
      expect(renders.layout).toBe(1);
      expect(renders.other).toBe(1);

      // Verify Menus fetched their exact parental boundary Context
      expect(refs.menuTriggers['trig-m1'].id).toBe('m1');
      expect(refs.menuContents['cont-sub-m1'].id).toBe('sub-m1');
      expect(refs.menuItems['item-sub-m1-2'].id).toBe('sub-m1');
      expect(refs.menuItems['item-m2-1'].id).toBe('m2');
      expect(refs.menuItems['item-m3-1'].id).toBe('m3');

      // Verify Enterprise parts fetched exact deep references
      const feedItem2 = refs.items['main-feed-itm-2'];
      expect(feedItem2.app.theme).toBe('system');
      expect(feedItem2.auth.id).toBe('usr_mega');
      expect(feedItem2.list.id).toBe('main-feed');
      expect(feedItem2.item.id).toBe('main-feed-itm-2');

      const checkoutInput0 = refs.inputs['checkout-input-0'];
      expect(checkoutInput0.route.path).toBe('/unified');
      expect(checkoutInput0.form.id).toBe('checkout');

      // Cache raw references for strict Object.is checks after massive fragmentation
      const ptrSubM1 = refs.menuContents['cont-sub-m1'];
      const ptrM2 = refs.menuContents['cont-m2'];
      const ptrM3 = refs.menuContents['cont-m3'];
      const PtrApp = feedItem2.app;
      const PtrMainList = feedItem2.list;

      // --- MASSIVE SIMULTANEOUS ASYNC RE-RENDERS ---
      act(() => {
        // Fire disconnected updates across both the Menu system AND the Form/List system at once
        getTrigger('menuContents', 'cont-m1').value++; // m1 content (parent of sub-m1)
        getTrigger('menuItems', 'item-sub-m1-1').value++; // deep sub-m1 item
        getTrigger('menuItems', 'item-m3-1').value++; // isolated m3 item

        getTrigger('items', 'main-feed-itm-2').value++; // list item
        getTrigger('inputs', 'checkout-input-1').value++; // form input
      });

      // Target components successfully re-rendered independently
      expect(renders.menuContents['cont-m1']).toBe(2);
      expect(renders.menuItems['item-sub-m1-1']).toBe(2);
      expect(renders.menuItems['item-m3-1']).toBe(2);
      expect(renders.items['main-feed-itm-2']).toBe(2);
      expect(renders.inputs['checkout-input-1']).toBe(2);

      // Sibling / unrelated branches across the unified tree remained completely static (React bailout preserved)
      expect(renders.menuContents['cont-sub-m1']).toBe(1);
      expect(renders.menuItems['item-m2-1']).toBe(1);
      expect(renders.other).toBe(1);
      expect(renders.items['main-feed-itm-1']).toBe(1);
      expect(renders.inputs['checkout-input-0']).toBe(1);

      // --- FINAL MEMORY INTEGRITY CHECK ---
      // Even in a highly chaotic graph with multiple active context domains,
      // every node must have re-fetched exactly its own uncorrupted memory pointer.
      expect(refs.menuItems['item-sub-m1-1']).toBe(ptrSubM1);
      expect(refs.menuItems['item-m3-1']).toBe(ptrM3);

      const postRenderFeedItem2 = refs.items['main-feed-itm-2'];
      expect(postRenderFeedItem2.app).toBe(PtrApp);
      expect(postRenderFeedItem2.list).toBe(PtrMainList);

      const postRenderCheckout1 = refs.inputs['checkout-input-1'];
      expect(postRenderCheckout1.form.id).toBe('checkout');
      expect(postRenderCheckout1.app).toBe(PtrApp);

      // Cascading global re-render
      act(() => {
        triggers.app.value++;
      });

      expect(renders.app).toBe(2);
      expect(renders.layout).toBe(1); // Memoization bailout

      // Still absolute truth
      expect(refs.menuItems['item-m3-1']).toBe(ptrM3);
      expect(refs.items['main-feed-itm-2'].app).toBe(PtrApp);

      // --- UNMOUNT / REMOUNT DESTRUCTION CYCLE ---
      const prevSubM1RenderCount = renders.menuItems['item-sub-m1-1'];
      const ptrM1 = refs.menuContents['cont-m1'];

      act(() => {
        // CLOSE m1 (Destroys sub-m1 and all its children completely)
        refs.menuTriggers['trig-m1'].isOpen = false;
      });

      act(() => {
        // OPEN m1 (Reconstructs sub-m1 entirely from scratch)
        refs.menuTriggers['trig-m1'].isOpen = true;
      });

      // After remounting, sub-m1 generated a completely new context boundary
      const newPtrSubM1 = refs.menuContents['cont-sub-m1'];

      // 1. Prove the context boundary is a BRAND NEW memory object, not a stale leak
      expect(newPtrSubM1).toBeDefined();
      expect(newPtrSubM1).not.toBe(ptrSubM1);
      expect(newPtrSubM1.id).toBe('sub-m1');

      // 2. Prove deep children fetched this new boundary successfully
      expect(refs.menuItems['item-sub-m1-1']).toBe(newPtrSubM1);
      expect(refs.menuItems['item-sub-m1-2']).toBe(newPtrSubM1);

      // 3. Prove they actually executed a fresh render
      expect(renders.menuItems['item-sub-m1-1']).toBe(prevSubM1RenderCount + 1);

      // 4. Prove outer menu m1 strictly preserved its original absolute pointer (was NOT destroyed)
      expect(refs.menuContents['cont-m1']).toBe(ptrM1);

      // Close it again to complete the cycle
      act(() => {
        refs.menuTriggers['trig-m1'].isOpen = false;
      });
    });
  });

  describe('Dynamic Children', () => {
    it('should render children function via $children', () => {
      const Test = setup<DynamicProps<'div'>>((props) => {
        return <div className={props.className}>{props.$children}</div>;
      });

      const { container } = render(<Test className={classx('test')}>{() => <div>OK</div>}</Test>);
      expect(container.textContent).includes('OK');
      expect(container.querySelector('.test')?.textContent).toBe('OK');
    });

    it('should render ReactNode via $children', () => {
      const Test = setup<DynamicProps<'div'>>((props) => {
        return <div>{props.$children}</div>;
      });

      const { container } = render(
        <Test>
          <div>OK</div>
        </Test>
      );
      expect(container.textContent).includes('OK');
    });
  });

  describe('Integration', () => {
    it('should work with setup and template together', () => {
      const count = mutable(0);

      const TestComponent = setup(() => {
        const Template = snippet(() => (
          <div>
            <span>Count: {count.value}</span>
            <button onClick={() => count.value++}>Increment</button>
          </div>
        ));

        return <Template />;
      }, 'Counter');

      expect(TestComponent).toBeDefined();
      expect(typeof TestComponent).toBe('object');
    });

    it('should render and update correctly with setup and view', () => {
      const count = mutable(0);

      const TestComponent = setup(() => {
        const Template = snippet(() => (
          <div>
            <span data-testid="count">Count: {count.value}</span>
            <button data-testid="increment" onClick={() => count.value++}>
              Increment
            </button>
          </div>
        ));

        return <Template />;
      }, 'Counter');

      render(<TestComponent />);

      // Initial render
      expect(screen.getByText('Count: 0')).toBeDefined();

      // Click button to increment
      const button = screen.getByTestId('increment');
      act(() => {
        button.click();
      });

      // Should update to Count: 1
      expect(screen.getByText('Count: 1')).toBeDefined();
    });

    it('should render with $inline', () => {
      expect($inline(() => <span>Test</span>)).toBeDefined();
      expect(
        $inline(
          () => <span>Test</span>,
          () => ({})
        )
      ).toBeDefined();
      expect($inline((d) => <span>{d.a}</span>, { a: 1 })).toBeDefined();
    });
  });
});
