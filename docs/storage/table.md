# **Table Store**

The Table Store in Anchor provides a structured storage solution backed by IndexedDB with support for complex queries,
indexing, and relational-like operations. It's designed for scenarios where you need to store collections of structured
data with advanced querying capabilities.

## **Overview**

The Table Store functionality is provided through the **`createTable`** function. It offers an optimistic API for
IndexedDB operations with built-in support for indexing, querying, and reactive state management.

## **API**

### **`createTable()` Function**

Creates a reactive table instance that provides state management for IndexedDB records.

```typescript
type createTable = <T extends Rec, R extends Row<T> = Row<T>>(
  name: string,
  version = 1,
  indexes?: (keyof R)[],
  remIndexes?: (keyof R)[],
  dbName = name,
  seeds?: R[]
) => ReactiveTable<T, R>;
```

**Parameters:**

- `name` - The name of the IndexedDB object store
- `version` - The version of the database schema
- `indexes` - An array of index names to create in the object store
- `remIndexes` - An array of index names to remove from the object store
- `dbName` - The name of the database
- `seeds` - An array of seed data to populate the object store

**Returns:** A reactive table interface with methods for managing records

### **`ReactiveTable` Interface**

ReactiveTable interface provides a reactive wrapper around IndexedTable operations.

#### **Methods**

##### **`.get(id)`**

Gets a reactive row state by ID.

```typescript
get: (id: string) => RowState<R>;
```

**Parameters:**

- `id` - The record ID to fetch

**Returns:** RowState containing the reactive data and status

##### **`.add(payload)`**

Adds a new record to the table.

```typescript
add: (payload: T) => RowState<R>;
```

**Parameters:**

- `payload` - The record data to create

**Returns:** RowState containing the reactive data and status

##### **`.list(filter?, limit?, direction?)`**

Lists records matching the filter criteria.

```typescript
list: (filter?: IDBKeyRange | FilterFn<R>, limit?: number, direction?: IDBCursorDirection) => RowListState<R>;
```

**Parameters:**

- `filter` - The filter criteria (IDBKeyRange or FilterFn) (optional)
- `limit` - Maximum number of records to return (default: 25)
- `direction` - Cursor direction (optional)

**Returns:** RowListState containing the reactive data array and status

##### **`.listByIndex(name, filter?, limit?, direction?)`**

Lists records by index matching the filter criteria.

```typescript
listByIndex: (name: keyof R, filter?: IDBKeyRange | FilterFn<R>, limit?: number, direction?: IDBCursorDirection) =>
  RowListState<R>;
```

**Parameters:**

- `name` - The index name to search on
- `filter` - The filter criteria (IDBKeyRange or FilterFn) (optional)
- `limit` - Maximum number of records to return (default: 25)
- `direction` - Cursor direction (optional)

**Returns:** RowListState containing the reactive data array and status

##### **`.remove(id)`**

Removes a record by ID.

```typescript
remove: (id: string) => RowState<R>;
```

**Parameters:**

- `id` - The record ID to delete

**Returns:** RowState containing the reactive data and status

##### **`.seed(seeds)`**

Seeds the table with initial data.

```typescript
seed: <T extends R[]>(seeds: T) => this;
```

**Parameters:**

- `seeds` - An array of records to seed the table with

**Returns:** The current ReactiveTable instance for method chaining

##### **`.leave(id)`**

Decrements the reference count for a row and cleans up if no longer used.

```typescript
leave: (id: string) => void
```

**Parameters:**

- `id` - The record ID to leave

##### **`.promise(state)`**

Convert the state into a promise that resolves when the state is ready.

```typescript
promise: <T extends RowState<R> | RowListState<R>>(state: T) => Promise<T>;
```

**Parameters:**

- `state` - The state to wait for completion

**Returns:** A promise that resolves when the state is completed

## **Usage Examples**

### **Basic Usage**

```ts
import { createTable } from '@anchorlib/storage/db';

// Create a reactive table
const userTable = createTable('users', 1, ['email', 'age']);

// Add a new record
const newUser = userTable.add({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
});

// The state has a status that indicates the operation progress
console.log(newUser.status); // 'pending' -> 'ready' | 'error'

// Wait for the operation to complete
await userTable.promise(newUser);

// Get an existing record
const existingUser = userTable.get(newUser.data.id);
console.log(existingUser.status); // 'pending' -> 'ready' | 'error'

// Update a record
existingUser.data.name = 'John Smith';

// Remove a record
const removedUser = userTable.remove(newUser.data.id);
```

### **Querying Data**

```ts
import { createTable } from '@anchorlib/storage/db';

type Product = {
  name: string;
  price: number;
  category: string;
};

// Create table with indexes for querying
const productTable = createTable<Product>('products', 1, ['price', 'category']);

// Add sample data
const laptop = productTable.add({ name: 'Laptop', price: 1000, category: 'Electronics' });
const phone = productTable.add({ name: 'Phone', price: 500, category: 'Electronics' });
const book = productTable.add({ name: 'Book', price: 20, category: 'Education' });

// Wait for operations to complete
await Promise.all([productTable.promise(laptop), productTable.promise(phone), productTable.promise(book)]);

// List all products
const allProducts = productTable.list();
await productTable.promise(allProducts);
console.log(allProducts.data.length); // 3

// List products with a filter function
const expensiveProducts = productTable.list((product) => product.data.price > 100);
await productTable.promise(expensiveProducts);
console.log(expensiveProducts.data.length); // 2

// List products by index
const electronics = productTable.listByIndex('category', IDBKeyRange.only('Electronics'));
await productTable.promise(electronics);
console.log(electronics.data.length); // 2

// List with count (useful for pagination)
const productList = productTable.list(
  (product) => product.data.price < 1000,
  10 // limit
);
await productTable.promise(productList);
console.log(productList.count); // Total matching records
console.log(productList.data.length); // Records returned (up to limit)
```

