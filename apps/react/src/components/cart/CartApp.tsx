import { type FC, type FormEventHandler, useRef } from 'react';
import { anchor, shortId } from '@anchor/core';
import { debugRender, useAnchor, useHistory } from '@anchor/react';
import { CartSummary } from './CartSummary.js';
import { CartItemList } from './CartItemList.js';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';
import type { CartItemType } from './CartItem.js';
import { Redo, ShoppingCart, Undo } from 'lucide-react';
import { Tooltip } from '../Tooltip.js';
import { Input, observe } from '@anchor/react/components';
import { Button, IconButton } from '../Button.js';
import { isMobile } from '@lib/nav.js';

export const CartApp: FC = () => {
  const ref = useRef(null);
  const [cartItems] = useAnchor([
    { id: '1', name: 'T-Shirt', price: 33, quantity: 0 },
    { id: '4', name: 'Hat', price: 49, quantity: 0 },
    { id: '5', name: 'Pants', price: 69, quantity: 0 },
  ]);

  debugRender(ref);

  const Stats = observe(function Stats() {
    return <span className="text-sm text-slate-300">{cartItems.length} Items</span>;
  });

  return (
    <div ref={ref} className="mt-12 w-full grid grid-cols-1 md:grid-cols-3 gap-8">
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center flex-1">
            <ShoppingCart className="w-4 h-4 mr-2" />
            <h3 className="flex-1 font-semibold text-slate-200">Your Cart</h3>
            <Stats />
          </div>
          <CartHistory items={cartItems} />
        </CardHeader>
        <CartItemList items={cartItems} />
        <CartForm items={cartItems} />
      </Card>
      <CartSummary items={cartItems} />
    </div>
  );
};

const CartForm: FC<{ items: CartItemType[] }> = ({ items }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [formData] = useAnchor({ name: '', price: 0, quantity: 0 });

  if (isMobile()) return;

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    items.push({
      id: shortId(),
      ...formData,
    });

    anchor.assign(formData, { name: '', price: 0, quantity: 0 });
    console.log('formData', formData);
    nameInputRef.current?.focus();
  };

  debugRender(formRef);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-4 flex items-end p-4 gap-4 border-t border-t-slate-700">
      <label className="flex flex-col flex-1 gap-2">
        <span className="text-xs text-slate-400">Item name</span>
        <Input ref={nameInputRef} bind={formData} name="name" placeholder="Name" className="anchor-input" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-xs text-slate-400">Item price</span>
        <Input min="0" type="number" bind={formData} name="price" placeholder="Price" className="w-20 anchor-input" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-xs text-slate-400">Qty</span>
        <Input min="0" type="number" bind={formData} name="quantity" placeholder="Qty" className="w-20 anchor-input" />
      </label>
      <Button className="btn-alternate" type="submit">
        Add Item
      </Button>
    </form>
  );
};

const CartHistory: FC<{ items: CartItemType[] }> = ({ items }) => {
  const history = useHistory(items);

  return (
    <div className="flex items-center gap-4 pr-2">
      <IconButton disabled={!history.canBackward} onClick={history.backward}>
        <Undo size={20} />
        <Tooltip>Undo ({history.backwardList.length})</Tooltip>
      </IconButton>
      <IconButton disabled={!history.canForward} onClick={history.forward}>
        <Redo size={20} />
        <Tooltip>Redo ({history.forwardList.length})</Tooltip>
      </IconButton>
    </div>
  );
};
