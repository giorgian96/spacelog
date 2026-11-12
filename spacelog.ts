// Started work on this in January 2025

// Units
const TIME_UNITS = {
    s: 1,
    min: 60,
    h: 3600,
    d: 86400,
    yr: 31_557_600, // Julian year: 365.25 days
} as const;

/** Speed of light in a vacuum, in m/s */
const SPEED_OF_LIGHT = 299_792_458;

const LENGTH_UNITS = {
    m: 1,
    km: 1000,
    AU: 149_597_870_700, // exact, fixed by the IAU in 2012
    ls: SPEED_OF_LIGHT * TIME_UNITS.s,
    lmin: SPEED_OF_LIGHT * TIME_UNITS.min,
    lh: SPEED_OF_LIGHT * TIME_UNITS.h,
    ld: SPEED_OF_LIGHT * TIME_UNITS.d,
    ly: SPEED_OF_LIGHT * TIME_UNITS.yr,
} as const;

/** Average distance, in meters */
const EARTH_MOON_DISTANCE = convertLength(384_400, "km", "m");

/** Bodies ordered by distance from the Sun. Values are semi-major axes, converted from AU */
const CELESTIAL_BODIES = {
    mercury: { name: "Mercury", sunDistance: convertLength(0.387098, "AU", "m") },
    venus: { name: "Venus", sunDistance: convertLength(0.723332, "AU", "m") },
    earth: { name: "Earth", sunDistance: convertLength(1, "AU", "m") },
    moon: { name: "Moon", sunDistance: convertLength(1, "AU", "m") },
    mars: { name: "Mars", sunDistance: convertLength(1.523681, "AU", "m") },
    ceres: { name: "Ceres", sunDistance: convertLength(2.77, "AU", "m") },
    jupiter: { name: "Jupiter", sunDistance: convertLength(5.2038, "AU", "m") },
    saturn: { name: "Saturn", sunDistance: convertLength(9.5826, "AU", "m") },
    uranus: { name: "Uranus", sunDistance: convertLength(19.19126, "AU", "m") },
    neptune: { name: "Neptune", sunDistance: convertLength(30.07, "AU", "m") },
    pluto: { name: "Pluto", sunDistance: convertLength(39.482, "AU", "m") },
} satisfies Record<string, CelestialBody>;

const STARSHIPS = {
    chemical: {
        name: "Chemical rocket",
        description: "The kind of rockets we use today. Strong thrust, but very little delta-V",
        acceleration: 20,
        deltaV: convertLength(10, "km", "m")
    },
    fission: {
        name: "Fission rocket",
        description: "A reactor heats the propellant, a big step up in both thrust and delta-V",
        acceleration: 0.5,
        deltaV: convertLength(150, "km", "m")
    },
    fusion: {
        name: "Fusion rocket",
        description: "An advanced fusion powered rocket that provides constant thrust and a huge delta-V budget",
        acceleration: 0.981,
        deltaV: convertLength(1100, "km", "m")
    },
    antimatter: {
        name: "Antimatter ship",
        description: "A real starship, this one unlocks the stars, kinda",
        acceleration: 9.81,
        deltaV: convertLength(65_000, "km", "m")
    },
    scifi: {
        name: "Scifi starship",
        description: "This one is the kind of ship you could use in a scifi show, with inertial dampeners just so the crew can survive the acceleration. Still slower than light though",
        acceleration: 300,
        deltaV: convertLength(290_000, "km", "m")
    }
} satisfies Record<string, Starship>;

// Types
type LengthUnit = keyof typeof LENGTH_UNITS;
type TimeUnit = keyof typeof TIME_UNITS;
type CelestialBodyId = keyof typeof CELESTIAL_BODIES;
type StarshipId = keyof typeof STARSHIPS;

interface CelestialBody {
    name: string;
    sunDistance: number; // average distance from the Sun, in meters. Moon uses Earth's value
}

interface Starship {
    name: string;
    description: string;
    acceleration: number;
    deltaV: number;
}

/** A snapshot of the ship at one point in the journey */
interface JourneyStep {
    time: number; // Time since departure, in seconds
    speed: number; // Current speed, in m/s
    distanceLeft: number; // Distance still to cover, in meters
}

/** Statistics gathered over every step of the journey, all values in base units */
interface JourneyStats {
    peakSpeed: number;
    accelerationTime: number; // time spent speeding up
    cruiseTime: number; // time spent at constant (max) speed
    decelerationTime: number; // time spent slowing down
    averageSpeed: number;
    deltaVUsed: number; // every speed-up and slow-down added
}

/** The outcome of a simulated journey */
interface JourneyResult {
    steps: JourneyStep[]; // A record of the journey (evenly spaced steps)
    duration: number; // Total journey time, in seconds
    stats: JourneyStats;
}

/** How many steps a journey can hold */
const MAX_LOGGED_STEPS = 100;

class JourneyLog {
    private readonly capacity: number;
    private kept: JourneyStep[] = [];
    private spacing = 1; // a step is kept if its index is a multiple of this
    private recorded = 0; // how many steps have been recorded so far
    private lastStep: JourneyStep | undefined = undefined;
    private firstStep: JourneyStep | undefined = undefined;
    private peakSpeed = 0; // m/s
    private accelerationTime = 0; // s
    private cruiseTime = 0; // s
    private decelerationTime = 0; // s
    private deltaVUsed = 0; // m/s

    /**
     * @param capacity Size of the buffer
     */
    constructor(capacity: number) {
        this.capacity = capacity;
    }

