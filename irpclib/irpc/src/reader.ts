import { replay, type StateChange } from '@anchorlib/core';
import { IRPC_PACKET_TYPE, IRPC_STATUS } from './enum.js';
import { RemoteState } from './state.js';
import type { IRPCData, IRPCPacketAnswer, IRPCPacketClose, IRPCPacketEvent, IRPCPacketStream } from './types.js';

/**
 * A client-side consumer that hydrates `RemoteState` instances from network stream packets.
 *
 * @template T - The type of data yielded by the stream.
 */
export class IRPCReader<T extends IRPCData> extends RemoteState<T> {
  public packets: Set<IRPCPacketStream<T>> = new Set();
  public onClose?: () => void;

  constructor(
    public id: string,
    init?: T
  ) {
    super(init);
  }

  /**
   * Pushes incoming network packets into this reader, evaluating payload data
   * and subsequently updating the core state values locally.
   *
   * @param packet - The incoming unified Stream Packet structure (`ANSWER`, `EVENT`, or `CLOSE`).
   */
  public push(packet: IRPCPacketStream<T>) {
    packet.arrivedAt = Date.now();

    this.packets.add(packet);

    if (packet.type === IRPC_PACKET_TYPE.ANSWER) {
      if (packet.status === IRPC_STATUS.ERROR) {
        this.error = new Error((packet as IRPCPacketAnswer<T>).error!.message);
      } else {
        this.data = (packet as IRPCPacketAnswer<T>).data as T;
      }
    } else if (packet.type === IRPC_PACKET_TYPE.EVENT) {
      replay(this.state, (packet as IRPCPacketEvent).data as StateChange);
    } else if (packet.type === IRPC_PACKET_TYPE.CLOSE) {
      if ((packet as IRPCPacketClose).error) {
        this.error = new Error((packet as IRPCPacketClose).error!.message);
      }
    }

    this.status = packet.status;
  }

  public close() {
    this.status = IRPC_STATUS.SUCCESS;
    this.onClose?.();
  }
}
