---
title: 'Real-World Example: Analytics Dashboard'
description: 'Build a production-ready analytics dashboard with filters, polling, and fine-grained reactivity using Anchor and IRPC.'
keywords:
  - dashboard example
  - Anchor patterns
  - IRPC batching
  - AsyncState
  - fine-grained reactivity
  - logic-driven architecture
---

# Real-World Example: Analytics Dashboard

Build a production-ready analytics dashboard that demonstrates Anchor's **logic-driven architecture** with fine-grained reactivity and IRPC's automatic batching.

## **Requirements**

- 10 widgets displaying different metrics
- Date filter (Today, This Week, This Month)
- Auto-refresh via polling every 30 seconds
- Loading states with spinners and skeleton screens
- Efficient updates (only affected parts re-render)

## **Architecture**

### **State Structure**
```typescript
DashboardState
├── filters: { dateRange: DateRange }
├── widgets: Record<WidgetId, AsyncState<WidgetData>>
├── refresh(): void  // Trigger all widgets to refetch
└── destroy(): void  // Abort all pending fetches
```

### **API Layer**
```typescript
getWidgetData(widgetId: WidgetId, filters: WidgetFilters) → Promise<WidgetData>
```
All 10 widget calls automatically batch into 1 HTTP request.

### **Logic Flow**
1. **State Creation** - `createDashboardState()` creates non-recursive state with typed widgets
2. **Logic Management** - `createDashboard()` sets up polling, debouncing, and lifecycle
3. **Component** - Renders widgets with fine-grained reactivity

## **Implementation**

### **1. API Definitions**

```typescript
// api/widgets.ts
import { irpc } from './module';

export type DateRange = 'today' | 'week' | 'month';

export interface WidgetData {
  value: number;
  change: number;
  timestamp: number;
}

export interface WidgetFilters {
  dateRange: DateRange;
}

export type WidgetGetter = (widgetId: string, filters: WidgetFilters) => Promise<WidgetData>;

export const getWidgetData = irpc.declare<WidgetGetter>({
  name: 'getWidgetData',
});
```

```typescript
// api/widgets.constructor.ts (server-only)
import { irpc } from './module';
import { getWidgetData } from './widgets';

irpc.construct(getWidgetData, async (widgetId, filters) => {
  // Your database query here
  return {
    value: Math.floor(Math.random() * 10000),
    change: Math.floor(Math.random() * 100) - 50,
    timestamp: Date.now(),
  };
});
```

### **2. Dashboard State**

```typescript
// lib/dashboard.ts
import { mutable, query, type AsyncState, onMount, effect, microtask } from '@anchorlib/react';
import { getWidgetData, type DateRange, type WidgetData } from '../api/widgets';

const WIDGET_IDS = [
  'sales', 'revenue', 'users', 'conversion', 'traffic',
  'engagement', 'retention', 'churn', 'ltv', 'cac'
] as const;

export type WidgetId = typeof WIDGET_IDS[number];
export type Widgets = Record<WidgetId, AsyncState<WidgetData>>;
export type DashboardState = {
  filters: {
    dateRange: DateRange;
  };
  widgets: Widgets;
  refresh(): void;
  destroy(): void;
};

export function createDashboardState() {
  // Create non-recursive state (widgets are independent AsyncStates)
  const state = mutable<DashboardState>(
    {
      filters: {
        dateRange: 'today' as DateRange,
      },
      widgets: {},
      refresh: () => {
        WIDGET_IDS.forEach(id => state.widgets[id].start());
      },
      destroy: () => {
        WIDGET_IDS.forEach(id => state.widgets[id].abort());
      },
    },
    { immutable: false } // Non-recursive
  );

  // Initial data for skeleton display
  const initialData: WidgetData = {
    value: 0,
    change: 0,
    timestamp: 0,
  };

  // Create deferred AsyncState for each widget
  WIDGET_IDS.forEach(id => {
    state.widgets[id] = query(
      async () => getWidgetData(id, { dateRange: state.filters.dateRange }),
      { ...initialData }, // Spread to avoid shared reference
      { deferred: true }
    );
  });

  return state;
}
```

### **3. Dashboard Logic**

