/**
 * Skeleton implementation of a task to be executed by the CronEngine
 */

'use strict';

const process = require('node:process');

/**
 * Return the ISO time representation in local time according to the environment variable TZ.
 * @param {any} date Optional date or timestamp; default to the current date/time.
 * @returns {String} hh:mm
 */
function localTimeString(date = Date.now()) {
    const fmt = (nbr = 0, len = 2) => nbr.toString().padStart(len, "0");
    date = new Date(date);
    return fmt(date.getHours()) + ':' + fmt(date.getMinutes());
}

// Get command-line arguments passed by CronEngine and de-stringify them
let [ id, schedule, time, data ] = process.argv.slice(2);
id = parseInt(id);
time = parseInt(time);
if (data) data = JSON.parse(data);

// Execute the task
console.log(`"${schedule}"`, 'task', id, '->', localTimeString(time), data);
