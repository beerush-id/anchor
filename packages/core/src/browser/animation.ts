/**
 * Type for a function that handles a reframed animation frame.
 */
export type ReframeHandler = () => void;

/**
 * Type for a function that cancels a scheduled reframed animation frame.
 */
export type ReframeCancel = () => void;

/**
 * Type for a function that schedules a reframed animation frame.
 */
export type ReframeScheduler = (handler: ReframeHandler) => void;

/**
 * Tuple representing a scheduler and a canceler for reframed animation frames.
 */
export type Reframer = [ReframeScheduler, ReframeCancel];

/**
 * Creates a scheduler and canceler pair for requestAnimationFrame.
 * Ensures that only one frame is scheduled at a time.
 * @returns {Reframer} A tuple containing the scheduler and canceler.
 */
export function reframe(): Reframer {
  let rafID = 0;

  const schedule = (cb: ReframeHandler) => {
    cancelAnimationFrame(rafID);
    rafID = requestAnimationFrame(cb);
  };
  const cancel = () => {
    cancelAnimationFrame(rafID);
  };

  return [schedule, cancel];
}
