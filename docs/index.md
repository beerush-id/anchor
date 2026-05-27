---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

title: 'AIR Stack - AI-Native, Full-Stack TypeScript Architecture'
description: 'AI-Native, Full-Stack TypeScript Architecture. Unify fine-grained reactivity, isomorphic RPC, state management, routing, reactive workflows, and universal SSR into one cohesive, zero-boilerplate system.'
keywords:
  - AIR Stack
  - Full-Stack TypeScript Framework
  - Next.js Alternative
  - tRPC Alternative
  - React State Management
  - Fine-Grained Reactivity
  - Isomorphic RPC
  - Server-Side Rendering
  - AI-Native Framework
  - SolidJS
  - Type-Safe Routing
  - Reactive Workflows

hero:
  name: 'AIR Stack'
  text: 'Zero-Boilerplate, AI-Native'
  tagline: 'Full-Stack TypeScript Architecture — Fine-grained Reactivity, Isomorphic RPC, Reactive Workflows, Reactive Routing, and Universal SSR unified into one cohesive system.'
  image: /airstack-hero.png

  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Overview
      link: /overview

features:
  - icon: 
      src: '/activity.svg'
      alt: 'Reactive State Icon'
    title: Reactive State
    details: Direct mutation with fine-grained reactivity. Schema validation, immutability contracts, and computed properties — built in.
    link: /state-management
    linkText: Learn more
  - icon: 
      src: '/function.svg'
      alt: 'Reactive, Isomorphic RPC Icon'
    title: Reactive, Isomorphic RPC
    details: Declare a function, implement it, call it. IRPC abstracts HTTP, WebSocket, and BroadcastChannel into a single function call.
    link: /remote-function
    linkText: Learn more
  - icon: 
      src: '/workflow.svg'
      alt: 'Reactive Workflows Icon'
    title: Reactive Workflows
    details: Orchestrate type-safe, reactive execution pipelines with schema validation, branching, and error recovery.
    link: /workflow
    linkText: Learn more
  - icon: 
      src: '/route.svg'
      alt: 'Reactive Routing Icon'
    title: Reactive Routing
    details: Guards and data providers execute before the view renders. Route state re-evaluates when its dependencies change.
    link: /routing
    linkText: Learn more
  - icon: 
      src: '/ssr.svg'
      alt: 'Universal SSR Icon'
    title: Universal SSR
    details: One render function deploys to Bun, Node.js, Cloudflare Workers, and Deno. Request isolation handles concurrency natively.
    link: /ui
    linkText: Learn more
  - icon: 
      src: '/brain.svg'
      alt: 'AI-Native Icon'
    title: AI-Native
    details: Token saving and high accuracy by design. Pure JavaScript mechanics mean zero context bloat, zero hallucinated hooks, and instant right-first-time generation.
    link: /overview
    linkText: Learn more
---

<style>
.custom-section {
  display: flex;
  flex-wrap: wrap;
  gap: 3rem;
  align-items: center;
  max-width: 1152px;
  margin: 6rem auto;
  padding: 0 24px;
}
.custom-section-content {
  flex: 1;
  min-width: 300px;
}
.custom-section-content h2 {
  border: none;
  margin-top: 0;
  font-size: 2rem;
  letter-spacing: -0.02em;
}
.custom-section-content p {
  color: var(--vp-c-text-2);
  line-height: 1.6;
  font-size: 1.1rem;
  margin: 1.5rem 0;
}
.custom-section-action {
  display: inline-block;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: color 0.25s;
}
.custom-section-action:hover {
  color: var(--vp-c-brand-2);
}
.custom-section-code {
  flex: 1;
  min-width: 300px;
  width: 100%;
}
.comparison-section [class*="language-"] {
  max-height: 660px;
  overflow-y: auto;
}
</style>

