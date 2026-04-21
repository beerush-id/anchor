const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Encode a file ID and binary data into a single prefixed frame.
 * Format: [4-byte ID length (uint32 BE)][ID bytes (UTF-8)][blob data]
 */
export function encodeFileFrame(id: string, data: ArrayBuffer): ArrayBuffer {
  const idBytes = encoder.encode(id);
  const frame = new Uint8Array(4 + idBytes.length + data.byteLength);
  new DataView(frame.buffer).setUint32(0, idBytes.length);
  frame.set(idBytes, 4);
  frame.set(new Uint8Array(data), 4 + idBytes.length);
  return frame.buffer;
}

/**
 * Decode a prefixed frame back into a file ID and binary data.
 */
export function decodeFileFrame(frame: ArrayBuffer): { id: string; data: Uint8Array } {
  const view = new DataView(frame);
  const idLength = view.getUint32(0);
  const id = decoder.decode(new Uint8Array(frame, 4, idLength));
  const data = new Uint8Array(frame, 4 + idLength);
  return { id, data };
}
