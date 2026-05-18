import { isArray, isObject, uuid } from '@anchorlib/core';
import { IRPCFile, type IRPCFileMeta, IRPCFileStream } from './file.js';
import type { IRPCData } from './types.js';

export const IRPC_FILE_IDENTIFIER = 'IRPC_PACKET_FILE' as const;

export type IRPCFilePointer = {
  id: string;
  type: typeof IRPC_FILE_IDENTIFIER;
  meta: IRPCFileMeta;
};

export type IRPCFileQueue = {
  file: IRPCFilePointer;
  data: Blob;
};

export type IRPCPacketJson = {
  data: IRPCData;
  files: IRPCFilePointer[];
};

export type IRPCPacketQueues = {
  json: IRPCPacketJson;
  queues: IRPCFileQueue[];
};

export type PacketStream = {
  data: IRPCData;
  files: Map<string, IRPCFileStream>;
  resolved: number;
};

export function isFilePointer(data: IRPCData) {
  return isObject(data) && data.type === IRPC_FILE_IDENTIFIER;
}

export function encode(data: IRPCData) {
  const json = { data, files: [] } as IRPCPacketJson;
  const packet = { json, queues: [] } as IRPCPacketQueues;

  if (data instanceof IRPCFile) {
    const { pointer, queue } = createPointer(data);

    json.data = pointer as any; // Must override the root pointer!
    json.files.push(pointer);
    packet.queues.push(queue);
  } else if (isObject(data) || isArray(data)) {
    encodePointers(data, json.files, packet.queues);
  }

  return packet;
}

export function decode(packet: IRPCPacketJson) {
  const files = packet.files.map((file) => {
    return [file.id, new IRPCFileStream(file.meta)] as [string, IRPCFileStream];
  });

  const stream: PacketStream = {
    data: packet.data,
    files: new Map<string, IRPCFileStream>(files),
    resolved: 0,
  };

  if (isFilePointer(packet.data)) {
    const { id } = packet.data as never as IRPCFilePointer;
    stream.data = stream.files.get(id) as IRPCFileStream;
  } else if (isObject(packet.data) || isArray(packet.data)) {
    decodePointers(packet.data, stream.files);
  }

  return stream;
}

function createPointer(file: IRPCFile) {
  const pointer: IRPCFilePointer = { id: uuid(), meta: file.meta, type: IRPC_FILE_IDENTIFIER };
  const queue: IRPCFileQueue = { file: pointer, data: file.data };
  return { pointer, queue };
}

/**
 * Replace all IRPCFile inside an object with IRPCPacketFile.
 * @param {Record<string, unknown> | unknown[]} data - The object to encode.
 * @param {IRPCFilePointer[]} pointers - The array of IRPCPacketFile to replace.
 * @param {IRPCFileQueue[]} queues - The array of IRPCPacketFileQueue to replace.
 */
function encodePointers(
  data: Record<string, unknown> | unknown[],
  pointers: IRPCFilePointer[],
  queues: IRPCFileQueue[]
) {
  if (isArray(data)) {
    data.forEach((item, i) => {
      if (item instanceof IRPCFile) {
        const { pointer, queue } = createPointer(item);

        data[i] = pointer;
        pointers.push(pointer);
        queues.push(queue);
      } else if (isObject(item) || isArray(item)) {
        encodePointers(item, pointers, queues);
      }
    });
  } else if (isObject(data)) {
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof IRPCFile) {
        const { pointer, queue } = createPointer(value);

        data[key] = pointer;
        pointers.push(pointer);
        queues.push(queue);
      } else if (isObject(value) || isArray(value)) {
        encodePointers(value, pointers, queues);
      }
    });
  }
}

/**
 * Replace all IRPCPacketFile inside an object with IRPCFileStream.
 * @param data - The object to decode.
 * @param files - The map of IRPCFileStream to replace.
 */
function decodePointers(data: Record<string, unknown> | unknown[], files: Map<string, IRPCFileStream>) {
  if (isArray(data)) {
    data.forEach((item, i) => {
      if (isFilePointer(item as IRPCData)) {
        const { id } = item as never as IRPCFilePointer;
        data[i] = files.get(id) as IRPCFileStream;
      } else if (isObject(item) || isArray(item)) {
        decodePointers(item, files);
      }
    });
  } else if (isObject(data)) {
    Object.entries(data).forEach(([key, value]) => {
      if (isFilePointer(value as IRPCData)) {
        const { id } = value as never as IRPCFilePointer;
        data[key] = files.get(id) as IRPCFileStream;
      } else if (isObject(value) || isArray(value)) {
        decodePointers(value, files);
      }
    });
  }
}