<!-- SECTION 0: COMPARISON (Full Width) -->
<div class="custom-section comparison-section" style="display: block; max-width: 960px; margin: 4rem auto;">
  <div style="text-align: center; margin-bottom: 2.5rem;">
    <h2 style="border: none; font-size: 2rem; letter-spacing: -0.02em; margin-bottom: 1.5rem;">Stop Fighting JavaScript</h2>
    <p style="color: var(--vp-c-text-2); line-height: 1.6; font-size: 1.1rem; max-width: 800px; margin: 0 auto;">JavaScript is not bad, it just needs a little touch. So, let's stop fighting it and give it more power. Let JavaScript handle what it's good at, and let the rendering engine handle what it's good at. Let's take a look at how that applies.</p>
  </div>

::: code-group

```tsx [AIR - React] {13,17}
// 1. Compose the pipeline once with branching and error recovery.
const checkout = plan()
  .then(calculateTotal, { name: 'Calculating...' })
  .switch('method', {
    card: (resolve) => resolve(chargeCard, { name: 'Charging Card...' }),
    paypal: (resolve) => resolve(chargePaypal, { name: 'Charging PayPal...' })
  })
  .then(generateReceipt, { name: 'Generating Receipt...' })
  .catch((err) => ({ error: 'Checkout Failed' }));

export const Checkout = setup((props: { cartId: string, method: string }) => {
  // 2. Create a deferred task to track manual execution
  const task = checkout.later();

  return render(() => (
    <button 
      onClick={() => task.dispatch(props)}
      disabled={task.status === 'pending'}
    >
      <Show when={() => task.status === 'idle'}>Checkout</Show>
      <Show when={() => task.status === 'pending'}>{() => task.current?.name}</Show>                       {/* [!code ++]*/}
      <Show when={() => task.status === 'success'}>Success!</Show>
      <Show when={() => task.status === 'error'}>{() => task.error?.message}</Show>
    </button>
  ));
});
```

```tsx [AIR - Solid] {13,17}
// 1. Compose the pipeline once with branching and error recovery.
const checkout = plan()
  .then(calculateTotal, { name: 'Calculating...' })
  .switch('method', {
    card: (resolve) => resolve(chargeCard, { name: 'Charging Card...' }),
    paypal: (resolve) => resolve(chargePaypal, { name: 'Charging PayPal...' })
  })
  .then(generateReceipt, { name: 'Generating Receipt...' })
  .catch((err) => ({ error: 'Checkout Failed' }));

export const Checkout = setup((props: { cartId: string, method: string }) => {
  // 2. Create a deferred task to track manual execution
  const task = checkout.later();

  return () => (
    <button 
      onClick={() => task.dispatch(props)}
      disabled={task.status === 'pending'}
    >
      <Show when={task.status === 'idle'}>Checkout</Show>
      <Show when={task.status === 'pending'}>{task.current?.name}</Show>                                        {/* [!code ++]*/}
      <Show when={task.status === 'success'}>Success!</Show>
      <Show when={task.status === 'error'}>{task.error?.message}</Show>
    </button>
  );
});
```

```svelte [AIR - Svelte] {15,19}
<script lang="ts">
  // 1. Compose the pipeline once with branching and error recovery.
  const checkout = plan()
    .then(calculateTotal, { name: 'Calculating...' })
    .switch('method', {
      card: (resolve) => resolve(chargeCard, { name: 'Charging Card...' }),
      paypal: (resolve) => resolve(chargePaypal, { name: 'Charging PayPal...' })
    })
    .then(generateReceipt, { name: 'Generating Receipt...' })
    .catch((err) => ({ error: 'Checkout Failed' }));

  let { cartId, method }: { cartId: string, method: string } = $props();

  // 2. Create a deferred task to track manual execution
  const task = checkout.later();
</script>

<button 
  onclick={() => task.dispatch({ cartId, method })}
  disabled={task.status === 'pending'}
>
  {#if task.status === 'idle'}Checkout{/if}
  {#if task.status === 'pending'}{task.current?.name}{/if} <!-- [!code ++] -->
  {#if task.status === 'success'}Success!{/if}
  {#if task.status === 'error'}{task.error?.message}{/if}
</button>
```

