import { type Readable, type Writable, writable } from '../core/index.js';
import { isArray, isObject, logger } from '../utils/index.js';

export type ChunkType = string | number | boolean | null | Record<string, unknown> | ChunkType[];

export enum StreamStatus {
  PENDING = 0,
  RUNNING = 1,
  FINISH = 200,
  ERROR = 500,
}

export enum StreamStatusText {
  PENDING = 'Pending',
  RUNNING = 'Running',
  FINISH = 'Finished',
  ERROR = 'Errored',
}

export enum StreamProgress {
  START = 0,
  FINISH = 100,
}

export type StreamTimings = {
  remoteStart?: number;
  localStart?: number;
  remoteEnd?: number;
  localEnd?: number;
  remoteDuration?: number;
  localDuration?: number;
  latency?: number;
};

export type StreamError = {
  message: string;
} & Record<string, unknown>;

export type StreamChunk<T> = {
  status: StreamStatus | number;
  data: T;
  error?: StreamError;
  statusText?: string;
  progress?: number;
  timings: StreamTimings;
};

export type StreamWriter<T> = (
  chunk: T,
  progress?: number,
  status?: StreamStatus | number,
  statusText?: string
) => Promise<void>;
export type StreamBreaker = (error: Error, status?: number, statusText?: string) => void;
export type StreamFinalizer<T> = (chunk?: T, progress?: number, status?: number, statusText?: string) => Promise<void>;
export type StreamEmitter<T> = (write: StreamWriter<T>, done: StreamFinalizer<T>, reject: StreamBreaker) => void;

export enum ChunkToken {
  BEGIN = '---BEGIN-STREAM-CHUNK---',
  END = '---END-STREAM-CHUNK---',
}

const encodeChunk = <T>(chunk: StreamChunk<T>) => {
  const jsonChunk = JSON.stringify(chunk);
  const tokenizedChunk = `${ChunkToken.BEGIN}\n${jsonChunk}\n${ChunkToken.END}`;

  return new TextEncoder().encode(tokenizedChunk);
};

const decodeChunk = (buffer: AllowSharedBufferSource, queue?: string) => {
  const tokenizedChunk = `${queue ?? ''}${new TextDecoder().decode(buffer)}`;

  if (!tokenizedChunk.startsWith(ChunkToken.BEGIN) || !tokenizedChunk.endsWith(ChunkToken.END)) {
    return [null, tokenizedChunk];
  }

  const jsonChunk = tokenizedChunk.slice(ChunkToken.BEGIN.length, tokenizedChunk.length - ChunkToken.END.length);
  return [JSON.parse(jsonChunk), tokenizedChunk];
};

