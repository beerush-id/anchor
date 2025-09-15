import 'chart.js/auto';
import { Section, SectionDescription, SectionTitle } from '@components/Section.js';
import { useAnchor, useImmutable } from '@anchorlib/react';
import { observable, observe } from '@anchorlib/react/view';
import { Gauge, ListPlus, LucideScan, Timer, ToggleRight, TrendingDown } from 'lucide-react';
import { type FC } from 'react';
import { type Immutable } from '@anchorlib/core';
import { Bar } from 'react-chartjs-2';
import { MainCTA } from '@components/MainCTA.js';
import { BENCHMARK_SIZE, BENCHMARK_TOGGLE_SIZE } from '@lib/todo.js';

type Metric = {
  name: string;
  label: string;
  description?: string;
  icon: string;
  unit?: string;
  data?: Record<string, number>;
  metrics?: Metric[];
};

type MetricDisplay = {
  metrics?: Immutable<Metric[]>;
  current?: Immutable<Metric>;
};

const Icons = {
  toggle: ToggleRight,
  list: ListPlus,
  gauge: Gauge,
  scan: LucideScan,
  down: TrendingDown,
  timer: Timer,
};

export const Performance = () => {
  const [metrics] = useImmutable([
    {
      name: 'toggle',
      icon: 'toggle',
      label: 'Toggling Action',
      description: 'Rapidly toggle an item 25 times while displaying 103 items',
      metrics: [
        {
          name: 'render',
          icon: 'gauge',
          label: 'Render Time',
          description:
            'Measures the time spent by React rendering UI components during the benchmark action, reflecting rendering efficiency.',
          data: {
            classic: 119,
            anchor: 0.4,
            ratio: 253,
          },
          unit: 'ms',
        },
        {
          name: 'ttf',
          icon: 'timer',
          label: 'Time To Finish',
          description:
            'Measures the overall duration from start to finish of the benchmark action, reflecting user-perceived performance.',
          data: {
            classic: 5477,
            anchor: 384,
            ratio: 32.3,
          },
          unit: 'ms',
        },
        {
          name: 'frame',
          icon: 'scan',
          label: 'Frame Rate',
          description:
            'Measures the number of frames rendered per second, reflecting the smoothness and responsiveness of the UI.',
          data: {
            classic: 16.8,
            anchor: 182.4,
            ratio: 7.1,
          },
          unit: 'fps',
        },
        {
          name: 'degraded',
          icon: 'down',
          label: 'Degraded Performance',
          description: 'Measures the peak time spent by React rendering UI components during the benchmark action.',
          data: {
            classic: 380,
            anchor: 1,
            ratio: 430,
          },
          unit: 'ms',
        },
      ],
    },
    {
      name: 'add',
      icon: 'list',
      label: 'Item Addition',
      description: 'Rapidly adds 1000 items to the list.',
      metrics: [
        {
          name: 'degraded',
          icon: 'down',
          label: 'Late Render Time',
          description:
            'Measures the peak time spent by React rendering UI components during the benchmark action,' +
            ' reflecting scaling performance.',
          data: {
            classic: 111.6,
            anchor: 1.2,
            ratio: 142.3,
          },
          unit: 'ms',
        },
        {
          name: 'render',
          icon: 'gauge',
          label: 'Start Render Time',
          description:
            'Measures the time spent by React rendering UI components during the start action, reflecting raw' +
            ' performance.',
          data: {
            classic: 1.7,
            anchor: 1,
            ratio: 1.7,
          },
          unit: 'ms',
        },
        {
          name: 'ttf',
          icon: 'timer',
          label: 'Time To Finish',
          description:
            'Measures the overall duration from start to finish of the benchmark action, reflecting user-perceived performance.',
          data: {
            classic: 178978,
            anchor: 17482,
            ratio: 5.5,
          },
          unit: 'ms',
        },
        {
          name: 'frame',
          icon: 'scan',
          label: 'Frame Rate',
          description:
            'Measures the number of frames rendered per second, reflecting the smoothness and responsiveness of the UI.',
          data: {
            classic: 16.8,
            anchor: 100.8,
            ratio: 3.2,
          },
          unit: 'fps',
        },
      ],
    },
  ]);
  const [display] = useAnchor({
    metrics: metrics[0]?.metrics,
    current: metrics[0]?.metrics?.[0],
  });

  const NavButtons = observe(() => {
    const current = display.metrics;
    const handleClick = (item: (typeof metrics)[0]) => {
      display.current = item.metrics?.[0];
      display.metrics = item.metrics;
    };

    return (
      <div className="mt-8 flex justify-center gap-4 md:gap-6">
        {metrics.map((button) => (
          <button
            key={button.name}
            onClick={() => handleClick(button)}
            className={[
              'cursor-pointer',
              'flex',
              'flex-1',
              'items-center',
              'px-4 md:px-6',
              'py-3 md:py-3',
              'bg-slate-900',
              'hover:bg-blue-500',
              'text-slate-200',
              'rounded-md',
              'font-medium',
              'btn-secondary',
              'transition-colors',
              current === button.metrics ? 'outline-4 outline-blue-500/50' : 'outline-4 outline-transparent',
            ].join(' ')}>
            {(() => {
              const IconComponent = Icons[button.icon as keyof typeof Icons];
              return IconComponent ? <IconComponent className="w-5 h-5 mr-2" /> : null;
            })()}
            {button.label}
          </button>
        ))}
      </div>
    );
  });

  return (
    <Section id="metrics" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 md:min-h-screen">
      <div className="text-center mb-12">
        <SectionTitle>Performance Metrics</SectionTitle>
        <SectionDescription className="text-center mt-4 max-w-4xl mx-auto">
          Dive into the data by selecting a benchmark scenario below. All charts will dynamically update to show a clear
          performance comparison between Classic and Anchor architectures.
        </SectionDescription>
        <NavButtons />
      </div>
      {display.current && <PerformanceGroup display={display} />}
      <p className="text-center mt-8 max-w-4xl mx-auto italic text-slate-400 text-sm">
        Benchmark data taken by adding {BENCHMARK_SIZE.toLocaleString()} todo items and rapidly toggle an item
        {BENCHMARK_TOGGLE_SIZE.toLocaleString()} times while displaying {BENCHMARK_SIZE.toLocaleString()} items.
      </p>
      <MainCTA className="mt-10 md:mt-20" />
    </Section>
  );
};

