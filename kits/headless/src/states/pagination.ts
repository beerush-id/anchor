import { anchor } from '@anchorlib/core';

export type PaginationOptions = {
  total?: number;
  limit?: number;
  current?: number;
};

export class PaginationState {
  public total: number;
  public limit: number;
  public current: number;

  public get canBackward(): boolean {
    return this.current > 1;
  }

  public get canForward(): boolean {
    return this.current < this.total;
  }

  public constructor(options?: PaginationOptions) {
    this.total = options?.total ?? 0;
    this.limit = options?.limit ?? 10;
    this.current = options?.current ?? 1;
  }

  public backward() {
    if (!this.canBackward) return;
    this.current--;
  }

  public forward() {
    if (!this.canForward) return;
    this.current++;
  }

  public jump(page: number) {
    if (page < 1 || page > this.total) return;
    this.current = page;
  }
}

export function createPagination(options?: PaginationOptions): PaginationState {
  return anchor(new PaginationState(options));
}
