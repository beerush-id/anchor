---
title: 'IRPC vs. NestJS'
description: 'Building an API? See how NestJS brings enterprise architecture to Node.js while IRPC streamlines full-stack communication with isomorphic functions.'
sidebar: false
prev: false
next: false
---

# IRPC vs. NestJS

[← Back to Posts](/posts/index.html) | **Technical Comparison** | **`NestJS`** **`Architecture`** **`RPC`**

When building an API in Node.js, teams often reach for heavyweight frameworks like NestJS to enforce architectural patterns. NestJS provides dependency injection, controllers, and modules—bringing enterprise Java/Angular patterns to the server.

[NestJS](https://nestjs.com) transforms how developers build standard HTTP APIs. Instead of stitching together Express middleware and hoping for the best, you get dependency injection, decorators, and modules designed to expose standard REST or GraphQL endpoints.

IRPC (part of the AIR Stack) takes a radically different path. It completely separates function signatures from transport and implementation. You don't make HTTP requests; you just call isomorphic functions. The framework batches the calls, executes them globally, and dynamically mutates the connected UI hooks. 

Your choice between them shapes everything: development speed, team structure, and long-term maintenance burden. Here's how to pick the right one for your project.

## Framework comparison

These frameworks solve different problems, which means they're built for different types of projects and developers. Your choice shapes how you'll spend your time coding.

| Aspect | NestJS | IRPC |
|---|---|---|
| **Paradigm** | REST/GraphQL APIs | Isomorphic Remote Functions |
| **Architecture** | Enforced module architecture with DI | Native modularity via decoupled signatures |
| **Client Integration** | Manual fetch, state management, OpenAPI | Native via Reactive Sub-stubs |
| **Real-time** | WebSockets Gateway (Socket.io/ws) | Native Reactive Streaming |
| **Database** | TypeORM, Prisma | Standardized CRUD with Drivers |
| **Validation** | Class-validator, Pipes | Built-in Zod schema support |
| **Performance** | Standard HTTP overhead per route | Automatic batched execution and coalescing |
| **Server Caching** | CacheModule, RedisStore, Interceptors | Chain of Responsibility (e.g., RedisCacheDriver) |
| **Client Caching** | External libraries (React Query, SWR) | Built-in memory and persistence layer |

Your choice often comes down to the team background and project requirements. If you are building microservices consumed by multiple third-party clients, NestJS makes sense. If you are building a full-stack web application and want to ship features rapidly without worrying about network plumbing, IRPC is the clear winner.

## Getting started

The first few hours with each framework reveal their core differences in project setup. NestJS builds projects specifically to serve HTTP/REST traffic, while IRPC focuses on defining type-safe contracts that can run anywhere.

### NestJS Setup

NestJS relies on a powerful CLI to generate boilerplate and structure your application. You start by generating modules, controllers, and services.

```bash
npm install -g @nestjs/cli
nest new my-api
cd my-api
nest generate controller users
nest generate service users
```

You must explicitly wire modules, controllers, and services together. This explicit wiring means you understand exactly how your application is structured, but it requires running multiple commands and managing several files before you see a working endpoint.

### IRPC Setup

IRPC gets you building features immediately by separating the declaration from the implementation. You start by defining a type-safe contract that both client and server will use.

**Declare Stub**
```typescript
// rpc/hello/index.ts
import { irpc } from '../lib/module.js';

export type HelloFn = (name: string) => Promise<string>;
export const hello = irpc.declare<HelloFn>('hello', () => '');
```

The signature is registered, but the logic is empty. The stub acts as a smart proxy that can be called from anywhere. You don't need to define HTTP verbs, route paths, or set up controllers just to define an operation.

## Implementation details

The way you implement business logic separates these tools. NestJS uses classes and decorators to handle HTTP requests, while IRPC uses function constructors to fulfill contracts.

### NestJS Controllers

In NestJS, everything has its place within a class-based architecture. Controllers map HTTP requests to class methods and delegate the actual work to injected services.

**Define Controller**
```typescript
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id')
  findOne(@Param('id') id: string): User {
    return this.usersService.findOne(id);
  }
}
```

The `@Controller` and `@Get` decorators map the class method to an HTTP endpoint. You rely on dependency injection to provide the `UsersService`. The structure forces you to think about architecture from day one, which pays dividends as your application grows, but it also means dealing with a lot of boilerplate for simple endpoints.

### IRPC Handlers

To fulfill the stub's contract in IRPC, you construct the actual logic that handles the execution. The constructor automatically infers the types from the stub.

**Implement Handler**
```typescript
// rpc/hello/constructor.ts
import { irpc } from '../lib/module.js';
import { hello } from './index.js';

irpc.construct(hello, (name: string) => {
  return `Hello, ${name}!`;
});
```

The implementation is just a standard function. The client and server share the exact same type signature, ensuring that misspelled arguments or wrong return shapes are caught at compile time. You don't need decorators, classes, or routing definitions to handle a request.

## Data Fetching and Reactivity

Fetching data and updating the UI reveals how differently these frameworks approach full-stack communication. NestJS stops at the API boundary, while IRPC extends directly into your UI components.

### Calling NestJS APIs

When using NestJS, the client application must manually manage the HTTP request, loading state, and reactivity using standard browser APIs or third-party libraries.

**Client-side Fetching**
```tsx
export function UserProfile({ id }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${id}`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div>Loading...</div>;
  return <div>{user?.name}</div>;
}
```

You are responsible for writing the `fetch` call, managing the loading state, and handling errors. The type safety from the backend is lost unless you manually share types or use additional tools like OpenAPI generators to bridge the gap.

### Calling IRPC Stubs

IRPC stubs expose specialized lifecycle APIs for use inside reactive component bodies. You just import the signature and bind it directly to your UI.

**Bind UI to Sub-stub**
```tsx
import { setup, render } from '@anchorlib/react';
import { getUser } from './rpc/users/index.js';

