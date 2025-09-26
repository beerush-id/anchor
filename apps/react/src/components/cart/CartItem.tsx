import { type FC, type KeyboardEventHandler, memo, useRef } from 'react';
import { Button } from '../Button.js';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { debugRender, useInherit } from '@anchorlib/react';
import { Input } from '@anchorlib/react/components';
import { observer } from '@anchorlib/react/view';
import { setDebugger } from '@anchorlib/core';
import { isMobile } from '@lib/nav.js';

export type CartItemType = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export const CartItem: FC<{ items: CartItemType[]; item: CartItemType }> = memo(({ items, item }) => {
  const ref = useRef<HTMLDivElement>(null);
  setDebugger(console.log);
  const form = useInherit(item, ['name']);
  setDebugger(undefined);

  debugRender(ref);

  const handleNameChange: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter') {
      item.name = form.name;
    }
  };

  const handleBlur = () => {
    if (form.name !== item.name) {
      form.name = item.name;
    }
  };

  return (
    <div ref={ref} className="flex items-center justify-between">
      <div>
        <p className="font-semibold text-slate-200">
          {!isMobile() && (
            <Input
              type="text"
              bind={form}
              name="name"
              onKeyUp={handleNameChange}
              onBlur={handleBlur}
              className="outline-none"
            />
          )}
          {isMobile() && <span>{item.name}</span>}
        </p>
        <span className="text-sm text-slate-400">${item.price.toFixed(2)}</span>
      </div>
      <CartItemControl items={items} item={item} />
    </div>
  );
});

export const CartItemControl: FC<{ item: CartItemType; items: CartItemType[] }> = observer(({ item, items }) => {
  const ref = useRef(null);
  debugRender(ref);

  const handleRemove = () => {
    const index = items.indexOf(item);
    if (index >= 0) {
      items.splice(index, 1);
    }
  };

  return (
    <div ref={ref} className="flex items-center gap-2">
      <Button onClick={() => (item.quantity = Math.max(0, item.quantity - 1))} className="btn-icon">
        <Minus size={14} />
      </Button>
      <span className="font-mono w-8 text-center">{item.quantity}</span>
      <Button onClick={() => item.quantity++} className="btn-icon">
        <Plus size={14} />
      </Button>
      <Button onClick={() => handleRemove()} className="ml-4 btn-icon">
        <Trash2 size={14} />
      </Button>
    </div>
  );
});