const PerformanceGroup: FC<{ display: MetricDisplay }> = observable(({ display }) => {
  if (!display.metrics) return;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="w-full flex flex-col gap-3">
          {display.metrics.map((item) => (
            <div
              key={item.name}
              onClick={() => (display.current = item)}
              className={`flex gap-4 items-start cursor-pointer card px-8 py-6 outline-4 hover:outline-blue-200/10 transition-all ${
                display.current === item ? ' outline-blue-500/50' : 'outline-transparent'
              }`}>
              {(() => {
                const IconComponent = Icons[item.icon as keyof typeof Icons];
                return IconComponent ? <IconComponent className="w-10 h-10 mt-1" /> : null;
              })()}
              <div className="flex flex-col gap-2 flex-1">
                <h3 className="text-lg font-light">{item.label}</h3>
                <p className="text-slate-400 text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="card flex-1 p-8 flex flex-col justify-end gap-8">
          <PerformanceChart data={display.current?.data} unit={display.current?.unit} />
        </div>
      </div>
    </>
  );
});

const PerformanceChart: FC<{ data?: Record<string, number>; unit?: string }> = ({ data, unit }) => {
  if (!data) return;

  return (
    <>
      <div className="flex flex-col gap-4 flex-1">
        <span className="card p-6 w-full text-center text-4xl">
          ~{(data.classic > data.anchor ? data.classic / data.anchor : data.anchor / data.classic).toFixed(2)}x
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 flex-1 gap-4">
          <div className="card flex flex-col gap-2 flex-1 justify-center items-center">
            <p>
              <span className="text-3xl">{data.classic.toLocaleString()}</span>
              <span className="text-sm">{unit ?? ''}</span>
            </p>
          </div>
          <div className="card flex flex-col gap-2 flex-1 justify-center items-center">
            <p>
              <span className="text-3xl">{data.anchor.toLocaleString()}</span>
              <span className="text-sm">{unit ?? ''}</span>
            </p>
          </div>
        </div>
      </div>
      <Bar
        data={{
          labels: ['Classic', 'Anchor'],
          datasets: [
            {
              label: 'Classic vs Anchor',
              data: [data.classic, data.anchor],
              backgroundColor: ['#46a3e5', '#eb8825'],
              borderColor: 'red',
              borderRadius: 4,
            },
          ],
        }}
        options={{
          responsive: true,
          scales: {
            y: {
              ticks: {
                color: '#ffffff1f',
              },
              grid: {
                color: '#ffffff1f',
              },
            },
            x: {
              ticks: {
                color: '#ffffff',
              },
              grid: {
                color: '#ffffff1f',
              },
            },
          },
          plugins: {
            legend: {
              display: false,
              labels: {
                color: '#ffffff3f',
              },
            },
          },
        }}
        className="h-full w-full"
      />
    </>
  );
};
