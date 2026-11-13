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
        description: "Traditional rockets we've all seen, like the Saturn V's upper stage. Strong thrust, but very little delta-V",
        acceleration: 20,
        deltaV: convertLength(9, "km", "m")
    },
    fission: {
        name: "Fission rocket",
        description: "A nuclear salt-water rocket, the fission reaction burns right in the exhaust, giving chemical-class thrust with far more delta-V",
        acceleration: 30,
        deltaV: convertLength(150, "km", "m")
    },
    fusion: {
        name: "Fusion rocket",
        description: "An advanced fusion drive, gentle but constant thrust, and enough delta-V to cross the solar system in months",
        acceleration: 1,
        deltaV: convertLength(2000, "km", "m")
    },
    antimatter: {
        name: "Antimatter rocket",
        description: "This makes interstellar travel feasible, the nearest stars are within reach in a human lifetime",
        acceleration: 1,
        deltaV: convertLength(65_000, "km", "m")
    },
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
 * @param shipAcceleration Acceleration and deceleration rate, in m/s²
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
 * @param shipAcceleration Acceleration and deceleration rate, in m/s²
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

// The route and ship the form starts with
const DEFAULT_FROM: CelestialBodyId = "earth";
const DEFAULT_TO: CelestialBodyId = "mars";
const DEFAULT_SHIP: StarshipId = "fusion";

/** Routes shorter than this start out in km instead of AU, in m */
const SHORT_ROUTE_LIMIT = convertLength(0.1, "AU", "m");

/** Formats numbers for display in the user's locale, to 6 significant digits */
const numberFormat = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 6 });

/**
 * Finds an element by id, checking that it exists and has the expected type
 *
 * @param id - The id of the element
 * @param expected - The element's type, for example `HTMLSelectElement`
 * @returns The element, typed as `expected`. Throws if it is missing or of another type
 */
function getElement<T extends HTMLElement>(id: string, expected: new () => T): T {
    const element = document.getElementById(id);

    if (!(element instanceof expected)) {
        throw new Error(`Element #${id} is missing or is not a ${expected.name}`);
    }

    return element;
}

/**
 * Controls the page: fills the form, runs the journey on submit and shows the results
 */
class JourneyUI {
    private readonly fromSelect = getElement("from-body", HTMLSelectElement);
    private readonly toSelect = getElement("to-body", HTMLSelectElement);
    private readonly distanceOutput = getElement("distance-value", HTMLOutputElement);
    private readonly distanceUnitSelect = getElement("distance-unit", HTMLSelectElement);
    private readonly shipSelect = getElement("ship", HTMLSelectElement);
    private readonly shipDescription = getElement("ship-description", HTMLParagraphElement);
    private readonly accelerationOutput = getElement("acceleration-value", HTMLOutputElement);
    private readonly deltaVOutput = getElement("delta-v-value", HTMLOutputElement);

    private readonly journeyForm = getElement("journey-form", HTMLFormElement);
    private readonly resultsSection = getElement("results", HTMLElement);
    private readonly durationText = getElement("duration", HTMLParagraphElement);
    private readonly statsList = getElement("stats", HTMLUListElement);
    private readonly distanceLeftHeader = getElement("distance-left-header", HTMLTableCellElement);
    private readonly stepsBody = getElement("steps-body", HTMLTableSectionElement);

    /** The last journey that was run, or undefined if the form has changed since */
    private result: JourneyResult | undefined = undefined;

    constructor() {
        // A function, because an option can only live in one dropdown
        const bodyOptions = () => Object.entries(CELESTIAL_BODIES).map(([id, body]) => new Option(body.name, id));

        this.fromSelect.replaceChildren(...bodyOptions());
        this.toSelect.replaceChildren(...bodyOptions());
        this.distanceUnitSelect.replaceChildren(...Object.keys(LENGTH_UNITS).map((unit) => new Option(unit)));
        this.shipSelect.replaceChildren(...Object.entries(STARSHIPS).map(([id, ship]) => new Option(ship.name, id)));

        this.fromSelect.value = DEFAULT_FROM;
        this.toSelect.value = DEFAULT_TO;
        this.shipSelect.value = DEFAULT_SHIP;

        this.fromSelect.addEventListener("change", () => this.onRouteChange());
        this.toSelect.addEventListener("change", () => this.onRouteChange());
        this.distanceUnitSelect.addEventListener("change", () => this.onUnitChange());
        this.shipSelect.addEventListener("change", () => this.onShipChange());
        this.journeyForm.addEventListener("submit", (event) => this.onSubmit(event));

        this.onRouteChange();
        this.showShip();
    }