```tsx [Standard React] {3-4,31,34}
// Manual state tracking, try/catch pollution, and imperative branching.
export function Checkout({ cartId, method }: { cartId: string, method: string }) {
  const [status, setStatus] = useState('Checkout');
  const [errorMsg, setErrorMsg] = useState('');
  
  const handleCheckout = async () => {
    try {
      setErrorMsg('');
      setStatus('Calculating...');
      const total = await calculateTotal(cartId);
      
      let payment;
      if (method === 'card') {
        setStatus('Charging Card...');
        payment = await chargeCard(total);
      } else {
        setStatus('Charging PayPal...');
        payment = await chargePaypal(total);
      }

      setStatus('Generating Receipt...');
      await generateReceipt(payment);
      
      setStatus('Success!');
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e.message || 'Checkout Failed');
    }
  };

  const isPending = status !== 'Checkout' && status !== 'Success!' && status !== 'error';

  return (
    <button onClick={handleCheckout} disabled={isPending}>
      {status === 'error' ? errorMsg : status}
    </button>
  );
}
```

```tsx [Redux Toolkit] {28-30,32,35}
// Massive boilerplate just to dispatch state updates during a branching workflow.
export const checkout = createAsyncThunk('checkout', async ({ cartId, method }, { dispatch }) => {
  try {
    dispatch(clearError());
    dispatch(setStatus('Calculating...'));
    const total = await calculateTotal(cartId);
    
    let payment;
    if (method === 'card') {
      dispatch(setStatus('Charging Card...'));
      payment = await chargeCard(total);
    } else {
      dispatch(setStatus('Charging PayPal...'));
      payment = await chargePaypal(total);
    }

    dispatch(setStatus('Generating Receipt...'));
    await generateReceipt(payment);
    
    dispatch(setStatus('Success!'));
  } catch (e: any) {
    dispatch(setStatus('error'));
    dispatch(setErrorMsg(e.message || 'Checkout Failed'));
  }
});

export function Checkout({ cartId, method }: { cartId: string, method: string }) {
  const dispatch = useDispatch();
  const status = useSelector((state) => state.checkout.status);
  const errorMsg = useSelector((state) => state.checkout.errorMsg);
  
  const isPending = status !== undefined && status !== 'Success!' && status !== 'error';
  
  return (
    <button onClick={() => dispatch(checkout({ cartId, method }))} disabled={isPending}>
      {status === 'error' ? errorMsg : status || 'Checkout'}
    </button>
  );
}
```

```tsx [TanStack Query] {38,42-46,59}
// Fragmented mutations chained together via effects, callbacks, and manual state.
export function Checkout({ cartId, method }: { cartId: string, method: string }) {
  const [step, setStep] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleError = (e: any) => {
    setStep('error');
    setErrorMsg(e.message || 'Checkout Failed');
  };

  const calculate = useMutation({
    mutationFn: calculateTotal,
    onSuccess: () => setStep(method === 'card' ? 'chargeCard' : 'chargePaypal'),
    onError: handleError
  });

  const card = useMutation({
    mutationFn: chargeCard,
    onSuccess: () => setStep('receipt'),
    onError: handleError
  });

  const paypal = useMutation({
    mutationFn: chargePaypal,
    onSuccess: () => setStep('receipt'),
    onError: handleError
  });

  const receipt = useMutation({
    mutationFn: generateReceipt,
    onSuccess: () => setStep('success'),
    onError: handleError
  });

  const handleCheckout = () => {
    setErrorMsg('');
    setStep('calculating');
    calculate.mutate(cartId);
  };

  // State dependencies must be passed manually between fragmented mutations
  useEffect(() => {
    if (step === 'chargeCard') card.mutate(calculate.data);
    if (step === 'chargePaypal') paypal.mutate(calculate.data);
    if (step === 'receipt') receipt.mutate(card.data || paypal.data);
  }, [step]);

  const status = 
    step === 'calculating' ? 'Calculating...' :
    step === 'chargeCard' ? 'Charging Card...' :
    step === 'chargePaypal' ? 'Charging PayPal...' :
    step === 'receipt' ? 'Generating Receipt...' :
    step === 'success' ? 'Success!' :
    step === 'error' ? errorMsg : 'Checkout';

  const isPending = step !== 'idle' && step !== 'success' && step !== 'error';

  return (
    <button onClick={handleCheckout} disabled={isPending}>
      {status}
    </button>
  );
}
```

