export type QueuedTask<T> = {
  result: Promise<T>;
  tail: Promise<void>;
};

export function enqueueSerialTask<T>(
  previous: Promise<void>,
  operation: () => Promise<T>,
): QueuedTask<T> {
  const result = previous.catch((): undefined => undefined).then(operation);
  return {
    result,
    tail: result.then(
      (): undefined => undefined,
      (): undefined => undefined,
    ),
  };
}
