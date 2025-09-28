import type { FC } from 'react';
import { RenderStatItem, type RenderStatProp } from './RenderStatItem';
import { Card, CardHeader } from '@anchorlib/react-kit/components';

export const RenderStats: FC<{ stats: RenderStatProp[] }> = ({ stats }) => {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-center w-full">Render Counter</h3>
      </CardHeader>
      <div className="flex gap-4 p-4">
        {stats.map((stat) => (
          <RenderStatItem key={stat.name} stat={stat} />
        ))}
      </div>
    </Card>
  );
};
