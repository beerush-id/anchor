import { type FC, useRef } from 'react';
import { CartItem, type CartItemType } from './CartItem.js';
import { debugRender, useObserver } from '@anchorlib/react-classic';

export const CartItemList: FC<{ items: CartItemType[] }> = ({ items }) => {
  const ref = useRef(null);
  const cartItems = useObserver(() => {
    return [...items].sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  });

  debugRender(ref);

  return (
    <div ref={ref} className="p-4 space-y-4">
      {cartItems.map((item) => (
        <CartItem key={item.id} {...{ item, items }} />
      ))}
    </div>
  );
};
