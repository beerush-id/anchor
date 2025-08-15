import { type FC, memo } from 'react';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';
import type { CartItemType } from './CartItem.js';
import { useDerived } from '@anchor/react';
import { Button } from '../Button.js';

export const CartSummary: FC<{ items: CartItemType[] }> = memo(({ items }) => {
  const [summary] = useDerived(items, (snapshot) => {
    const subtotal = snapshot.reduce((acc, item) => acc + item.price * item.quantity, 0);

    return {
      subtotal,
      tax: subtotal * 0.08,
      total: subtotal + subtotal * 0.08,
    };
  });

  return (
    <Card>
      <CardHeader>Order Summary</CardHeader>
      <div className="p-6 space-y-3">
        <div className="flex justify-between">
          <span className="text-slate-400">Subtotal</span>
          <span className="font-mono">${summary.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Tax (8%)</span>
          <span className="font-mono">${summary.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between pt-3 border-t border-slate-700 font-bold text-lg">
          <span className="text-slate-200">Total</span>
          <span className="font-mono text-brand-orange">${summary.total.toFixed(2)}</span>
        </div>
      </div>
      <div className="flex-1"></div>
      <div className="flex items-center p-4 border-t border-t-slate-700">
        <span className="flex-1"></span>
        <Button disabled={!summary.total}>Checkout</Button>
      </div>
    </Card>
  );
});
