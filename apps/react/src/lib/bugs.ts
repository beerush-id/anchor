/**
 * Creates an array of bug objects with non-random, evenly distributed positions and rotations.
 * The bugs will surround a central point (0,0).
 *
 * @param {number} length - The total number of bug objects to generate. Defaults to 50.
 * @param {number} maxRadius - The radius at which the bugs will primarily be placed from the central point (0,0). Defaults to 150.
 * @returns {Array<object>} An array of bug objects, each with the following properties:
 * - `x`: The bug's X coordinate, relative to the central point (0,0).
 * - `y`: The bug's Y coordinate, relative to the central point (0,0).
 * - `rotate`: The rotation in degrees that the bug needs to face the center, assuming the bug graphic starts facing top (0 degrees).
 */
export function createBugs(length = 50, maxRadius = 150) {
  const bugs = [];

  for (let i = 0; i < length; i++) {
    // Calculate an angle that evenly distributes bugs around the circle.
    // Each bug gets a unique, incremental slice of the 2*PI (360 degrees) circle.
    const angle = (i / length) * Math.PI * 2;

    // Set the radius to be consistent for all bugs, placing them on a defined circle.
    // Adding 20 ensures they are not exactly at 0 radius, creating a visible circle.
    const radius = maxRadius + 20;

    // Keep rotationOffset random for visual variety of each individual bug's appearance,
    // without affecting its position relative to the circle.
    const rotationOffset = Math.random() * 360;

    // Calculate the bug's fixed orbital position (x, y) relative to the central point (0,0).
    const relativeX = Math.cos(angle) * radius;
    const relativeY = Math.sin(angle) * radius;

    // Calculate the direction vector from the bug's fixed position back towards the center (0,0).
    const dx = 0 - relativeX;
    const dy = 0 - relativeY;

    // Calculate the rotation angle in radians using Math.atan2.
    // Math.atan2(dy, dx) returns an angle from the positive X-axis (0deg is right, increasing counter-clockwise).
    // To align with CSS rotation where 0deg is UP and increases clockwise,
    // we add 1.5 * Math.PI (270 degrees) to effectively rotate the coordinate system.
    const rotation = Math.atan2(dy, dx) + Math.PI * 1.5; // Adjusted for 0deg = UP

    // Convert the rotation from radians to degrees, ensure it's within 0-360 range,
    // and then add the bug's static rotation offset for appearance variety.
    const rotationDegrees = (((rotation * 180) / Math.PI) % 360) + rotationOffset;

    bugs.push({
      x: relativeX,
      y: relativeY,
      rotate: rotationDegrees,
      delay: Math.random() / 100,
    });
  }

  return bugs;
}