```typescript
// lib/dashboard.ts
export function createDashboard() {
  const [schedule, cancel] = microtask(300);
  const state = createDashboardState();

  // Polling every 30 seconds
  let pollingTimer: NodeJS.Timeout | null = null;

  const startPolling = () => {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(state.refresh, 30000);
  };

  const stopPolling = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  };

  let mounted = false;

  onMount(() => {
    // Initial fetch on component mount.
    state.refresh();
    startPolling();

    // Mark as mounted
    mounted = true;

    return () => {
      // Abort any pending fetches on component unmount.
      state.destroy();
      stopPolling();
    }
  });

  // Debounced refresh on filter change, only runs after mounted.
  effect(() => {
    // Watch filter changes
    if (state.filters.dateRange && mounted) {
      // Cancel pending refresh
      cancel();

      // Schedule refresh
      schedule(state.refresh);
    }
  });

  return state;
}
```

### **4. Dashboard Component**

```tsx
// components/Dashboard.tsx
import { setup, snippet, nodeRef, effect } from '@anchorlib/react';
import { createDashboard } from '../lib/dashboard';

export const Dashboard = setup(() => {
  const dashboard = createDashboard();

  // Filter controls
  const FilterBar = snippet(() => (
    <div className="filter-bar">
      <label>Date Range:</label>
      <select
        value={dashboard.filters.dateRange}
        onChange={(e) => {
          dashboard.filters.dateRange = e.target.value;
        }}
      >
        <option value="today">Today</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
      </select>
    </div>
  ));

  // Widget factory
  const createWidget = (id: string, title: string) => {
    const widget = dashboard.widgets[id];

    // Loading overlay - independent view
    const LoadingOverlay = snippet(() =>
      widget.status === 'pending' ? (
        <div className="loading-overlay">
          <div className="spinner">Loading...</div>
        </div>
      ) : null
    );

    // Error overlay - independent view
    const ErrorOverlay = snippet(() =>
      widget.status === 'error' ? (
        <div className="error-overlay">
          Error: {widget.error?.message}
        </div>
      ) : null
    );

    // Content with skeleton styling
    const contentRef = nodeRef(() => ({
      className: widget.status === 'pending' ? 'widget-content skeleton' : 'widget-content',
    }));

    const Content = snippet(() => (
      <div ref={contentRef} {...contentRef.attributes}>
        <div className="value">{widget.data?.value ?? 0}</div>
        <div
          className={`change ${(widget.data?.change ?? 0) >= 0 ? 'positive' : 'negative'}`}
        >
          {(widget.data?.change ?? 0) >= 0 ? '+' : ''}
          {widget.data?.change ?? 0}%
        </div>
      </div>
    ));

    return () => (
      <div className="widget">
        <h3>{title}</h3>
        <LoadingOverlay />
        <ErrorOverlay />
        <Content />
      </div>
    );
  };

  const SalesWidget = createWidget('sales', 'Sales');
  const RevenueWidget = createWidget('revenue', 'Revenue');
  const UsersWidget = createWidget('users', 'Active Users');
  const ConversionWidget = createWidget('conversion', 'Conversion Rate');
  const TrafficWidget = createWidget('traffic', 'Traffic');
  const EngagementWidget = createWidget('engagement', 'Engagement');
  const RetentionWidget = createWidget('retention', 'Retention');
  const ChurnWidget = createWidget('churn', 'Churn Rate');
  const LTVWidget = createWidget('ltv', 'Lifetime Value');
  const CACWidget = createWidget('cac', 'Customer Acquisition Cost');

  return (
    <div className="dashboard">
      <FilterBar />
      <div className="widgets-grid">
        <SalesWidget />
        <RevenueWidget />
        <UsersWidget />
        <ConversionWidget />
        <TrafficWidget />
        <EngagementWidget />
        <RetentionWidget />
        <ChurnWidget />
        <LTVWidget />
        <CACWidget />
      </div>
    </div>
  );
});
```

## **How It Works**

### **Initial Load**
1. `createDashboard()` creates state and sets up logic
2. `onMount()` triggers `refresh()`
3. All widgets start fetching (status → 'pending')
4. IRPC batches 10 calls into **1 HTTP request**
5. Widgets update independently as data arrives

### **Filter Change**
1. User changes filter: `dashboard.filters.dateRange = 'week'`
2. `effect()` detects change
3. Previous refresh cancelled, new one scheduled (300ms debounce)
4. `refresh()` called → all widgets refetch
5. IRPC batches into **1 HTTP request**
6. Only affected parts re-render