export const UserProfile = setup<{ id: string }>((props) => {
  const user = getUser.with(() => [props.id]);

  return render(() => (
    <div>
      {user.status === 'pending' ? 'Loading...' : `User: ${user.data?.name}`}
    </div>
  ));
});
```

Every call returns an `IRPCReader` — a reactive proxy with `.data`, `.status`, and `.error` properties. The `.with()` Sub-stub creates an eager reactive call that automatically re-runs when dependencies change. There is no `fetch`, no routes, and no manual serialization required.

## Database and CRUD

Database work reveals another core difference. NestJS treats the database as something you need to manage explicitly with ORMs, while IRPC provides standardized driver patterns to make boilerplate CRUD disappear.

### NestJS Database Integration

NestJS gives you choices but requires decisions. TypeORM and Prisma are popular choices, but you must manually expose each operation through your controllers.

**Define Entity**
```typescript
// user.entity.ts
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;
}
```

**Define DTOs**
```typescript
// users.dto.ts
export class CreateUserDto {
  name: string;
  email: string;
}

export class UpdateUserDto {
  name?: string;
  email?: string;
}
```

**Implement Service**
```typescript
// users.service.ts
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  create(dto: CreateUserDto) { return this.repo.save(dto); }
  findOne(id: string) { return this.repo.findOne({ where: { id } }); }
  update(id: string, dto: UpdateUserDto) { return this.repo.update(id, dto); }
  remove(id: string) { return this.repo.delete(id); }
}
```

**Define Controller**
```typescript
// users.controller.ts
@Controller('users')
@UseInterceptors(CacheInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) { return this.usersService.create(dto); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.usersService.findOne(id); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.usersService.update(id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.usersService.remove(id); }
}
```

**Configure Feature Module**
```typescript
// users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

**Bind Database to App Module**
```typescript
// app.module.ts (Database Binding)
@Module({
  imports: [
    CacheModule.register({ store: redisStore, url: 'redis://localhost:6379' }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User],
    }),
    UsersModule,
  ],
})
export class AppModule {}
```

You must explicitly define the entity, create DTOs, write the service logic, map the controller routes, configure interceptors, and finally bind everything together with module imports and database/cache connections. For standard CRUD operations, this means writing an immense amount of boilerplate repeatedly.

