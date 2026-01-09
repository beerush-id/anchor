type BenchmarkResult = {
  name: string;
  totalTime: number;
  avgTime: number;
  requestsPerSecond: number;
  totalRequests: number;
};

const CONCURRENT_USERS = 100000;
const CONCURRENT_CALLS = 10;
const TOTAL_CALLS = CONCURRENT_USERS * CONCURRENT_CALLS;

async function benchmarkIRPC() {
  const start = performance.now();
  const requests = [];

  // 100 users, each making 10 calls (batched into 1 HTTP request)
  for (let user = 0; user < CONCURRENT_USERS; user++) {
    const batch = [];

    for (let i = 0; i < CONCURRENT_CALLS; i++) {
      batch.push({
        id: `${user}-${i}`,
        name: 'hello',
        args: [`User${user}-Call${i}`],
      });
    }

    requests.push(
      fetch('http://localhost:3001/irpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })
    );
  }

  await Promise.all(requests);
  const end = performance.now();
  const totalTime = end - start;

  return {
    name: 'IRPC',
    totalTime,
    avgTime: totalTime / CONCURRENT_USERS,
    requestsPerSecond: (CONCURRENT_USERS / totalTime) * 1000,
    totalRequests: CONCURRENT_USERS, // 100 HTTP requests (1000 calls)
  };
}

async function benchmarkREST(port: number, name: string) {
  const start = performance.now();
  const requests = [];

  // 100 users, each making 10 calls (10 separate HTTP requests)
  for (let user = 0; user < CONCURRENT_USERS; user++) {
    for (let i = 0; i < CONCURRENT_CALLS; i++) {
      requests.push(fetch(`http://localhost:${port}/hello/User${user}-Call${i}`));
    }
  }

  await Promise.all(requests);
  const end = performance.now();
  const totalTime = end - start;

  return {
    name,
    totalTime,
    avgTime: totalTime / requests.length,
    requestsPerSecond: (requests.length / totalTime) * 1000,
    totalRequests: requests.length, // 1000 HTTP requests
  };
}

// @ts-ignore
function printResults(results: BenchmarkResult[]) {
  console.log('\n=== Benchmark Results ===\n');
  console.log(`Scenario: ${CONCURRENT_USERS} users, ${CONCURRENT_CALLS} calls each (${TOTAL_CALLS} total calls)\n`);

  const baseline = results.find((r) => r.name === 'Bun Native');

  results.forEach((result) => {
    const speedup = baseline ? baseline.totalTime / result.totalTime : 1;
    console.log(`${result.name}:`);
    console.log(`  Total Time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`  Avg Time: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  Requests/sec: ${result.requestsPerSecond.toFixed(0)}`);
    console.log(`  HTTP Requests: ${result.totalRequests}`);
    if (baseline && result.name !== baseline.name) {
      console.log(`  Speedup: ${speedup.toFixed(2)}x`);
    }
    console.log('');
  });
}

// @ts-ignore
async function main() {
  console.log('\nRunning benchmarks...\n');

  const results: BenchmarkResult[] = [];

  // Run benchmarks
  results.push(await benchmarkIRPC());
  results.push(await benchmarkREST(3002, 'Bun Native'));
  results.push(await benchmarkREST(3003, 'Hono'));
  results.push(await benchmarkREST(3004, 'Elysia'));

  printResults(results);

  process.exit(0);
}

main();