    /**
     * Records the next step of the journey, kept only if it falls on the current spacing
     * @param step The step to record
     */
    record(step: JourneyStep): void {
        if (this.lastStep === undefined) {
            this.firstStep = step;
        } else {
            const elapsed = step.time - this.lastStep.time;
            const speedChange = step.speed - this.lastStep.speed;

            if (speedChange > 0) {
                this.accelerationTime += elapsed;
            } else if (speedChange < 0) {
                this.decelerationTime += elapsed;
            } else {
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
    getSteps(): JourneyStep[] {
        if (this.lastStep === undefined || this.kept.at(-1) === this.lastStep) {
            return [...this.kept];
        }

        return [...this.kept, this.lastStep];
    }

    /**
     * @returns Statistics over the steps recorded so far
     */
    getStats(): JourneyStats {
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
    private thin(): void {
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
function simulateJourney(
    shipAcceleration: number,
    shipDeltaV: number,
    distanceToCover: number
): JourneyResult {
    const maxSpeed = shipDeltaV / 2; // m/s
    let currentSpeed = 0; // m/s
    let previousSpeed = 0; // m/s
    let duration = 0; // seconds
    let distanceLeft = distanceToCover;

    const log = new JourneyLog(MAX_LOGGED_STEPS);
    log.record({time: duration, speed: currentSpeed, distanceLeft});

    do {
        previousSpeed = currentSpeed;

        if (shouldDecelerate(shipAcceleration, currentSpeed, distanceLeft)) {
            currentSpeed -= shipAcceleration;

            if (currentSpeed < 0) {
                currentSpeed = 0;
            }
        } else {
            currentSpeed += shipAcceleration;

            if (currentSpeed > maxSpeed) {
                currentSpeed = maxSpeed;
            }
        }

        duration++;
        distanceLeft -= (currentSpeed + previousSpeed) / 2;
        log.record({ time: duration, speed: currentSpeed, distanceLeft});

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
function shouldDecelerate(shipAcceleration: number, currentSpeed: number, distanceLeft: number): boolean {
    let brakingDistance = (currentSpeed**2) / (2 * shipAcceleration);
    return brakingDistance + 2*(currentSpeed + shipAcceleration) >= distanceLeft;
}

/**
 * Approximate average distance between two celestial bodies.
 * @param from The celestial body the journey starts at
 * @param to The celestial body the journey ends at
 * @returns The distance between them, in meters.
 */
function distanceBetween(from: CelestialBodyId, to: CelestialBodyId): number {
    if (from === to) {
        return 0;
    }

    if ((from === "earth" && to === "moon") ||
        (from === "moon" && to === "earth")
    ) {
        return EARTH_MOON_DISTANCE;
    }

    return Math.max(CELESTIAL_BODIES[from].sunDistance, CELESTIAL_BODIES[to].sunDistance);
}

// Formating

/**
 * Converts a length from one unit to another
 * @param value The length to convert, expressed in the `from` unit
 * @param from The unit `value` is currently in
 * @param to The unit to convert to
 * @returns The length expressed in the `to` unit
 */
function convertLength(
    value: number,
    from: LengthUnit,
    to: LengthUnit
): number {
    return (value * LENGTH_UNITS[from]) / LENGTH_UNITS[to];
}

/**
 * Converts a duration from one unit to another
 * @param value The duration to convert, expressed in the `from` unit
 * @param from The unit `value` is currently in
 * @param to The unit to convert to
 * @returns The duration expressed in the `to` unit
 */
function convertTime(
    value: number,
    from: TimeUnit,
    to: TimeUnit
): number {
    return (value * TIME_UNITS[from]) / TIME_UNITS[to];
}

/**
 * Breaks a duration into days, hours, minutes and seconds for display
 * @param totalSeconds The duration to format
 * @returns The duration as `DDd:HHh:MMm:SSs`
 */
function formatDuration(totalSeconds: number): string {
    const days    = Math.floor(totalSeconds / TIME_UNITS.d);
    const hours   = Math.floor((totalSeconds % TIME_UNITS.d) / TIME_UNITS.h);
    const minutes = Math.floor((totalSeconds % TIME_UNITS.h) / TIME_UNITS.min);
    const seconds = totalSeconds % TIME_UNITS.min;

    const pad = (n: number) => String(n).padStart(2, "0");

    return `${pad(days)}d:${pad(hours)}h:${pad(minutes)}m:${pad(seconds)}s`;
}

/**
 * @returns A line like "After 110 seconds: the speed is 150.42 m/s; distance left is 383299.12 km" 
 */
function formatStep(step: JourneyStep): string {
    const distanceLeftKM = convertLength(step.distanceLeft, "m", "km");
    return `After ${step.time} seconds: the speed is ${step.speed.toFixed(2)} m/s; distance left is ${distanceLeftKM.toFixed(2)} km`;
}

/**
 * Builds the display lines for a journey's statistics
 * @param stats The statistics to format, in base units (meters, seconds)
 * @returns One line per stat, speeds in km/s and times as formatted durations
 */
function formatStats(stats: JourneyStats): string[] {
    const kmPerSecond = (speed: number) => convertLength(speed, "m", "km").toFixed(2);

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
function formatSummary(duration: number): string {
    return `Journey is done. Duration was: ${formatDuration(duration)} (${duration} seconds)`;
}

// UI

/**
 * Prints a readable summary of a journey to the console
 * @param result The journey to print, as returned by `simulateJourney`
 */
function showJourneyLog(result: JourneyResult): void {
    for (const step of result.steps) {
        console.log(formatStep(step));
    }

    console.log(formatSummary(result.duration));

    for (const line of formatStats(result.stats)) {
        console.log(line);
    }
}

const ship = STARSHIPS.fusion;

let result = simulateJourney(
    ship.acceleration,
    ship.deltaV,
    distanceBetween("earth", "mars")
);

showJourneyLog(result);