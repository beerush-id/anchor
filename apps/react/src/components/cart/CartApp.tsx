import { type FC, useRef } from 'react';
import { useAnchor } from '@anchor/react';
import { CartSummary } from './CartSummary.js';
import { CartItemList } from './CartItemList.js';
import { flashNode } from '@lib/stats.js';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';

export const CartApp: FC = () => {
  const ref = useRef(null);
  const [cartItems] = useAnchor([
    { id: '1', name: 'Quantum Keyboard', price: 199, quantity: 0 },
    { id: '2', name: 'Flux Capacitor Mouse', price: 89, quantity: 0 },
    { id: '3', name: 'Temporal Mousepad', price: 25, quantity: 0 },
    { id: '4', name: 'Hat', price: 49, quantity: 0 },
    { id: '5', name: 'Pants', price: 69, quantity: 0 },
  ]);

  flashNode(ref.current);

  return (
    <div ref={ref} className="mt-12 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="col-span-2">
        <CardHeader>Your Cart</CardHeader>
        <CartItemList items={cartItems} />
      </Card>
      <CartSummary items={cartItems} />
    </div>
  );
};
