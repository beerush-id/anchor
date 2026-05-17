import { mutable } from '@anchorlib/core';
import { IRPC_FILE_STATUS } from './enum.js';
import { IRPC_STORE } from './store.js';

export type IRPCFileStatus = (typeof IRPC_FILE_STATUS)[keyof typeof IRPC_FILE_STATUS];

export type IRPCFileState = {
  error?: Error;
  status: IRPCFileStatus;
  downloaded: number;
};

export type IRPCFileMeta = {
  size: number;
  type: string;
  name?: string;
};

export type IRPCFilePipe = (chunk: Uint8Array) => void;
export type IRPCFileUnpipe = () => void;

export class IRPCFile {
  protected state = mutable<IRPCFileState>({
    status: IRPC_FILE_STATUS.PENDING,
    downloaded: 0,
  });

  public get status() {
    return this.state.status;
  }

  public set status(status: IRPCFileStatus) {
    this.state.status = status;
  }

  public get error() {
    return this.state.error;
  }

  public get downloaded() {
    return this.state.downloaded;
  }

  public get success() {
    return this.status === IRPC_FILE_STATUS.SUCCESS;
  }

  public get completed() {
    return ([IRPC_FILE_STATUS.SUCCESS, IRPC_FILE_STATUS.ERROR] as IRPCFileStatus[]).includes(this.status);
  }

  public data: Blob;

  constructor(
    public meta: IRPCFileMeta,
    data?: Blob
  ) {
    this.data = data ?? new Blob([], { type: meta.type });
    this.state.status = data ? IRPC_FILE_STATUS.SUCCESS : IRPC_FILE_STATUS.PENDING;
  }
}

export class IRPCFileStream extends IRPCFile {
  private pipes = new Set<IRPCFilePipe>();
  private buffer: Uint8Array | undefined;

  constructor(meta: IRPCFileMeta) {
    super(meta);

    this.data = new Blob([], { type: meta.type });
    this.buffer = new Uint8Array(meta.size);
  }

  public write(chunk: Uint8Array) {
    if (this.completed) return null;

    try {
      const remaining = this.meta.size - this.state.downloaded;
      const chunkSize = Math.min(chunk.byteLength, remaining);
      const needSlice = chunkSize < chunk.byteLength;
      const nextChunk = needSlice ? chunk.slice(0, chunkSize) : chunk;
      const leftovers = needSlice ? chunk.slice(chunkSize) : null;

      this.buffer?.set(nextChunk, this.state.downloaded);
      this.state.downloaded += chunkSize;

      this.pipes.forEach((fn) => {
        try {
          fn(nextChunk);
        } catch (error) {
          IRPC_STORE.error(error as Error, [this.meta]);
        }
      });

      if (this.downloaded >= this.meta.size) {
        this.data = new Blob([this.buffer as BlobPart], { type: this.meta.type });
        this.buffer = undefined;
        this.state.status = IRPC_FILE_STATUS.SUCCESS;
      }

      return leftovers;
    } catch (error) {
      IRPC_STORE.error(error as Error, [this.meta]);
      this.state.error = error as Error;
      this.state.status = IRPC_FILE_STATUS.ERROR;
    }

    return null;
  }

  public pipe(fn: IRPCFilePipe): IRPCFileUnpipe {
    this.pipes.add(fn);

    if (this.state.downloaded > 0) {
      try {
        fn(this.buffer?.subarray(0, this.state.downloaded) as Uint8Array);
      } catch (error) {
        IRPC_STORE.error(error as Error, [this.meta]);
      }
    }

    return () => this.pipes.delete(fn);
  }
}
