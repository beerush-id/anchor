import { type FC } from 'react';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';
import type { CartItemType } from './CartItem.js';
import { Button } from '../Button.js';
import { useObserver } from '@anchorlib/react-classic';
import { ReceiptIcon } from 'lucide-react';

export const CartSummary: FC<{ items: CartItemType[] }> = ({ items }) => {
  const summary = useObserver(() => {
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    return {
      subtotal,
      tax: subtotal * 0.08,
      total: subtotal + subtotal * 0.08,
    };
  });

  return (
    <Card>
      <CardHeader>
        <ReceiptIcon className="w-4 h-4 mr-2" />
        <h3 className="text-slate-200 font-semibold">Order Summary</h3>
      </CardHeader>
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
        <Button className="btn-primary" disabled={!summary.total}>
          Checkout
        </Button>
      </div>
    </Card>
  );
};
