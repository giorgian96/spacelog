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
 * Simulate a full journey
 * @param shipAcceleration Acceleration and deceleration rate, in m/s^2
 * @param shipMaxSpeed Top speed of the ship, in m/s
 * @param distanceToCover Total distance of the journey, in m
 */
function makeJourney(shipAcceleration, shipMaxSpeed, distanceToCover) {
    // Starting from 0 initial speed, cruise when max speed is reached
    // at destination should have 0 final speed
    let currentSpeed = 0; // m/s
    let previousSpeed = 0; // m/s
    let duration = 0; // seconds
    let journeyLog = [];
    journeyLog.push(`After ${duration} seconds: the speed is ${currentSpeed} m/s; distance left is ${distanceToCover} m`);
    do {
        previousSpeed = currentSpeed;
        if (shouldDecelerate(shipAcceleration, currentSpeed, distanceToCover)) {
            currentSpeed -= shipAcceleration;
            if (currentSpeed < 0) {
                currentSpeed = 0;
            }
        }
        else {
            currentSpeed += shipAcceleration;
            if (currentSpeed > shipMaxSpeed) {
                currentSpeed = shipMaxSpeed;
            }
        }
        duration++;
        distanceToCover -= (currentSpeed + previousSpeed) / 2;
        journeyLog.push(`After ${duration} seconds: the speed is ${currentSpeed} m/s; distance left is ${distanceToCover} m`);
        if (currentSpeed === 0) {
            break;
        }
    } while (distanceToCover > 0);
    let readableDuration = formatDuration(duration);
    journeyLog.push(`Journey is done. Duration was: ${readableDuration} (${duration} seconds)`);
    showJourneyLog(journeyLog);
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
function showJourneyLog(journeyLog) {
    // show up to 100 logs, evenly spaced, except 1st and final 2 which are always shown
    let logsToShow = [];
    if (journeyLog.length <= 100) {
        logsToShow = journeyLog;
    }
    else {
        const spacedCount = 97;
        const step = (journeyLog.length - 3) / spacedCount;
        for (let i = 0; i <= spacedCount; i++) {
            const entry = journeyLog[Math.round(i * step)];
            if (entry !== undefined) {
                logsToShow.push(entry);
            }
        }
        logsToShow = logsToShow.concat(journeyLog.slice(-2)); // add the last 2 logs
    }
    for (let logItem of logsToShow) {
        console.log(logItem);
    }
}
makeJourney(0.981, convertLength(500, "km", "m"), convertLength(225_000_000, "km", "m"));
//# sourceMappingURL=spacelog.js.map