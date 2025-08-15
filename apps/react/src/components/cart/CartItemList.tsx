import { type FC, memo } from 'react';
import { CartItem, type CartItemType } from './CartItem.js';
import { useDerived } from '@anchor/react';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';
import { ARRAY_MUTATIONS } from '@anchor/core';

export const CartItemList: FC<{ items: CartItemType[] }> = memo(({ items }) => {
  const [cartItems] = useDerived(items, () => {
    return [...items].sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  }, [...ARRAY_MUTATIONS]);

  return (
    <Card className="col-span-2">
      <CardHeader>Your Cart</CardHeader>
      <div className="p-4 space-y-4">
        {cartItems.map((item) => (
          <CartItem key={item.id} {...{ item, items }} />
        ))}
      </div>
    </Card>
  );
});
