"use strict";
// Started work on this in January 2025
// Units
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
/** How many steps a journey can hold */
const MAX_LOGGED_STEPS = 100;
class JourneyLog {
    capacity;
    kept = [];
    spacing = 1; // a step is kept if its index is a multiple of this
    recorded = 0; // how many steps have been recorded so far
    lastStep = undefined;
    firstStep = undefined;
    peakSpeed = 0; // m/s
    accelerationTime = 0; // s
    cruiseTime = 0; // s
    decelerationTime = 0; // s
    deltaVUsed = 0; // m/s
    /**
     * @param capacity Size of the buffer
     */
    constructor(capacity) {
        this.capacity = capacity;
    }
    /**
     * Records the next step of the journey, kept only if it falls on the current spacing
     * @param step The step to record
     */
    record(step) {
        if (this.lastStep === undefined) {
            this.firstStep = step;
        }
        else {
            const elapsed = step.time - this.lastStep.time;
            const speedChange = step.speed - this.lastStep.speed;
            if (speedChange > 0) {
                this.accelerationTime += elapsed;
            }
            else if (speedChange < 0) {
                this.decelerationTime += elapsed;
            }
            else {
                this.cruiseTime += elapsed;
            }
            this.deltaVUsed += Math.abs(speedChange);
        }
        this.peakSpeed = Math.max(this.peakSpeed, step.speed);
        this.lastStep = step;
        if (this.recorded % this.spacing === 0) {
            this.kept.push(step);
            if (this.kept.length >= this.capacity) {
                this.thin();
            }
        }
        this.recorded++;
    }
    /**
     * @returns The kept steps, with the final step always added
     */
    getSteps() {
        if (this.lastStep === undefined || this.kept.at(-1) === this.lastStep) {
            return [...this.kept];
        }
        return [...this.kept, this.lastStep];
    }
    /**
     * @returns Statistics over the steps recorded so far
     */
    getStats() {
        let averageSpeed = 0;
        if (this.firstStep !== undefined && this.lastStep !== undefined) {
            const distanceCovered = this.firstStep.distanceLeft - this.lastStep.distanceLeft;
            averageSpeed = distanceCovered / this.lastStep.time;
        }
        return {
            peakSpeed: this.peakSpeed,
            accelerationTime: this.accelerationTime,
            cruiseTime: this.cruiseTime,
            decelerationTime: this.decelerationTime,
            averageSpeed,
            deltaVUsed: this.deltaVUsed,
        };
    }
    /** Drops every other kept step and doubles the spacing */
    thin() {
        this.kept = this.kept.filter((_, index) => index % 2 === 0);
        this.spacing *= 2;
    }
}
// Simulation
/**
 * Simulate a full journey: accelerate, cruise, then brake to a stop
 * @param shipAcceleration Acceleration and deceleration rate, in m/s^2
 * @param shipDeltaV Total velocity change available for the journey, in m/s
 * @param distanceToCover Total distance of the journey, in m
 * @returns The simulated results of the journey, the total duration, and the stats
 */
function simulateJourney(shipAcceleration, shipDeltaV, distanceToCover) {
    const maxSpeed = shipDeltaV / 2; // m/s
    let currentSpeed = 0; // m/s
    let previousSpeed = 0; // m/s
    let duration = 0; // seconds
    let distanceLeft = distanceToCover;
    const log = new JourneyLog(MAX_LOGGED_STEPS);
    log.record({ time: duration, speed: currentSpeed, distanceLeft });
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
        log.record({ time: duration, speed: currentSpeed, distanceLeft });
        if (currentSpeed === 0) {
            break;
        }
    } while (distanceLeft > 0);
    return { steps: log.getSteps(), stats: log.getStats(), duration };
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
// Formating
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
 * Builds the display lines for a journey's statistics
 * @param stats The statistics to format, in base units (meters, seconds)
 * @returns One line per stat, speeds in km/s and times as formatted durations
 */
function formatStats(stats) {
    const kmPerSecond = (speed) => convertLength(speed, "m", "km").toFixed(2);
    return [
        `Peak speed: ${kmPerSecond(stats.peakSpeed)} km/s`,
        `Average speed: ${kmPerSecond(stats.averageSpeed)} km/s`,
        `Delta-V used: ${kmPerSecond(stats.deltaVUsed)} km/s`,
        `Accelerating for: ${formatDuration(stats.accelerationTime)}`,
        `Cruising for: ${formatDuration(stats.cruiseTime)}`,
        `Decelerating for: ${formatDuration(stats.decelerationTime)}`,
    ];
}
/**
 * @returns A line with the duration formatted and in raw seconds
 */
function formatSummary(duration) {
    return `Journey is done. Duration was: ${formatDuration(duration)} (${duration} seconds)`;
}
// UI
/**
 * Prints a readable summary of a journey to the console
 * @param result The journey to print, as returned by `simulateJourney`
 */
function showJourneyLog(result) {
    for (const step of result.steps) {
        console.log(formatStep(step));
    }
    console.log(formatSummary(result.duration));
    for (const line of formatStats(result.stats)) {
        console.log(line);
    }
}
let result = simulateJourney(0.981, convertLength(1000, "km", "m"), convertLength(225_000_000, "km", "m"));
showJourneyLog(result);
//# sourceMappingURL=spacelog.js.map