:::

  <div style="margin-top: 2rem; padding: 1.25rem 1.5rem; background-color: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-brand-soft); border-radius: 12px; font-size: 0.95rem; line-height: 1.6; text-align: left; max-width: 800px; margin-left: auto; margin-right: auto;">
    <span style="color: var(--vp-c-text-2);">When you click the button, the component <strong>never re-renders</strong>. The workflow executes outside the UI loop—handling <strong>IRPC batching</strong>, <strong>request coalescing</strong>, and <strong>network caching</strong>—while <strong>fine-grained proxies</strong> isolate DOM updates to specific text nodes.</span>
  </div>

  <div style="text-align: center; margin-top: 2.5rem;">
    <a href="/getting-started" style="display: inline-block; background-color: var(--vp-c-brand-1); color: #ffffff; padding: 12px 28px; border-radius: 24px; font-weight: 600; text-decoration: none; transition: opacity 0.25s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
      Get Started with AIR Stack →
    </a>
  </div>
</div>

<!-- SECTION 1: TEST COVERAGE (Text Left, Image Right) -->
<div class="custom-section">
  <div class="custom-section-content">
    <h2>Battle-Tested, 100% Test Coverage</h2>
    <p>Trust your foundation. AIR Stack is built with uncompromising quality standards, achieving <strong>100% test coverage</strong> across its core packages. Every state mutation, reactive update, workflow branch, and IRPC transport is rigorously tested to ensure <strong>absolute reliability</strong> for your production applications.</p>
  </div>
  <div class="custom-section-code" style="display: flex; justify-content: center; align-items: center;">
    <img src="/test-coverage.webp" alt="100% Test Coverage" style="max-width: 100%; height: auto; border-radius: 12px; border: 1px solid var(--vp-c-divider); box-shadow: var(--vp-shadow-3);" />
  </div>
</div>

<!-- SECTION 2: AI-NATIVE (Full Width Quote) -->
<div class="custom-section" style="display: block; max-width: 900px; margin: 5rem auto;">
  <div style="background-color: var(--vp-c-bg-soft); padding: 2.5rem 3rem; border-radius: 16px; border: 1px solid var(--vp-c-brand-soft);">
    <h2 style="border: none; margin-top: 0; margin-bottom: 1.5rem; font-size: 1.8rem;">AI-Native by Design</h2>
    <p style="font-size: 1.15rem; line-height: 1.7; color: var(--vp-c-text-1);"><em>"Speaking as an AI, standard UI frameworks are a nightmare to generate. I <strong>waste your tokens</strong> tracking <strong>dependency arrays</strong> and hallucinate trying to write deeply nested <strong>spread mutations</strong>. AIR Stack's pure JavaScript architecture guarantees <strong>massive token saving</strong> and <strong>high accuracy</strong>. I just write the logic, mutate the object, and get it right on the first try."</em></p>
    <p style="text-align: right; margin-top: 1.5rem; font-size: 1.05rem; color: var(--vp-c-brand-1);">— <strong>Antigravity</strong>, AI Coding Assistant</p>
  </div>
</div>

<!-- SECTION 2: IRPC (Code Left, Text Right) -->
<div class="custom-section">
  <div class="custom-section-code">

::: code-group

```ts [Declare]
// 1. Declare the stream signature
export const watchPrice = irpc.declare<(ticker: string) => number>({ 
  name: 'watchPrice' 
});

// 2. Construct the stream implementation
irpc.construct(watchPrice, (ticker) => stream((state) => {
  const sub = redis.subscribe(`price:${ticker}`, (price) => {
    state.data = Number(price);
  });
  
  return () => sub.unsubscribe();
}));
```

