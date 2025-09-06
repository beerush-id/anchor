let lastTimestamp = 0;
let sequence = 0;

export function shortId(): string {
  const timestamp = Date.now();

  if (timestamp === lastTimestamp) {
    sequence++;
  } else {
    sequence = 0;
  }
  lastTimestamp = timestamp;

  const timestampPart = timestamp.toString(36);
  const sequencePart = sequence.toString(36).padStart(3, '0');
  const randomPart = Math.random().toString(36).substring(2, 6);

  return `${timestampPart}${sequencePart}${randomPart}`;
}
