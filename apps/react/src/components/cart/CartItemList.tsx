import { type FC, memo, useRef } from 'react';
import { CartItem, type CartItemType } from './CartItem.js';
import { useDerived } from '@anchor/react';
import { flashNode } from '@lib/stats.js';

export const CartItemList: FC<{ items: CartItemType[] }> = memo(({ items }) => {
  const ref = useRef(null);
  const cartItems = useDerived(() => {
    return [...items].sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  });

  flashNode(ref.current);

  return (
    <div ref={ref} className="p-4 space-y-4">
      {cartItems.map((item) => (
        <CartItem key={item.id} {...{ item, items }} />
      ))}
    </div>
  );
});
