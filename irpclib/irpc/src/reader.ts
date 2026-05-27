import { replay, type StateChange } from '@anchorlib/core';
import { IRPC_PACKET_TYPE, IRPC_STATUS } from './enum.js';
import { IRPCError } from './error.js';
import { RemoteState } from './state.js';
import type {
  IRPCData,
  IRPCPacketAnswer,
  IRPCPacketClose,
  IRPCPacketEvent,
  IRPCPacketStream,
  IRPCStatus,
} from './types.js';

/**
 * A client-side consumer that hydrates `RemoteState` instances from network stream packets.
 *
 * @template T - The type of data yielded by the stream.
 */
export class IRPCReader<T extends IRPCData> extends RemoteState<T> {
  public onClose?: () => void;

  /**
   * Initializes a new RemoteState with an optional initial payload.
   *
   * @param id - The unique identifier for this state instance.
   * @param init - An optional starting value for the data payload.
   * @param status - The initial status of the state (PENDING, SUCCESS, ERROR).
   * @param resumable - Whether the state should be resumable after being closed.
   */
  constructor(
    public id: string,
    init?: T,
    status: IRPCStatus = IRPC_STATUS.PENDING,
    resumable?: boolean
  ) {
    super(init, status, resumable);
  }

  /**
   * Pushes incoming network packets into this reader, evaluating payload data
   * and subsequently updating the core state values locally.
   *
   * @param packet - The incoming unified Stream Packet structure (`ANSWER`, `EVENT`, or `CLOSE`).
   */
  public push(packet: IRPCPacketStream<T>) {
    packet.arrivedAt = Date.now();

    if (packet.type === IRPC_PACKET_TYPE.ANSWER) {
      if (packet.status === IRPC_STATUS.ERROR) {
        this.error = IRPCError.from((packet as IRPCPacketAnswer<T>).error!);
      } else {
        this.data = (packet as IRPCPacketAnswer<T>).data as T;
      }
    } else if (packet.type === IRPC_PACKET_TYPE.EVENT) {
      replay(this.state, (packet as IRPCPacketEvent).data as StateChange);
    } else if (packet.type === IRPC_PACKET_TYPE.CLOSE) {
      if ((packet as IRPCPacketClose).error) {
        this.error = IRPCError.from((packet as IRPCPacketClose).error!);
      }
    }

    this.status = packet.status;
  }

  public close() {
    this.status = IRPC_STATUS.SUCCESS;
    super.close();
    this.onClose?.();
  }

  /**
   * Ensures that chained Promise operations return standard Promises
   * rather than instantiating new RemoteState subclasses.
   */
  static get [Symbol.species]() {
    return Promise;
  }
}
