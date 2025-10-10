/**
 * Utility functions.
 */

'use strict';

/**
 * Format a number to a string, padded with leading zeros up to a given length.
 * @param {Number} num Number to format
 * @param {Number} siz Optional number of digits; default to 2.
 * @returns 
 */
const fmt = (num = 0, siz = 2) => num.toString().padStart(siz, "0");

/**
 * Return the ISO date/time representation in local time according to the environment variable TZ.
 * @param {any} date Optional date or timestamp; default to the current date/time.
 * @returns {String}
 */
function localDateTimeString(date = new Date()) {
    // Get the date corresponding to the argument
    date = new Date(date);
    let dateStr = [ date.getFullYear(), fmt(date.getMonth() + 1), fmt(date.getDate()) ].join('-');
    let timeStr = [ fmt(date.getHours()), fmt(date.getMinutes()), fmt(date.getSeconds())].join(':');
    let offset = date.getTimezoneOffset();
    let offsetSign = (offset > 0 ? '-' : '+');
    offset = Math.abs(offset);
    let offsetStr = offsetSign + fmt(parseInt(offset / 60)) + ':' + fmt(offset % 60);
    return dateStr + 'T' + timeStr + '.' + fmt(date.getMilliseconds(), 3) + offsetStr;
}

/**
 * Return the abbreviated weekday name of the given date/time in local time, according to the environment variable TZ.
 * @param {any} date Optional date or timestamp; default to the current date/time.
 * @returns {String}
 */
function localDayString(date = new Date()) {
    // Get the date corresponding to the argument
    date = new Date(date);
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat','Sun'][date.getDay()];
}

module.exports = {
    localDateTimeString,
    localDayString
}