### **Polling**
1. Timer fires every 30 seconds
2. `refresh()` called
3. Same efficient update process

## **Key Patterns**

### **1. Typed State Structure**

```typescript
// ✅ Proper TypeScript types
export type WidgetId = typeof WIDGET_IDS[number];
export type Widgets = Record<WidgetId, AsyncState<WidgetData>>;

export type DashboardState = {
  filters: { dateRange: DateRange };
  widgets: Widgets;
  refresh(): void;
  destroy(): void;
};

const state = mutable<DashboardState>({ ... }, { immutable: false });
```

### **2. State + Logic Separation**

**State Creation:**
```typescript
// ✅ createDashboardState - Only creates state
export function createDashboardState() {
  const state = mutable<DashboardState>({
    filters: { dateRange: 'today' },
    widgets: {},
    refresh: () => WIDGET_IDS.forEach(id => state.widgets[id].start()),
    destroy: () => WIDGET_IDS.forEach(id => state.widgets[id].abort()),
  });
  
  // Initialize widgets with query (AsyncState)
  WIDGET_IDS.forEach(id => {
    state.widgets[id] = query(
      async () => getWidgetData(id, { dateRange: state.filters.dateRange }),
      { ...initialData },
      { deferred: true }
    );
  });
  
  return state;
}
```

**Logic Management:**
```typescript
// ✅ createDashboard - Manages logic (polling, debouncing, lifecycle)
export function createDashboard() {
  const [schedule, cancel] = microtask(300);
  const state = createDashboardState();
  
  // Polling
  let pollingTimer: NodeJS.Timeout | null = null;
  const startPolling = () => {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(state.refresh, 30000);
  };
  
  // Lifecycle
  let mounted = false;
  onMount(() => {
    state.refresh();
    startPolling();
    mounted = true;
    return () => {
      state.destroy();
      stopPolling();
    };
  });
  
  // Debounced filter change (only after mount)
  effect(() => {
    if (state.filters.dateRange && mounted) {
      cancel();
      schedule(state.refresh);
    }
  });
  
  return state;
}
```

### **3. query() for Data Fetching**

```typescript
// ✅ query() wraps async process into AsyncState
const widget = query(
  async () => getWidgetData(id, filters),
  { ...initialData },
  { deferred: true }
);

// Access:
widget.status  // 'idle' | 'pending' | 'success' | 'error'
widget.data    // WidgetData
widget.error   // Error | undefined
widget.start() // Trigger execution
widget.abort() // Cancel execution
```

### **4. Mounted Flag Pattern**

```typescript
// ✅ Prevent effect from running before mount
let mounted = false;

onMount(() => {
  mounted = true;
  return () => { /* cleanup */ };
});

effect(() => {
  if (state.filters.dateRange && mounted) {
    // Only run after mount
    schedule(state.refresh);
  }
});
```

::: tip Logic Flow Note

**Logic Flow in Effect matters**. The `mounted` is a static variable, thus effect can't track it - so don't use it as a short-circuit for state tracking.

❌ Don't do this, `state.filter.dateRange` will be short-circuited.
```typescript
if (mounted && state.filter.dateRange) {}
```

✅ Do this, we watch the `state.filter.dateRange` first before the short-circuit.
```typescript
if (state.filter.dateRange && mounted) {}
```
:::

### **5. Debounced Effects**

```typescript
// ✅ Debounce with microtask
const [schedule, cancel] = microtask(300);

effect(() => {
  if (state.filters.dateRange && mounted) {
    cancel();  // Cancel pending
    schedule(state.refresh);  // Schedule new
  }
});
```

### **6. DOM Binding for Attribute Updates**

```typescript
// ✅ nodeRef with attributes
const contentRef = nodeRef(() => ({
  className: widget.status === 'pending' ? 'skeleton' : '',
}));

// Change to className directly applied to the DOM, skipping React's render.
<div ref={contentRef} {...contentRef.attributes}>
  {/* Content doesn't re-render on className change */}
</div>
```

**Skeleton CSS:**
```css
.widget-content.skeleton .value,
.widget-content.skeleton .change {
  color: transparent;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}
```

## **Performance**

