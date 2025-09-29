export const BENCHMARK_SIZE = 1000;
export const BENCHMARK_TOGGLE_SIZE = 50;
export const BENCHMARK_DEBOUNCE_TIME = 5;
export const BENCHMARK_MAX_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

export type TimeMetric = {
  index: number;
  duration: number;
  renderDuration: number;
};

export async function evaluate(fn: () => void, iterations = BENCHMARK_SIZE) {
  const metrics: TimeMetric[] = [];
  const progress = { index: 0, duration: 0, renderDuration: 0 };
  const stats = { lowest: 0, highest: 0, average: 0 };
  const renderStats = { lowest: 0, average: 0, highest: 0 };

  const tick = async () => {
    const start = performance.now();

    fn();

    const end = performance.now();
    const duration = end - start;

    progress.index++;
    progress.duration += duration;

    await new Promise((resolve) => {
      queueMicrotask(() => {
        setTimeout(resolve, 0);
      });
    });

    const renderEnd = performance.now();
    const renderDuration = renderEnd - start;

    progress.renderDuration += renderDuration;

    metrics.push({ index: progress.index, duration, renderDuration });

    if (progress.duration >= BENCHMARK_MAX_TIME || progress.index >= iterations) {
      const lowest = metrics.reduce((acc, curr) => (curr.duration < acc.duration ? curr : acc), metrics[0]);
      const renderLowest = metrics.reduce(
        (acc, curr) => (curr.renderDuration < acc.renderDuration ? curr : acc),
        metrics[0]
      );

      const average = metrics.reduce((acc, curr) => acc + curr.duration, 0) / metrics.length;
      const renderAverage = metrics.reduce((acc, curr) => acc + curr.renderDuration, 0) / metrics.length;

      const highest = metrics.reduce((acc, curr) => (curr.duration > acc.duration ? curr : acc), metrics[0]);
      const renderHighest = metrics.reduce(
        (acc, curr) => (curr.renderDuration > acc.renderDuration ? curr : acc),
        metrics[0]
      );

      stats.lowest = lowest.duration;
      renderStats.lowest = renderLowest.renderDuration;

      stats.highest = highest.duration;
      renderStats.highest = renderHighest.renderDuration;

      stats.average = average;
      renderStats.average = renderAverage;

      console.log('Metrics:', JSON.stringify({ metrics, progress, stats, renderStats }));
      console.info(
        `Finished benchmark after ${bold(progress.renderDuration.toLocaleString())}ms with ${bold(progress.index.toLocaleString())} iterations.`
      );
      console.log(`Min render duration: ${bold(renderStats.lowest.toLocaleString())}ms`);
      console.log(`Avg render duration: ${bold(renderStats.average.toLocaleString())}ms`);
      console.log(`Max render duration: ${bold(renderStats.highest.toLocaleString())}ms`);

      return;
    }

    await sleep(BENCHMARK_DEBOUNCE_TIME);
    await tick();
  };

  await tick();

  return { metrics, progress, stats, renderStats };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const bold = (text: string | number | boolean) => `\x1b[1m${text}\x1b[0m`;