### **Working with Indexes**

```ts
import { createTable } from '@anchorlib/storage/db';

type Order = {
  customerId: string;
  amount: number;
  status: 'pending' | 'shipped' | 'delivered';
};

// Create a table with multiple indexes
const orderTable = createTable<Order>('orders', 1, ['customerId', 'amount', 'status']);

// Add sample data
const order1 = orderTable.add({ customerId: 'cust1', amount: 100, status: 'pending' });
const order2 = orderTable.add({ customerId: 'cust1', amount: 200, status: 'shipped' });
const order3 = orderTable.add({ customerId: 'cust2', amount: 150, status: 'delivered' });

// Wait for operations to complete
await Promise.all([orderTable.promise(order1), orderTable.promise(order2), orderTable.promise(order3)]);

// List by customer ID
const customerOrders = orderTable.listByIndex('customerId', IDBKeyRange.only('cust1'));
await orderTable.promise(customerOrders);

// List by amount range
const highValueOrders = orderTable.listByIndex(
  'amount',
  IDBKeyRange.lowerBound(150) // >= 150
);
await orderTable.promise(highValueOrders);

// List by status
const pendingOrders = orderTable.listByIndex('status', IDBKeyRange.only('pending'));
await orderTable.promise(pendingOrders);
```

### **Seeding Data**

```ts
import { createTable } from '@anchorlib/storage/db';

type Country = {
  name: string;
  code: string;
  population: number;
};

// Create table with seed data
const countryTable = createTable<Country>('countries', 1, ['code'], undefined, 'geo-db', [
  {
    id: '1',
    name: 'United States',
    code: 'US',
    population: 331000000,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: '2',
    name: 'Canada',
    code: 'CA',
    population: 38000000,
    created_at: new Date(),
    updated_at: new Date(),
  },
]);

// The seed data will be inserted only if the table is empty
// This is useful for initializing databases with default data

// List seeded data
const countries = countryTable.list();
await countryTable.promise(countries);
console.log(countries.data.length); // 2
```

## **Best Practices**

### **1. Schema Design**

Design your schemas carefully to optimize for your query patterns:

```ts
import { createTable } from '@anchorlib/storage/db';

// Good: Include indexes for frequently queried fields
type User = {
  email: string; // Frequently searched
  department: string; // Frequently filtered
  createdAt: Date; // Frequently sorted
  isActive: boolean; // Frequently filtered
};

const userTable = createTable<User>(
  'users',
  1,
  ['email', 'department', 'createdAt', 'isActive'] // Indexes for common queries
);
```

### **2. Error Handling**

Always handle asynchronous operations properly:

```ts
import { createTable } from '@anchorlib/storage/db';

type Product = {
  name: string;
  price: number;
};

const productTable = createTable<Product>('products');

// Good: Handle errors properly
const productState = productTable.add({
  name: 'New Product',
  price: 29.99,
});

// Wait for the operation and check for errors
try {
  await productTable.promise(productState);
  console.log('Product created:', productState.data);
} catch (error) {
  console.error('Failed to create product:', error);
  // Implement fallback behavior
}

// Also handle list errors
const productList = productTable.list((product) => product.data.price > 10);

try {
  await productTable.promise(productList);
  console.log('Found products:', productList.data.length);
} catch (error) {
  console.error('Failed to query products:', error);
}
```

### **3. Pagination**

Use the list methods for efficient pagination:

```ts
import { createTable } from '@anchorlib/storage/db';

type Article = {
  title: string;
  content: string;
  publishedAt: Date;
};

const articleTable = createTable<Article>('articles', 1, ['publishedAt']);

// Implement pagination
async function getArticles(page = 1, pageSize = 10) {
  // Get data
  const articleList = articleTable.list(
    undefined, // No filter
    pageSize, // Limit
    'prev' // Direction (optional)
  );

  // Wait for data to load
  await articleTable.promise(articleList);

  return {
    articles: articleList.data,
    total: articleList.count,
    page,
    pageSize,
  };
}

// Usage
const page1 = await getArticles(1, 10);
console.log(`Showing ${page1.articles.length} of ${page1.total} articles`);
```

## **Browser Compatibility**

IndexedDB is supported in all modern browsers:

- Chrome 24+
- Firefox 16+
- Safari 10+
- Edge 12+
- Internet Explorer 10+ (with prefixes)

In environments where IndexedDB is not available, operations will fail gracefully with appropriate error messages.

## **Performance Considerations**

1. **Indexing**: Create indexes only for fields you frequently query. Each index has a storage and performance cost.

2. **Batch Operations**: For inserting multiple records, consider using Promise.all or sequential operations rather than
   parallel operations which can overwhelm the database.

3. **Query Limits**: Use the limit parameter to avoid loading too much data at once.

4. **Cursor Direction**: Use cursor direction parameters to optimize sorted queries.

5. **Memory Usage**: Row data is cached in memory for reactive tables. Be mindful of storing large datasets in reactive
   tables.