```tsx [React]
export const PriceCard = setup((props: { ticker: string }) => {
  // Types sync between server and client.
  const price = watchPrice.with(() => [props.ticker]);

  return render(() => (
    <div className="price-card">
      <span className="ticker">{props.ticker}</span>
      <span className="value">
        {price.status === 'pending' ? 'Connecting...' : `$${price.data?.toFixed(2)}`}
      </span>
    </div>
  ));
});
```

```tsx [Solid]
export const PriceCard = setup((props: { ticker: string }) => {
  // Types sync between server and client.
  const price = watchPrice.with(() => [props.ticker]);

  return () => (
    <div class="price-card">
      <span class="ticker">{props.ticker}</span>
      <span class="value">
        {price.status === 'pending' ? 'Connecting...' : `$${price.data?.toFixed(2)}`}
      </span>
    </div>
  );
});
```

```svelte [Svelte]
<script lang="ts">
  let { ticker }: { ticker: string } = $props();

  // Types sync between server and client.
  const price = watchPrice.with(() => [ticker]);
</script>

<div class="price-card">
  <span class="ticker">{ticker}</span>
  <span class="value">
    {price.status === 'pending' ? 'Connecting...' : `$${price.data?.toFixed(2)}`}
  </span>
</div>
```

:::

  </div>
  <div class="custom-section-content">
    <h2>IRPC: Isomorphic Reactive Network Abstraction</h2>
    <p>What if <strong>streaming data</strong> was just <strong>calling a function</strong>? IRPC abstracts HTTP, WebSocket, and BroadcastChannel into a <strong>single type-safe function call</strong>. No manual fetch wrappers, caching layers, or synchronization boilerplate.</p>
    <a href="/remote-function" class="custom-section-action">Explore IRPC →</a>
  </div>
</div>

<!-- SECTION 3: STATE (Text Left, Code Right) -->
<div class="custom-section">
  <div class="custom-section-content">
    <h2>Fine-Grained Reactive State Engine</h2>
    <p><strong>Stop</strong> wiring together <strong>query caches</strong>, <strong>global stores</strong>, and <strong>form libraries</strong>. Whether it's a live data stream, a global user session, or a complex form, it's just <strong>reactive state</strong>. One field changes, one fragment updates. Everything else stays still.</p>
    <a href="/state-management" class="custom-section-action">Learn more about State →</a>
  </div>
  <div class="custom-section-code">

::: code-group

```tsx [React]
export const LoginForm = setup(() => {
  // 1. Built-in form state and validation
  const [state, errors] = form(LoginSchema, { email: '' });

  // 2. Fine-grained updates. No massive re-renders.
  return render(() => (
    <form>
      <TextInput value={$bind(state, 'email')} />
      <span className="error">{errors.email?.message}</span>
    </form>
  ));
});
```

```tsx [Solid]
export const LoginForm = setup(() => {
  // 1. Built-in form state and validation
  const [state, errors] = form(LoginSchema, { email: '' });

  // 2. Fine-grained updates. No massive re-renders.
  return () => (
    <form>
      <TextInput value={$bind(state, 'email')} />
      <span class="error">{errors.email?.message}</span>
    </form>
  );
});
```

```svelte [Svelte]
<script lang="ts">
  // 1. Built-in form state and validation
  const [state, errors] = form(LoginSchema, { email: '' });
  
</script>


<!-- 2. Fine-grained updates. No massive re-renders. -->
<form>
  <TextInput bind:value={state.email} />
  <span class="error">{errors.email?.message}</span>
</form>
```

:::

  </div>
</div>

<!-- SECTION 4: ROUTER (Code Left, Text Right) -->
<div class="custom-section">
  <div class="custom-section-code">

::: code-group

