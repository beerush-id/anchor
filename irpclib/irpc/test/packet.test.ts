import { describe, expect, it, vi } from 'vitest';
import { IRPCBlob, IRPCFile, IRPCFileStream } from '../src/file.js';
import {
  decode,
  decodeBlobs,
  encode,
  encodeBlobs,
  IRPC_BLOB_IDENTIFIER,
  IRPC_FILE_IDENTIFIER,
  isBlobPointer,
} from '../src/packet.js';

describe('IRPCPacket Transmission Encoders/Decoders', () => {
  describe('encode()', () => {
    it('should efficiently bypass standard primitive objects bypassing nested serialization', () => {
      const packetStr = encode('hello_world');
      expect(packetStr.json.data).toBe('hello_world');
      expect(packetStr.json.files).toEqual([]);
      expect(packetStr.queues).toEqual([]);
    });

    it('should correctly handle a direct root IRPCFile explicitly bypassing depth arrays', () => {
      const file = new IRPCFile({ name: 'root.bin', size: 5, type: 'application/octet-stream' }, new Blob(['hello']));

      const packet = encode(file as any); // Type hacking IRPCData

      expect(packet.json.files.length).toBe(1);
      expect(typeof packet.json.files[0].id).toBe('string');
      expect(packet.json.files[0].type).toBe(IRPC_FILE_IDENTIFIER);

      // Preserves original Blob strictly outside structured cloning ranges
      expect(packet.queues.length).toBe(1);
      expect(packet.queues[0].data).toBeInstanceOf(Blob);
      expect(packet.queues[0].data.size).toBe(5);
    });

    it('should seamlessly extract heavily nested objects securely dropping standard JSON replacements cleanly', () => {
      const file1 = new IRPCFile({ name: 'one.jpg', size: 10, type: 'image/jpg' }, new Blob());
      const file2 = new IRPCFile({ name: 'two.jpg', size: 20, type: 'image/jpg' }, new Blob());

      const payload = {
        meta: 'test_string',
        assets: [
          { avatar: file1 },
          { background: file2 },
          { static: 'data' },
          [file1], // Forces isArray(item) evaluation in encodePointers
        ],
        rawFiles: [file1],
      };

      const packet = encode(payload);

      // Verify the payload natively drops cleanly!
      expect(packet.json.data).toHaveProperty('meta', 'test_string');
      // @ts-expect-error
      expect(packet.json.data.assets[0].avatar.type).toBe(IRPC_FILE_IDENTIFIER);
      // @ts-expect-error
      expect(packet.json.data.assets[1].background.type).toBe(IRPC_FILE_IDENTIFIER);
      // @ts-expect-error
      expect(packet.json.data.assets[2].static).toBe('data');

      // Verify mapping pointers
      expect(packet.json.files.length).toBe(4);
      expect(typeof packet.json.files[3].id).toBe('string');
      expect(packet.queues.length).toBe(4);
      expect(typeof packet.queues[3].file.id).toBe('string');
      expect(packet.queues[0].data).toBeInstanceOf(Blob);
    });
  });

  describe('decode()', () => {
    it('should correctly restore and bootstrap highly nested stream pipelines utilizing pre-warm arrays', () => {
      // Mocking a serialized JSON transmission over HTTP!
      const receivedJSON = {
        data: [
          {
            test: 'string',
            deepNestedObject: { nestedString: 'hits-142' },
            deepNestedArray: [{ nestedString: 'hits-142' }],
          },
          { directFile: { type: IRPC_FILE_IDENTIFIER, id: 'uid1', meta: { size: 100 } } },
          [
            { type: IRPC_FILE_IDENTIFIER, id: 'uid1', meta: { size: 100 } },
            { standardObjectInsideArray: 'recurses' },
            [{ type: IRPC_FILE_IDENTIFIER, id: 'uid1', meta: { size: 100 } }], // Forces multidimensional array recursion branch!
          ],
        ],
        files: [{ type: IRPC_FILE_IDENTIFIER, id: 'uid1', meta: { size: 100 } }],
      };

      // @ts-expect-error
      const decodedStream = decode(receivedJSON);

      expect(decodedStream.resolved).toBe(0);

      // Verified files map instantiation completely caches and shares instances
      expect(decodedStream.files.size).toBe(1);
      const streamObj = decodedStream.files.get('uid1');
      expect(streamObj).toBeDefined();
      expect(streamObj?.meta.size).toBe(100);

      // Recursive JSON mapping proves exact object instance alignment identically references!
      // @ts-expect-error
      expect(decodedStream.data[2][0]).toBe(streamObj);
      // @ts-expect-error
      expect(decodedStream.data[1].directFile).toBe(streamObj);
    });

    it('should correctly restore a standalone root file natively capturing binary headers accurately', () => {
      const receivedJSON = {
        data: { type: IRPC_FILE_IDENTIFIER, id: 'root_str', meta: { size: 999 } },
        files: [{ type: IRPC_FILE_IDENTIFIER, id: 'root_str', meta: { size: 999 } }],
      };

      // @ts-expect-error
      const decodedStream = decode(receivedJSON);

      // The root mapping completely aligns successfully
      expect(decodedStream.files.size).toBe(1);
      expect(decodedStream.data).toBe(decodedStream.files.get('root_str'));
      // @ts-expect-error
      expect(decodedStream.data.meta.size).toBe(999);
    });
  });

  describe('IRPCBlob encoding', () => {
    it('should encode a root IRPCBlob into an IRPCBlobPointer', () => {
      const blob = new IRPCBlob('https://cdn.example.com/report.pdf', {
        type: 'application/pdf',
        size: 2048,
        name: 'report.pdf',
      });

      const packet = encode(blob as any);

      expect(packet.json.data).toMatchObject({
        type: IRPC_BLOB_IDENTIFIER,
        url: 'https://cdn.example.com/report.pdf',
        meta: { type: 'application/pdf', size: 2048, name: 'report.pdf' },
      });
      expect(packet.json.files).toEqual([]);
      expect(packet.queues).toEqual([]);
    });

    it('should encode IRPCBlob nested inside an object', () => {
      const blob = new IRPCBlob('https://cdn.example.com/avatar.jpg', { type: 'image/jpeg' });
      const payload = { user: { name: 'Alice' }, avatar: blob };

      const packet = encode(payload);

      // @ts-expect-error
      expect(packet.json.data.avatar.type).toBe(IRPC_BLOB_IDENTIFIER);
      // @ts-expect-error
      expect(packet.json.data.avatar.url).toBe('https://cdn.example.com/avatar.jpg');
      // @ts-expect-error
      expect(packet.json.data.user.name).toBe('Alice');
      expect(packet.json.files).toEqual([]);
      expect(packet.queues).toEqual([]);
    });

    it('should encode IRPCBlob nested inside an array', () => {
      const blob1 = new IRPCBlob('https://cdn.example.com/doc1.pdf');
      const blob2 = new IRPCBlob('https://cdn.example.com/doc2.pdf');
      const payload = [blob1, 'text', blob2];

      const packet = encode(payload);

      // @ts-expect-error
      expect(packet.json.data[0].type).toBe(IRPC_BLOB_IDENTIFIER);
      // @ts-expect-error
      expect(packet.json.data[0].url).toBe('https://cdn.example.com/doc1.pdf');
      // @ts-expect-error
      expect(packet.json.data[1]).toBe('text');
      // @ts-expect-error
      expect(packet.json.data[2].type).toBe(IRPC_BLOB_IDENTIFIER);
    });

    it('should encode mixed IRPCFile and IRPCBlob in the same payload', () => {
      const file = new IRPCFile({ name: 'upload.bin', size: 5, type: 'application/octet-stream' }, new Blob(['hello']));
      const blob = new IRPCBlob('https://cdn.example.com/download.bin');
      const payload = { upload: file, download: blob };

      const packet = encode(payload);

      // @ts-expect-error
      expect(packet.json.data.upload.type).toBe(IRPC_FILE_IDENTIFIER);
      // @ts-expect-error
      expect(packet.json.data.download.type).toBe(IRPC_BLOB_IDENTIFIER);
      expect(packet.json.files.length).toBe(1);
      expect(packet.queues.length).toBe(1);
    });
  });

  describe('isBlobPointer()', () => {
    it('should return true for valid blob pointer objects', () => {
      expect(isBlobPointer({ type: IRPC_BLOB_IDENTIFIER, url: 'https://example.com' } as any)).toBe(true);
    });

    it('should return false for file pointers and regular objects', () => {
      expect(isBlobPointer({ type: IRPC_FILE_IDENTIFIER, id: 'x', meta: {} } as any)).toBe(false);
      expect(isBlobPointer({ type: 'other' } as any)).toBe(false);
      expect(isBlobPointer('string' as any)).toBe(false);
    });
  });

  describe('encodeBlobs()', () => {
    it('should replace a root IRPCBlob with an IRPCBlobPointer', () => {
      const blob = new IRPCBlob('https://cdn.example.com/file.pdf', { type: 'application/pdf' });
      const result = encodeBlobs(blob) as any;

      expect(result.type).toBe(IRPC_BLOB_IDENTIFIER);
      expect(result.url).toBe('https://cdn.example.com/file.pdf');
      expect(result.meta.type).toBe('application/pdf');
    });

    it('should replace nested IRPCBlob inside an object', () => {
      const data = { report: new IRPCBlob('https://cdn.example.com/r.pdf'), name: 'test' };
      const result = encodeBlobs(data) as any;

      expect(result.report.type).toBe(IRPC_BLOB_IDENTIFIER);
      expect(result.report.url).toBe('https://cdn.example.com/r.pdf');
      expect(result.name).toBe('test');
    });

    it('should replace nested IRPCBlob inside an array', () => {
      const data = [new IRPCBlob('https://cdn.example.com/a'), 'keep'];
      const result = encodeBlobs(data) as any;

      expect(result[0].type).toBe(IRPC_BLOB_IDENTIFIER);
      expect(result[1]).toBe('keep');
    });

    it('should pass through primitives and null unchanged', () => {
      expect(encodeBlobs('hello')).toBe('hello');
      expect(encodeBlobs(42)).toBe(42);
      expect(encodeBlobs(null)).toBe(null);
      expect(encodeBlobs(undefined)).toBe(undefined);
    });
  });

  describe('decodeBlobs()', () => {
    it('should replace a root IRPCBlobPointer with an IRPCBlob and eagerly call load()', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(() => Promise.resolve(new Response(new Blob(['data']), { status: 200 })));

      const data = {
        type: IRPC_BLOB_IDENTIFIER,
        url: 'https://cdn.example.com/file.pdf',
        meta: { type: 'application/pdf' },
      };
      const result = decodeBlobs<IRPCBlob>(data);

      expect(result).toBeInstanceOf(IRPCBlob);
      expect(result.url).toBe('https://cdn.example.com/file.pdf');
      expect(fetchSpy).toHaveBeenCalledWith('https://cdn.example.com/file.pdf', {
        signal: expect.any(AbortSignal),
      });

      await result;
      fetchSpy.mockRestore();
    });

    it('should replace nested blob pointers inside objects', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(() => Promise.resolve(new Response(new Blob(), { status: 200 })));

      const data = {
        name: 'Alice',
        avatar: { type: IRPC_BLOB_IDENTIFIER, url: 'https://cdn.example.com/avatar.jpg', meta: { type: 'image/jpeg' } },
      };
      const result = decodeBlobs<typeof data>(data);

      expect(result.name).toBe('Alice');
      expect(result.avatar).toBeInstanceOf(IRPCBlob);
      expect(result.avatar.url).toBe('https://cdn.example.com/avatar.jpg');

      await result.avatar;
      fetchSpy.mockRestore();
    });

    it('should replace nested blob pointers inside arrays', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(() => Promise.resolve(new Response(new Blob(), { status: 200 })));

      const data = [
        { type: IRPC_BLOB_IDENTIFIER, url: 'https://cdn.example.com/a' },
        'keep',
        [{ type: IRPC_BLOB_IDENTIFIER, url: 'https://cdn.example.com/b' }],
      ];
      const result = decodeBlobs(data) as any;

      expect(result[0]).toBeInstanceOf(IRPCBlob);
      expect(result[1]).toBe('keep');
      expect(result[2][0]).toBeInstanceOf(IRPCBlob);

      await result[0];
      await result[2][0];
      fetchSpy.mockRestore();
    });

    it('should pass through primitives and null unchanged', () => {
      expect(decodeBlobs('hello')).toBe('hello');
      expect(decodeBlobs(42)).toBe(42);
      expect(decodeBlobs(null)).toBe(null);
      expect(decodeBlobs(undefined)).toBe(undefined);
    });

    it('should decode primitive packet data without throwing', () => {
      const stream = decode({ data: 'primitive_string', files: [] });
      expect(stream.data).toBe('primitive_string');
    });

    it('should encode and decode nested arrays of file pointers', () => {
      const file = new IRPCFile(new Uint8Array([1, 2, 3]) as any, { name: 'nested.bin' } as any);
      const encoded = encode({ data: [['primitive', file]] });
      expect(encoded.json.files.length).toBe(1);

      const decoded = decode(encoded.json);
      expect(((decoded.data as any).data as any)[0][1]).toBeInstanceOf(IRPCFileStream);
    });

    it('should encode primitives directly without error', () => {
      const encoded = encode(12345);
      expect(encoded.json.data).toBe(12345);
      expect(encoded.json.files).toEqual([]);

      const nullEncoded = encode(null);
      expect(nullEncoded.json.data).toBeNull();

      const nullDecoded = decode({ data: null, files: [] });
      expect(nullDecoded.data).toBeNull();
    });
  });
});
