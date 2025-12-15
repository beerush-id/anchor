# IRPC Benchmark

Benchmark comparing IRPC batching vs traditional REST endpoints.

## Benchmarks

### Performance Benchmark (`bun run bench`)

Measures speed for a fixed number of users.

**Scenario:**
- 100,000 concurrent users
- 10 API calls per user
- 1,000,000 total calls

**What it measures:**
- Total time to complete all calls
- Average time per request
- Requests per second
- Speedup vs baseline

## Implementations

1. **IRPC** - Batched calls (N users = N HTTP requests)
2. **Bun Native** - Individual REST endpoints (N users × 10 calls = 10N HTTP requests)
3. **Hono** - Individual REST endpoints
4. **Elysia** - Individual REST endpoints

## Running the Benchmarks

```bash
bun install

# Run the servers
bun run serve

# Performance benchmark
bun run bench
```
