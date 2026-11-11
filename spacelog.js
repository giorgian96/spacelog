"use strict";
// Started work on this in January 2025
const LENGTH_UNITS = {
    m: 1,
    km: 1000
};
const TIME_UNITS = {
    s: 1,
    min: 60,
    h: 3600,
    d: 86400,
};
/**
 * Converts a length from one unit to another
 * @param value The length to convert, expressed in the `from` unit
 * @param from The unit `value` is currently in
 * @param to The unit to convert to
 * @returns The length expressed in the `to` unit
 */
function convertLength(value, from, to) {
    return (value * LENGTH_UNITS[from]) / LENGTH_UNITS[to];
}
/**
 * Converts a duration from one unit to another
 * @param value The duration to convert, expressed in the `from` unit
 * @param from The unit `value` is currently in
 * @param to The unit to convert to
 * @returns The duration expressed in the `to` unit
 */
function convertTime(value, from, to) {
    return (value * TIME_UNITS[from]) / TIME_UNITS[to];
}
/**
 * Simulate a full journey: accelerate, cruise, then brake to a stop
 * @param shipAcceleration Acceleration and deceleration rate, in m/s^2
 * @param shipDeltaV Total velocity change available for the journey, in m/s
 * @param distanceToCover Total distance of the journey, in m
 * @returns Every simulated second of the journey, and the total duration
 */
function simulateJourney(shipAcceleration, shipDeltaV, distanceToCover) {
    const maxSpeed = shipDeltaV / 2; // m/s
    let currentSpeed = 0; // m/s
    let previousSpeed = 0; // m/s
    let duration = 0; // seconds
    let distanceLeft = distanceToCover;
    const steps = [
        { time: duration, speed: currentSpeed, distanceLeft }
    ];
    do {
        previousSpeed = currentSpeed;
        if (shouldDecelerate(shipAcceleration, currentSpeed, distanceLeft)) {
            currentSpeed -= shipAcceleration;
            if (currentSpeed < 0) {
                currentSpeed = 0;
            }
        }
        else {
            currentSpeed += shipAcceleration;
            if (currentSpeed > maxSpeed) {
                currentSpeed = maxSpeed;
            }
        }
        duration++;
        distanceLeft -= (currentSpeed + previousSpeed) / 2;
        steps.push({ time: duration, speed: currentSpeed, distanceLeft });
        if (currentSpeed === 0) {
            break;
        }
    } while (distanceLeft > 0);
    return { steps, duration };
}
/**
 * Decide if the ship should start decelerating
 * @param shipAcceleration Acceleration and deceleration rate, in m/s^2
 * @param currentSpeed Current speed of the ship, in m/s
 * @param distanceLeft Distance remaining, in m
 * @returns
 */
function shouldDecelerate(shipAcceleration, currentSpeed, distanceLeft) {
    let brakingDistance = (currentSpeed ** 2) / (2 * shipAcceleration);
    return brakingDistance + 2 * (currentSpeed + shipAcceleration) >= distanceLeft;
}
/**
 * Breaks a duration into days, hours, minutes and seconds for display
 * @param totalSeconds The duration to format
 * @returns The duration as `DDd:HHh:MMm:SSs`
 */
function formatDuration(totalSeconds) {
    const days = Math.floor(totalSeconds / TIME_UNITS.d);
    const hours = Math.floor((totalSeconds % TIME_UNITS.d) / TIME_UNITS.h);
    const minutes = Math.floor((totalSeconds % TIME_UNITS.h) / TIME_UNITS.min);
    const seconds = totalSeconds % TIME_UNITS.min;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(days)}d:${pad(hours)}h:${pad(minutes)}m:${pad(seconds)}s`;
}
/**
 * @returns A line like "After 110 seconds: the speed is 150.42 m/s; distance left is 383299.12 km"
 */
function formatStep(step) {
    const distanceLeftKM = convertLength(step.distanceLeft, "m", "km");
    return `After ${step.time} seconds: the speed is ${step.speed.toFixed(2)} m/s; distance left is ${distanceLeftKM.toFixed(2)} km`;
}
/**
 * @returns A line with the duration formatted and in raw seconds
 */
function formatSummary(duration) {
    return `Journey is done. Duration was: ${formatDuration(duration)} (${duration} seconds)`;
}
/**
 * Picks evenly spaced steps to show, always includes the first and the last
 * @param steps All steps of the journey
 * @param maxCount The limit of steps to return
 * @returns `steps` unchanged if it fits in the limit, otherwise evenly sampled
 */
function sampleSteps(steps, maxCount) {
    if (steps.length <= maxCount) {
        return steps;
    }
    const sampled = [];
    const stride = (steps.length - 1) / (maxCount - 1);
    for (let i = 0; i < maxCount; i++) {
        const step = steps[Math.round(i * stride)];
        if (step !== undefined) {
            sampled.push(step);
        }
    }
    return sampled;
}
/**
 * Prints a readable summary of a journey to the console
 * @param result The journey to print, as returned by `simulateJourney`
 */
function showJourneyLog(result) {
    for (const step of sampleSteps(result.steps, 100)) {
        console.log(formatStep(step));
    }
    console.log(formatSummary(result.duration));
}
let result = simulateJourney(0.981, convertLength(1000, "km", "m"), convertLength(225_000_000, "km", "m"));
showJourneyLog(result);
//# sourceMappingURL=spacelog.js.map