export function writeStream<T extends ChunkType>(handle: StreamEmitter<T>) {
  const { readable, writable } = new TransformStream();

  const writer = writable.getWriter();
  const remoteStart = Date.now();

  const write: StreamWriter<T> = async (
    chunk,
    progress = StreamProgress.START,
    status = StreamStatus.RUNNING,
    statusText = StreamStatusText.RUNNING
  ) => {
    const payload: StreamChunk<T> = { status, data: chunk, progress, statusText, timings: { remoteStart } };
    const encodedChunk = encodeChunk(payload);

    await writer.write(encodedChunk);
  };

  const done: StreamFinalizer<T> = async (
    chunk,
    progress = StreamProgress.FINISH,
    status = StreamStatus.FINISH,
    statusText = StreamStatusText.FINISH
  ) => {
    const remoteEnd = Date.now();

    if (chunk) {
      const payload: StreamChunk<T> = {
        status,
        data: chunk,
        progress,
        statusText,
        timings: { remoteStart, remoteEnd },
      };
      const encodedChunk = encodeChunk(payload);

      await writer.write(encodedChunk);
    }

    await writer.close();
  };

  const reject: StreamBreaker = async (error, status = StreamStatus.ERROR, statusText = StreamStatusText.ERROR) => {
    logger.error(error);

    const remoteEnd = Date.now();
    const payload: StreamChunk<T> = {
      status,
      statusText,
      error: { message: error.message },
      timings: { remoteStart, remoteEnd },
    } as never;
    const encodedChunk = encodeChunk(payload);

    await writer.write(encodedChunk);
    await writer.close();
  };

  handle(write, done, reject);

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

type StreamParser<T> = (
  reader: ReadableStreamDefaultReader,
  callback?: ChunkCallback<T>
) => Promise<Readable<StreamChunk<T>>>;
export type StreamReader<T> = (response: Response, callback?: ChunkCallback<T>) => Promise<Readable<StreamChunk<T>>>;
export type StreamFetcher<T> = (
  url: string | URL | Request,
  options?: RequestInit
) => Promise<Readable<StreamChunk<T>>>;
export type ChunkTransformer<T> = (chunk: T, current: T) => T | Promise<T>;
export type ChunkCallback<T> = (chunk: T) => void | Promise<void>;

export function readStream<T extends ChunkType>(
  init: T,
  transform?: ChunkTransformer<T>
): [Readable<StreamChunk<T>>, StreamReader<T>, StreamFetcher<T>] {
  const [stream] = writable<StreamChunk<T>>({
    status: StreamStatus.PENDING,
    statusText: StreamStatusText.PENDING,
    data: init,
    progress: StreamProgress.START,
    timings: {},
  });

  const finish = (progress = stream.progress, status = stream.status, statusText = stream.statusText) => {
    const timings = { ...stream.timings, localEnd: Date.now() };
    const remoteDuration = (timings.remoteEnd ?? 0) - (timings.remoteStart ?? 0);
    const localDuration = (timings.localEnd ?? 0) - (timings.localStart ?? 0);
    const latency = Math.abs(localDuration - remoteDuration);

    stream.set({
      status,
      statusText,
      progress,
      timings: {
        ...timings,
        remoteDuration,
        localDuration,
        latency,
      },
    });
  };

  let slicedTokens: string | undefined;

  const parse: StreamParser<T> = async (reader: ReadableStreamDefaultReader, callback?: ChunkCallback<T>) => {
    const { done, value } = await reader.read();

    if (done) {
      finish();
      return stream;
    }

    try {
      const [chunk, token] = decodeChunk(value, slicedTokens);

      if (!chunk) {
        slicedTokens = token;
        return parse(reader, callback);
      } else {
        slicedTokens = undefined;
      }

      if (chunk.error) {
        stream.set({
          error: chunk.error,
          status: chunk.status,
          statusText: chunk.statusText,
        });

        finish();
        return stream;
      }

      if (typeof callback === 'function') {
        callback(chunk.data);
      }

      if (typeof transform === 'function') {
        chunk.data = await transform(chunk.data, stream.data);
      }

      if (typeof chunk.data !== typeof stream.data) {
        stream.set({
          error: { message: 'Invalid data type', value: chunk.data },
          status: 400,
          statusText: StreamStatusText.ERROR,
        });

        finish();
        return stream;
      }

      let data = stream.data as T;

      if (typeof data === 'string') {
        data = `${chunk.data}${data}` as T;
      } else if (isObject(data)) {
        data = { ...data, ...chunk.data } as T;
      } else if (isArray(data)) {
        data = [...data, ...chunk.data] as T;
      } else {
        data = chunk.data as T;
      }

      stream.set({ ...chunk, data, timings: { ...stream.timings, ...chunk.timings } });

      return parse(reader, callback);
    } catch (error) {
      stream.set({
        error: { message: (error as Error).message, error },
        status: StreamStatus.ERROR,
        statusText: StreamStatusText.ERROR,
      });

      finish();
      return stream;
    }
  };

  const start: StreamReader<T> = (response: Response, callback?: ChunkCallback<T>) => {
    const reader = response.body?.getReader();

    if (typeof reader?.read !== 'function') {
      throw new Error('Invalid response body. Expected a readable stream.');
    }

    delete stream.error;

    stream.set({
      status: StreamStatus.RUNNING,
      statusText: StreamStatusText.RUNNING,
      data: init,
      progress: StreamProgress.START,
      timings: { localStart: Date.now() },
    });

    return parse(reader, callback);
  };

  const request: StreamFetcher<T> = async (url: string | URL | Request, options?: RequestInit) => {
    const response = await fetch(url, options);

    if (response.ok) {
      return start(response);
    } else {
      stream.set({
        error: { message: `${response.status} ${response.statusText}` },
        status: response.status,
        statusText: response.statusText,
      });
    }

    return stream;
  };

  return [stream, start, request];
}

export type FetchStreamOptions<T> = {
  init: T;
  payload?: RequestInit;
  transform?: ChunkTransformer<T>;
  autostart?: boolean;
};

export function fetchStream<T extends ChunkType>(url: string, options: FetchStreamOptions<T>) {
  const [stream, read] = readStream<T>(options.init, options.transform);

  const start = async (init?: RequestInit): Promise<Readable<StreamChunk<T>>> => {
    const response = await fetch(url, init ?? options.payload);

    if (response.ok) {
      return read(response);
    } else {
      (stream as Writable<StreamChunk<T>>).set({
        error: { message: `${response.status} ${response.statusText}` },
        status: response.status,
        statusText: response.statusText,
      });
    }

    return stream;
  };

  if (options?.autostart) {
    start().finally();
  }

  return [stream, start];
}
