import { type FC, useMemo } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  type ChartData,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { TimeMetric } from '@utils/benchmark';
import { Card } from '@anchorlib/react-kit/components';
import { classx } from '@anchorlib/react-kit/utils';
import type { TodoRenderStats } from '@utils/todo.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export type BenchmarkReportProps = {
  stats: TodoRenderStats;
  metrics: TimeMetric[];
  className?: string;
};

export const BenchmarkReport: FC<BenchmarkReportProps> = ({ metrics, stats, className }) => {
  const chartData: ChartData<'line'> = useMemo(() => {
    return {
      labels: metrics.map((m) => m.index.toString()),
      datasets: [
        {
          label: 'Item Render Duration (ms)',
          data: metrics.map((m) => m.renderDuration),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          tension: 0.1,
        },
      ],
    };
  }, [metrics]);
  const statList = Object.entries(stats);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Benchmark Performance Report',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Time (milliseconds)',
        },
      },
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Iteration (times)',
        },
      },
    },
  };

  return (
    <Card className={classx('p-4', className)}>
      <Line data={chartData} options={options} />
      <div className="grid grid-cols-4 mt-4">
        {statList.map(([key, value]) => (
          <div key={key} className="flex flex-col items-center px-4 text-center flex-1">
            <p>
              <span className="font-semibold">{value.toLocaleString()}</span>
              <span className="opacity-75 text-xs">ms</span>
            </p>
            <span className="text-slate-500 flex-1 text-xs font-medium">{key}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
