"use strict";
// Started work on this in January 2025
function makeJourney(shipAcceleration, shipMaxSpeed, distanceToCover) {
    // shipAcceleration is in m/s^2, shipMaxSpeed is in km/s, distanceToCover is in km
    // starting from 0 initial speed, at destination should have 0 final speed
    let currentSpeed = 0; // m/s
    let previousSpeed = 0; // m/s
    let duration = 0; // seconds
    let journeyLog = [];
    journeyLog.push(`After ${duration} seconds: the speed is ${currentSpeed} m/s; distance left is ${distanceToCover} km`);
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
            if (currentSpeed > shipMaxSpeed * 1000) {
                currentSpeed = shipMaxSpeed * 1000;
            }
        }
        duration++;
        distanceToCover -= (currentSpeed + previousSpeed) / 2000;
        journeyLog.push(`After ${duration} seconds: the speed is ${currentSpeed} m/s; distance left is ${distanceToCover} km`);
        if (currentSpeed === 0) {
            break;
        }
    } while (distanceToCover > 0);
    let readableDuration = formatDuration(duration);
    journeyLog.push(`Journey is done. Duration was: ${readableDuration} (${duration} seconds)`);
    showJourneyLog(journeyLog);
}
function shouldDecelerate(shipAcceleration, currentSpeed, distanceToCover) {
    let brakingDistance = (currentSpeed ** 2) / (2 * shipAcceleration);
    return brakingDistance + 2 * (currentSpeed + shipAcceleration) >= distanceToCover * 1000;
}
function formatDuration(totalSeconds) {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
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
makeJourney(0.981, 500, 225_000_000);
//# sourceMappingURL=spacelog.js.map