import { describe, expect, it } from 'vitest';
import { IRPCFile } from '../src/file.js';
import { decode, encode, IRPC_FILE_IDENTIFIER } from '../src/packet.js';

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
});