### IRPC Standardized CRUD

For standard entities, manually declaring and implementing CRUD functions is repetitive. IRPC provides a `crud()` utility to batch-declare these operations, and an Adapter pattern to wire them instantly.

**Declare CRUD Stubs**
```typescript
// rpc/users/index.ts
import { irpc } from '../lib/module.js';

type User = { id: string; name: string; email: string };
export const users = irpc.crud<User>('users', () => ({ id: '', name: '', email: '' }));
```

**Attach Stubs to Adapter**
```typescript
// rpc/users/constructor.ts
import { adapter } from '../../server/adapter.js';
import { users } from './index.js';

// The feature attaches itself to the global adapter
adapter.attach(users);
```

**Setup Adapter (if not done yet)**
```typescript
// server/adapter.ts
import { irpc } from '../lib/module.js';
import { IRPCAdapter } from '@irpclib/irpc';
import { DatabaseDriver } from '../lib/db.js';

// Setup once and exported for feature modules to consume
export const adapter = new IRPCAdapter(irpc);

adapter.use(new RedisCacheDriver());
adapter.use(new DatabaseDriver());
```

Instead of manually constructing handlers for each stub, you attach them to an `IRPCAdapter` which routes requests to generic driver implementations. This eliminates the need to write redundant database queries, while still maintaining full type safety and caching capabilities on the client.

## Real-time and Streaming

Handling continuous data streams requires complex setups in traditional architectures. NestJS relies on WebSockets, while IRPC handles streams natively using the exact same abstraction as standard calls.

### NestJS WebSockets

NestJS requires setting up a separate WebSocket gateway and managing socket connections manually to stream data.

**Define WebSocket Gateway**
```typescript
@WebSocketGateway()
export class PoemGateway {
  @SubscribeMessage('generatePoem')
  generatePoem(@MessageBody() prompt: string): Observable<WsResponse<string>> {
    return new Observable((observer) => {
      ai.generateStream(prompt).then(async (response) => {
        for await (const chunk of response) {
          observer.next({ event: 'poemChunk', data: chunk.text });
        }
        observer.complete();
      });
    });
  }
}
```

To stream data over time, you must manually construct RxJS Observables, wrap every chunk in custom event payloads (`WsResponse`), and manage connection state on both the client and server. This adds significant overhead, requires a separate port or protocol negotiation, and splits your application logic across different communication paradigms.

### IRPC Reactive Streaming

Instead of returning a static `Promise`, IRPC can return a `RemoteState`. The server yields data chunks over the wire, and the UI binds directly to the reader.

**Declare Stream Stub**
```typescript
// rpc/poem/index.ts
export const generatePoem = irpc.declare<GeneratePoemFn>('generatePoem', () => '', {
  stream: true,
});
```

**Yield RemoteState Stream**
```typescript
// rpc/poem/constructor.ts
irpc.construct(generatePoem, (prompt) => {
  return stream<string>(async (state, resolve) => {
    const response = await ai.generate({ prompt, stream: true });
    
    for await (const chunk of response) {
      state.data = (state.data || '') + chunk.text;
    }
    
    resolve();
  });
});
```

The UI binds directly to the returned `IRPCReader`, which hydrates progressively. You don't need a separate WebSocket library or complex event listeners. The framework handles the streaming transport under the hood, allowing you to build real-time features like AI generation or live feeds effortlessly.

## Validation and Error Handling

Data validation is critical for any API. NestJS uses decorators and pipes, while IRPC integrates directly with Zod for runtime enforcement.

### NestJS Validation Pipes

NestJS relies on `class-validator` and DTO (Data Transfer Object) classes to validate incoming requests.

**Define Validation DTO**
```typescript
// create-user.dto.ts
import { IsString, IsEmail } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;
}
```

**Enable Global Validation**
```typescript
// main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Requires installing class-transformer alongside class-validator
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}
bootstrap();
```

**Controller Usage**
```typescript
// users.controller.ts
@Post()
create(@Body() createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto);
}
```

