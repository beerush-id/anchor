import { type FC, useRef } from 'react';
import { CartItem, type CartItemType } from './CartItem.js';
import { flashNode } from '@lib/stats.js';
import { useObserved } from '@anchor/react';

export const CartItemList: FC<{ items: CartItemType[] }> = ({ items }) => {
  const ref = useRef(null);
  const cartItems = useObserved(() => {
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
};
