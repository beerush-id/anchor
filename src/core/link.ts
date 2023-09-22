import type { Init, State, Subscriber } from '../_anchor.js';
import { merge, NestedPath, NestedPathValue, read, write } from '@beerush/utils';

export class LinkRoom<T extends Init> {
  public subscribes: Subscriber<T>[] = [];

  constructor(public state: State<T>) {}

  public join(receive: Subscriber<T>) {
    this.subscribes.push(receive);

    return () => {
      const index = this.subscribes.indexOf(receive);

      if (index > -1) {
        this.subscribes.splice(index, 1);
      }
    };
  }

  public publish(value: Partial<T>) {
    merge(this.state, value);
  }

  public set(path: NestedPath<T>, value: NestedPathValue<T, NestedPath<T>>) {
    write<T>(this.state as never, path, value as never);
  }

  public get(path: NestedPath<T>): NestedPathValue<T, NestedPath<T>> {
    return read<T>(this.state as never, path);
  }
}

export class Link {
  public rooms: Map<string, State<unknown>> = new Map();

  public join<T extends Init>(name: string, init?: State<T>) {
    const room: LinkRoom<T> = this.rooms.get(name) as never;
    return room;
  }
}
