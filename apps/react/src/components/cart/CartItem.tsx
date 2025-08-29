import { type FC, memo, useRef } from 'react';
import { Button } from '../Button.js';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { observed } from '@anchor/react';
import { flashNode } from '@lib/stats.js';

export type CartItemType = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export const CartItem: FC<{ items: CartItemType[]; item: CartItemType }> = memo(({ items, item }) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold">{item.name}</p>
        <span className="text-sm text-slate-400">${item.price.toFixed(2)}</span>
      </div>
      <CartItemControl {...{ items, item }} />
    </div>
  );
});

export const CartItemControl: FC<{ item: CartItemType; items: CartItemType[] }> = observed(({ item, items }) => {
  const ref = useRef(null);
  flashNode(ref.current);

  const handleRemove = () => {
    const index = items.indexOf(item);
    if (index >= 0) {
      items.splice(index, 1);
    }
  };

  return (
    <div ref={ref} className="flex items-center gap-2">
      <Button onClick={() => (item.quantity = Math.max(0, item.quantity - 1))} className="p-2">
        <Minus size={14} />
      </Button>
      <span className="font-mono w-8 text-center">{item.quantity}</span>
      <Button onClick={() => item.quantity++} className="p-2">
        <Plus size={14} />
      </Button>
      <Button onClick={() => handleRemove()} className="p-2 ml-4 text-red-400 hover:bg-red-900/50">
        <Trash2 size={14} />
      </Button>
    </div>
  );
});