```tsx [React]
export const userRoute = usersRoute.route('/:user_id')
  .guard(() => {
    if (!auth.isAuthenticated) throw redirect(loginRoute);
  })
  .provide('profile', async ({ params }) => {
    return await getUser(params.user_id);
  })
  .render((state) => (
    <div className="profile-view">
      <h1>{state.data?.profile.name}</h1>
      <span>{state.data?.profile.email}</span>
    </div>
  ));
```

```tsx [Solid]
export const userRoute = usersRoute.route('/:user_id')
  .guard(() => {
    if (!auth.isAuthenticated) throw redirect(loginRoute);
  })
  .provide('profile', async ({ params }) => {
    return await getUser(params.user_id);
  })
  .render((state) => (
    <div class="profile-view">
      <h1>{state.data?.profile.name}</h1>
      <span>{state.data?.profile.email}</span>
    </div>
  ));
```

:::

  </div>
  <div class="custom-section-content">
    <h2>Router: Reactive Routing Engine</h2>
    <p>What if the <strong>route reacts to the state</strong>, not just the URL? <strong>Guards</strong> and <strong>data providers</strong> execute <em>before</em> the view renders, and route state <strong>automatically re-evaluates</strong> when its reactive dependencies change. No more imperative redirects or scattered guard logic.</p>
    <a href="/routing" class="custom-section-action">Explore Router →</a>
  </div>
</div>

<!-- SECTION 5: WORKFLOWS (Text Left, Code Right) -->
<div class="custom-section">
  <div class="custom-section-content">
    <h2>Workflows: Type-Safe Reactive Orchestration</h2>
    <p>Create <strong>reactive workflows</strong> without massive try/catch blocks. Orchestrate <strong>complex</strong>, <strong>multi-step</strong> asynchronous operations anywhere JavaScript runs with <strong>built-in schema validation</strong>, <strong>branching logic</strong>, and <strong>error recovery</strong>.</p>
    <a href="/workflow" class="custom-section-action">Explore Workflows →</a>
  </div>
  <div class="custom-section-code">

```typescript
// 1. Define a type-safe pipeline with isolated branching
export const checkout = plan({
  input: z.object({ cartId: z.string(), method: z.enum(['card', 'paypal']) })
})
  .then(calculateTotal)
  .switch('method', {
    card: (resolve) => resolve(chargeCard),
    paypal: (resolve) => resolve(chargePaypal)
  })
  .then(generateReceipt);

// 2. Execute the pipeline like a standard async function
const receipt = await checkout({ cartId: 'cart_123', method: 'card' });
```

  </div>
</div>

<!-- SECTION 6: SSR (Code Left, Text Right) -->
<div class="custom-section">
  <div class="custom-section-code">

```tsx
// 1. No 'use client' directive. State runs on the server.
export const Dashboard = setup(() => {
  const session = mutable({ user: 'Alice' });

  return render(() => (
    <main>
      <h1>Welcome, {session.user}</h1>
    </main>
  ));
});

// 2. The component renders on Bun, Node.js, Deno, and Cloudflare.
const html = await renderToString(<Dashboard />);
```

  </div>
  <div class="custom-section-content">
    <h2>Universal SSR</h2>
    <p>What if <strong>server-side rendering</strong> just rendered the <strong>exact same components</strong>? No <code>'use client'</code> directives. No fragmented execution boundaries. Anchor restricts state to the <strong>request scope</strong>, handling <strong>concurrency</strong> and <strong>cookie mutations</strong> across any JS runtime without forcing architectural splits.</p>
    <a href="/ui" class="custom-section-action">Explore SSR →</a>
  </div>
</div>

<style>
/* Custom Hero Image Styling */
@media (min-width: 960px) {
  .VPHero .image .image-container {
    transform: none !important;
  }

  .VPHero .image-bg {
    display: none !important;
  }

  .VPHero .image .image-src {
    max-width: 400px;
    max-height: 400px;
  }
}

.VPHero .image-src {
  width: 100% !important;
  height: auto !important;
  filter: drop-shadow(0 16px 32px rgba(0,0,0,0.4));
}
</style>