This approach works well but requires you to define separate DTO classes, install `class-transformer`, configure validation pipes globally, and rely on metadata reflection. It separates your TypeScript definitions from your runtime validation logic.

### IRPC Schema Validation

IRPC allows you to attach Zod schemas directly to your function declarations for runtime input and output validation.

**Declare Stub with Zod Schema**
```typescript
import { z } from 'zod';

export const createUser = irpc.declare({
  name: 'createUser',
  schema: {
    input: [z.object({
      name: z.string().min(1),
      email: z.string().email(),
    })],
    output: z.object({
      id: z.string(),
      name: z.string(),
    }),
  },
});
```

Input validation runs before the handler, rejecting invalid arguments before your server code is reached. Output validation runs before the response is sent, catching handler bugs. Because it uses Zod, you can infer TypeScript types directly from the schema, ensuring your runtime validation and compile-time types are always perfectly in sync.

## Modularity and Microservices

How you scale your codebase and split it into distributed services highlights a fundamental difference. NestJS enforces a specific module architecture, while IRPC scales naturally through function composition.

### NestJS Modules and Microservices

NestJS uses decorators to group controllers and providers into modules. When scaling to microservices, you must configure specific transport layers (like Redis, RabbitMQ, or gRPC) and explicitly build microservice controllers.

**Microservice Receiver (Math Service)**
```typescript
// math.controller.ts
@Controller()
export class MathController {
  @MessagePattern('accumulate')
  accumulate(data: number[]): number {
    return data.reduce((a, b) => a + b);
  }
}
```

**Client Proxy Registration (Cats Service)**
```typescript
// cats.module.ts
@Module({
  imports: [
    ClientsModule.register([
      { name: 'MATH_SERVICE', transport: Transport.RMQ, options: { urls: ['amqp://localhost:5672'] } },
    ]),
  ],
  providers: [CatsService],
})
export class CatsModule {}
```

**Microservice Caller (Cats Service)**
```typescript
// cats.service.ts
@Injectable()
export class CatsService {
  constructor(@Inject('MATH_SERVICE') private client: ClientProxy) {}

  accumulate(): Observable<number> {
    return this.client.send<number>('accumulate', [1, 2, 3]);
  }
}
```

This approach makes it powerful for building distributed backend systems, but it forces a hard boundary between local modules and remote microservices. You must write explicit `@MessagePattern` controllers to receive data, register `ClientsModule` transports, and use `ClientProxy` to send data. Your code must change depending on whether a service lives in the same repository or across the network.

### IRPC Native Composition

IRPC is inherently modular by architecture, not by API constraints. You can organize your codebase however you want (e.g., `index.ts` for schemas and stubs, `constructor.ts` for implementation). When splitting into microservices, there is no concept of "Micro" or "Macro" services—it's just functions calling functions.

**User Service: Export Stub**
```typescript
// user-service/index.ts
export const users = irpc.crud('users', () => ({}));
```

**Project Service: Import and Call**
```typescript
// project-service/constructor.ts
import { users } from '@myorg/users';
import { projects } from './index.ts';

irpc.construct(projects.get, async (id) => {
  // Calling a completely different microservice natively
  const user = await users.get(id);
  
  return { projectData: '...', owner: user };
});
```

Because the function signature (`index.ts`) is completely separated from its implementation (`constructor.ts`), the Project Service simply imports the stub from the User Service package and calls it. IRPC automatically handles the network routing under the hood. The code looks exactly the same whether the function is executed in the same thread, in a separate worker, or on a server across the globe.

## Final thoughts

The contrast is striking. NestJS says "let's build standard REST APIs with clear HTTP routing and dependency injection." IRPC says "let's eliminate the network boundary completely and treat remote servers as local functions." 

If you need to build a public-facing API that must be consumed via standard HTTP requests (e.g., by third-party curl commands, Python scripts, or external partners), NestJS provides the exact REST infrastructure necessary for that.

If you are building a modern full-stack web application where the primary consumer of your backend is your own frontend, IRPC provides an unmatched developer experience. By removing the need to manage endpoints, serialization, and network state, you can ship features significantly faster while maintaining perfect type safety.