    /** Clears the results, blocks same-to-same, picks a starting unit and shows the distance */
    private onRouteChange(): void {
        this.result = undefined;
        this.showResults();

        this.blockSameBody(this.toSelect, this.fromSelect);
        this.blockSameBody(this.fromSelect, this.toSelect);

        this.distanceUnitSelect.value = this.routeDistance() < SHORT_ROUTE_LIMIT ? "km" : "AU";
        this.showDistance();
    }

    /** Clears the results and shows the new ship */
    private onShipChange(): void {
        this.result = undefined;
        this.showResults();
        this.showShip();
    }

    /** Redraws everything that shows a distance */
    private onUnitChange(): void {
        this.showDistance();
        this.showResults();
    }

    /** Runs the selected journey and shows the outcome */
    private onSubmit(event: SubmitEvent): void {
        event.preventDefault();

        const ship = this.selectedShip();

        this.result = simulateJourney(ship.acceleration, ship.deltaV, this.routeDistance());
        this.showResults();
    }

    /** Disables, in `select`, the body chosen in `other`, so a route can't start and end at the same body */
    private blockSameBody(select: HTMLSelectElement, other: HTMLSelectElement): void {
        for (const option of select.options) {
            option.disabled = option.value === other.value;
        }
    }

    /** Shows the route's distance in the selected unit */
    private showDistance(): void {
        const distance = convertLength(this.routeDistance(), "m", this.distanceUnit());

        this.distanceOutput.textContent = numberFormat.format(distance);
    }

    /** Shows the selected ship's description, acceleration (m/s²) and delta-V (km/s) */
    private showShip(): void {
        const ship = this.selectedShip();

        this.shipDescription.textContent = ship.description;
        this.accelerationOutput.textContent = numberFormat.format(ship.acceleration);
        this.deltaVOutput.textContent = numberFormat.format(convertLength(ship.deltaV, "m", "km"));
    }

    /** Draws the stored result, or hides the results section if there is none */
    private showResults(): void {
        const result = this.result;

        this.resultsSection.hidden = result === undefined;

        if (result === undefined) {
            return;
        }

        const unit = this.distanceUnit();

        this.durationText.textContent = formatSummary(result.duration);

        this.statsList.replaceChildren(...formatStats(result.stats).map((line) => {
            const item = document.createElement("li");

            item.textContent = line;

            return item;
        }));

        this.distanceLeftHeader.textContent = `Distance left (${unit})`;
        this.stepsBody.replaceChildren(...result.steps.map((step) => this.createStepRow(step, unit)));
    }

    /** Builds the table row for one step: time, speed in km/s, and distance left in `unit` */
    private createStepRow(step: JourneyStep, unit: LengthUnit): HTMLTableRowElement {
        const row = document.createElement("tr");

        row.insertCell().textContent = formatDuration(step.time);
        row.insertCell().textContent = numberFormat.format(convertLength(step.speed, "m", "km"));
        row.insertCell().textContent = numberFormat.format(convertLength(step.distanceLeft, "m", unit));

        return row;
    }

    // The dropdowns are filled from the tables, so their values are always valid keys
    // These three getters are the only places that cast them back

    /** @returns The selected route's distance, in meters */
    private routeDistance(): number {
        return distanceBetween(this.fromSelect.value as CelestialBodyId, this.toSelect.value as CelestialBodyId);
    }

    /** @returns The selected ship */
    private selectedShip(): Starship {
        return STARSHIPS[this.shipSelect.value as StarshipId];
    }

    /** @returns The selected distance unit */
    private distanceUnit(): LengthUnit {
        return this.distanceUnitSelect.value as LengthUnit;
    }
}

new JourneyUI();