import React from 'react';
import { RenderStatItem, type RenderStatProp } from './RenderStatItem.js';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';

export const RenderStats: React.FC<{ stats: RenderStatProp[] }> = ({ stats }) => {
  return (
    <Card>
      <CardHeader>
        <h3>Render Counter</h3>
      </CardHeader>
      <div className="flex flex-col gap-4 py-4">
        {stats.map((stat) => (
          <RenderStatItem key={stat.name} stat={stat} />
        ))}
      </div>
    </Card>
  );
};