**Traditional Approach:**
- 10 HTTP requests per update
- Manual loading/error management
- Full re-renders on filter change

**AIR Stack:**
- **1 HTTP request** (10x fewer)
- **AsyncState** auto-manages state
- **Fine-grained updates** (only affected parts)
- **6.96x faster**

## **Standard React vs AIR Stack**

Let's see how this dashboard would look with popular React libraries:

### **Backend: REST API vs IRPC**

#### **REST API Approach**

```typescript
// ❌ 10 separate route handlers
app.get('/api/sales', async (req, res) => {
  const { range } = req.query;
  const data = await db.query('SELECT * FROM sales WHERE date_range = ?', [range]);
  res.json(data);
});

app.get('/api/revenue', async (req, res) => {
  const { range } = req.query;
  const data = await db.query('SELECT * FROM revenue WHERE date_range = ?', [range]);
  res.json(data);
});

app.get('/api/users', async (req, res) => {
  const { range } = req.query;
  const data = await db.query('SELECT * FROM users WHERE date_range = ?', [range]);
  res.json(data);
});

// ... 7 more route handlers

// ❌ Client needs to know all endpoints (even with concurrent fetches)
const [sales, revenue /* ... 8 more */] = await Promise.all([
  fetch('/api/sales?range=today').then(r => r.json()),
  fetch('/api/revenue?range=today').then(r => r.json()),
  // ... 8 more fetches = 10 HTTP requests total
]);
```

**Problems:**
- ❌ **10 route definitions** (boilerplate)
- ❌ **10 HTTP requests** from client
- ❌ **Manual serialization** (query params, JSON)
- ❌ **No type safety** between client and server
- ❌ **Client knows about URLs** (coupling)

#### **IRPC Approach**

```typescript
// ✅ Single function, single route
irpc.construct(getWidgetData, async (widgetId, filters) => {
  const data = await db.query(
    `SELECT * FROM ${widgetId} WHERE date_range = ?`,
    [filters.dateRange]
  );
  return data;
});

// ✅ Client just calls the function (concurrent calls get batched)
const [sales, revenue, users /* ... 7 more */] = await Promise.all([
  getWidgetData('sales', { dateRange: 'today' }),
  getWidgetData('revenue', { dateRange: 'today' }),
  getWidgetData('users', { dateRange: 'today' }),
  // ... 7 more calls
]);
// All 10 calls batched into 1 HTTP request!
```

**Benefits:**
- ✅ **1 function** handles all widgets
- ✅ **1 HTTP request** (automatic batching)
- ✅ **Type-safe** (TypeScript types shared)
- ✅ **No URL knowledge** needed on client
- ✅ **Auto-serialization** (IRPC handles it)

---

### **Frontend Comparison**

#### **Option 1: Redux + React Query**

```tsx
// ❌ Redux store setup
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: { dateRange: 'today' },
  reducers: {
    setDateRange: (state, action) => {
      state.dateRange = action.payload;
    },
  },
});

// ❌ React Query hooks for each widget
function SalesWidget() {
  const dateRange = useSelector(state => state.dashboard.dateRange);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['sales', dateRange],
    queryFn: () => fetch(`/api/sales?range=${dateRange}`).then(r => r.json()),
    refetchInterval: 30000,
  });
  
  return (
    <div className="widget">
      <h3>Sales</h3>
      {isLoading && <div className="spinner">Loading...</div>}
      {error && <div className="error">{error.message}</div>}
      {data && (
        <div className="widget-content">
          <div className="value">{data.value}</div>
          <div className="change">{data.change}%</div>
        </div>
      )}
    </div>
  );
}

// ❌ Repeat for all 10 widgets...
```

**Problems:**
- ❌ **10 separate HTTP requests** (no automatic batching)
- ❌ **Boilerplate overload** (Redux setup, actions, selectors)
- ❌ **Context providers** needed (`<Provider>`, `<QueryClientProvider>`)
- ❌ **Manual loading states** in every widget
- ❌ **Full re-renders** when loading state changes
- ❌ **No skeleton pattern** (would need custom implementation)

#### **Option 2: Zustand + useQuery**

