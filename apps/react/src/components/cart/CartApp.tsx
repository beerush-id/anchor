import { type FC, useRef } from 'react';
import { useArray } from '@anchor/react';
import { CartSummary } from './CartSummary.js';
import { CartItemList } from './CartItemList.js';
import { flashNode } from '../stats/stats.js';

export const CartApp: FC = () => {
  const ref = useRef(null);
  const [cartItems] = useArray(
    [
      { id: '1', name: 'Quantum Keyboard', price: 199, quantity: 0 },
      { id: '2', name: 'Flux Capacitor Mouse', price: 89, quantity: 0 },
      { id: '3', name: 'Temporal Mousepad', price: 25, quantity: 0 },
      { id: '4', name: 'Hat', price: 49, quantity: 0 },
      { id: '5', name: 'Pants', price: 69, quantity: 0 },
    ],
    []
  );

  flashNode(ref.current);

  return (
    <div ref={ref} className="mt-12 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
      <CartItemList items={cartItems} />
      <CartSummary items={cartItems} />
    </div>
  );
};