```tsx
// ❌ Zustand store
const useDashboardStore = create((set) => ({
  dateRange: 'today',
  setDateRange: (range) => set({ dateRange: range }),
}));

// ❌ Custom hook for each widget
function useSalesData() {
  const dateRange = useDashboardStore(state => state.dateRange);
  
  return useQuery({
    queryKey: ['sales', dateRange],
    queryFn: () => fetch(`/api/sales?range=${dateRange}`).then(r => r.json()),
    refetchInterval: 30000,
  });
}

function SalesWidget() {
  const { data, isLoading, error } = useSalesData();
  
  return (
    <div className="widget">
      <h3>Sales</h3>
      {isLoading && <div className="spinner">Loading...</div>}
      {error && <div className="error">{error.message}</div>}
      {data && (
        <div className="widget-content">
          <div className="value">{data.value}</div>
        </div>
      )}
    </div>
  );
}
```

**Problems:**
- ❌ **10 separate HTTP requests** (no batching)
- ❌ **Hook rules** (can't conditionally call hooks)
- ❌ **Re-render on every state change** (entire widget)
- ❌ **Manual debouncing** needed for filter changes
- ❌ **No fine-grained reactivity** (all or nothing)

#### **Option 3: Context + useState + useEffect**

```tsx
// ❌ Context setup
const DashboardContext = createContext();

function DashboardProvider({ children }) {
  const [dateRange, setDateRange] = useState('today');
  const [salesData, setSalesData] = useState(null);
  const [salesLoading, setSalesLoading] = useState(false);
  // ... 9 more state pairs for other widgets
  
  useEffect(() => {
    const fetchAll = async () => {
      setSalesLoading(true);
      // ... set loading for all widgets
      
      const [sales, revenue /* ... 8 more */] = await Promise.all([
        fetch(`/api/sales?range=${dateRange}`).then(r => r.json()),
        fetch(`/api/revenue?range=${dateRange}`).then(r => r.json()),
        // ... 8 more fetches = 10 HTTP requests
      ]);
      
      setSalesData(sales);
      setSalesLoading(false);
      // ... set data for all widgets
    };
    
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [dateRange]);
  
  return (
    <DashboardContext.Provider value={{ dateRange, setDateRange, salesData, salesLoading, ... }}>
      {children}
    </DashboardContext.Provider>
  );
}

function SalesWidget() {
  const { salesData, salesLoading } = useContext(DashboardContext);
  
  return (
    <div className="widget">
      <h3>Sales</h3>
      {salesLoading && <div className="spinner">Loading...</div>}
      {salesData && (
        <div className="widget-content">
          <div className="value">{salesData.value}</div>
        </div>
      )}
    </div>
  );
}
```

**Problems:**
- ❌ **10 separate HTTP requests** (sequential fetches)
- ❌ **Context hell** (provider wrapping)
- ❌ **20+ state variables** (data + loading for each widget)
- ❌ **useEffect complexity** (dependencies, cleanup)
- ❌ **All widgets re-render** when any loading state changes
- ❌ **Manual polling management**

---

### **AIR Stack Solution**

```tsx
// ✅ Single state file
export function createDashboard() {
  const state = createDashboardState();
  
  // Polling, debouncing, lifecycle - all in one place
  // ...
  
  return state;
}

// ✅ Component
export const Dashboard = setup(() => {
  const dashboard = createDashboard();
  
  const SalesWidget = createWidget('sales', 'Sales');
  
  return (
    <div className="dashboard">
      <FilterBar />
      <SalesWidget />
      {/* ... 9 more widgets */}
    </div>
  );
});
```

**Benefits:**
- ✅ **1 HTTP request** (automatic batching)
- ✅ **No context providers** needed
- ✅ **No boilerplate** (no actions, reducers, selectors)
- ✅ **Fine-grained updates** (only affected parts re-render)
- ✅ **Automatic loading states** (AsyncState manages it)
- ✅ **Built-in skeleton pattern** (nodeRef + CSS)
- ✅ **Logic-driven** (state + logic separated)

---

### **Code Comparison**

| Aspect | Redux + React Query | Zustand + useQuery | Context + useState | **AIR Stack** |
|--------|---------------------|--------------------|--------------------|---------------|
| **Frontend Lines** | ~500 | ~400 | ~350 | **~200** |
| **Backend Routes** | 10 | 10 | 10 | **1** |
| **HTTP Requests** | 10 | 10 | 10 | **1** |
| **Providers** | 2 | 1 | 1 | **0** |
| **State Variables** | 20+ | 20+ | 20+ | **1** |
| **Re-renders** | Full widget | Full widget | Full widget | **Fine-grained** |
| **Type Safety** | Partial | Partial | Manual | **Full (E2E)** |
| **Skeleton Pattern** | Manual | Manual | Manual | **Built-in** |
| **Debouncing** | Manual | Manual | Manual | **Built-in** |
| **Polling** | Built-in | Built-in | Manual | **Built-in** |
| **Client-Server Coupling** | High (URLs) | High (URLs) | High (URLs) | **None** |

## **Testing & Mocking**

One of IRPC's most underrated features: **trivial mocking**.

### **Traditional REST API Mocking**

```typescript
// ❌ Complex setup with MSW
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/sales', (req, res, ctx) => {
    return res(ctx.json({ value: 1000, change: 5, timestamp: Date.now() }));
  }),
  rest.get('/api/revenue', (req, res, ctx) => {
    return res(ctx.json({ value: 5000, change: 10, timestamp: Date.now() }));
  }),
  // ... 8 more mock handlers
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('dashboard loads widgets', async () => {
  render(<Dashboard />);
  // Test with mocked API
});
```

**Problems:**
- ❌ Need MSW or similar library
- ❌ 10 separate mock handlers
- ❌ Server setup/teardown boilerplate
- ❌ URL matching logic
- ❌ Complex for different test scenarios

### **IRPC Mocking**

```typescript
// ✅ Just construct the function!
import { irpc } from './module';
import { getWidgetData } from './api/widgets';

// Mock in test file
irpc.construct(getWidgetData, async (widgetId, filters) => {
  const mockData = {
    sales: { value: 1000, change: 5, timestamp: Date.now() },
    revenue: { value: 5000, change: 10, timestamp: Date.now() },
    users: { value: 250, change: -2, timestamp: Date.now() },
    // ... more mock data
  };
  return mockData[widgetId];
});

test('dashboard loads widgets', async () => {
  render(<Dashboard />);
  // Test runs with mocked IRPC function
});
```

**Benefits:**
- ✅ **No mocking library** needed
- ✅ **One mock** handles all widgets
- ✅ **Type-safe** (TypeScript validates mock data)
- ✅ **Same code** in dev and test
- ✅ **Easy scenario testing** (just change the mock)

### **Development Mode**

```typescript
// ✅ Mock in dev, real in prod
if (import.meta.env.DEV) {
  irpc.construct(getWidgetData, async (widgetId, filters) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      value: Math.floor(Math.random() * 10000),
      change: Math.floor(Math.random() * 100) - 50,
      timestamp: Date.now(),
    };
  });
}
```

**Use cases:**
- ✅ Develop frontend without backend running
- ✅ Storybook stories with mock data
- ✅ Unit tests
- ✅ Integration tests
- ✅ E2E tests with controlled data
- ✅ Demo mode for presentations

### **Storybook Example**

```typescript
// ✅ Perfect for component stories
export const DashboardStory = {
  decorators: [
    (Story) => {
      // Mock IRPC for this story
      irpc.construct(getWidgetData, async (widgetId) => ({
        value: 1000,
        change: 5,
        timestamp: Date.now(),
      }));
      
      return <Story />;
    },
  ],
  render: () => <Dashboard />,
};

export const DashboardWithErrors = {
  decorators: [
    (Story) => {
      // Mock error scenario
      irpc.construct(getWidgetData, async () => {
        throw new Error('API Error');
      });
      
      return <Story />;
    },
  ],
  render: () => <Dashboard />,
};
```

**Comparison:**

| Aspect | REST + MSW | **IRPC** |
|--------|------------|----------|
| **Setup** | Server + handlers | **Just construct** |
| **Mock Count** | 10 handlers | **1 function** |
| **Type Safety** | Manual | **Automatic** |
| **Storybook** | Complex | **Trivial** |
| **Dev Mode** | Proxy/mock server | **Just construct** |
| **Test Scenarios** | Multiple handlers | **One function** |

## **Next Steps**

- [AsyncState Documentation](/react/state/data-fetching)
- [Fine-Grained Reactivity](/reactivity)
- [IRPC Batching](/irpc/index.html)
