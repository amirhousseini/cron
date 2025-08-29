/**
 * Module to test the class CronSchedule and illustrate its usage.
 * It is NOT a proper unit test.
 */

'use strict';

const { CronSchedule } = require('../index.js');
const { localDateTimeString, localDayString } = require('./util.js');

/**
 * Return the date/time representation in local time,
 * according to the environment variable TZ.
 * @param {Date|Number} date Optional date or timestamp; default to the current date/time
 * @returns {String}
 */
const displayLocalDateTime = (date = new Date()) =>
    `${localDateTimeString(date)} (${localDayString(date)})`;

/**
 * Create a Schedule with the given expression.
 * Display the internal values resulting from parsing the expression.
 * Display the reason if an exception is thrown. 
 * Test whether the provided date/times match the schedule.
 * @param {String} expression Schedule expression
 * @param {...String} sampleDates Optional date/time string to test whether they match the given schedule
 */
function test(expression, ...sampleDates) {
    try {
        let cs = new CronSchedule(expression);
        let trimmedExpression = expression !== cs.expression() ? `  =>  "${cs.expression()}"` : "";
        console.log(`"${expression}"${trimmedExpression}`);
        console.log(JSON.stringify(cs.values()));
        console.log(`Next schedule is ${displayLocalDateTime(cs.nextMatch())}`);
        sampleDates.map(d => new Date(d))
        .forEach(d => console.log(`${displayLocalDateTime(d)} -> ${cs.matches(d) ? "match" : "no match"}`));
    } catch (err) {
        console.log(`"${expression}"`);
        console.error('Error>', err.message);
    }
    console.log();
}

// Main

console.log("Now is", displayLocalDateTime());
console.log();

// Valid expressions
test("\t*\t*  *  *  * ", "2025-06-18T03:23:45", "2025-06-18T03:23", "2025-06-19T03:24", "2025-06-20T03:25");
test("24 * * * *", "2025-06-18T03:23", "2025-06-19T03:24", "2025-06-20T03:25");
test("* 3 * * *", "2025-06-18T03:23", "2025-06-19T03:24", "2025-06-20T03:25");
test("* * 19 * *", "2025-06-18T03:23", "2025-06-19T03:24", "2025-06-20T03:25");
test("* 3 1,19 * 4", "2025-06-18T03:23", "2025-06-19T03:24", "2025-06-20T03:25");
test("*/6 3 1,19 * Thu", "2025-06-18T03:23", "2025-06-19T03:24", "2025-06-20T03:25");
test("20-40/2 * 15-20 Jun-Sep Thu", "2025-06-18T03:23", "2025-06-19T03:24", "2025-06-20T03:25");

// Valid aliases
test("@hourly", "2025-06-18T03:00", "2025-06-18T03:24", "2025-06-18T04:00");
test("@daily", "2025-06-18T11:30", "2025-06-19T00:00", "2025-06-19T00:30");
test("@midnight", "2025-06-18T11:30", "2025-06-19T00:00", "2025-06-19T00:30");
test("@weekly", "2025-06-21T00:00", "2025-06-22T00:00", "2025-06-23T00:00");
test("@monthly", "2025-06-30T00:00", "2025-07-01T00:00", "2025-06-05T00:00");
test("@yearly", "2025-12-31T00:00", "2026-01-01T00:00", "2025-01-05T00:00");
test("@annually", "2025-12-31T00:00", "2026-01-01T00:00", "2025-01-05T00:00");

// Invalid expressions
test("60 * * * *");
test("* 60 * * *");
test("* * 32 * *");
test("* * * 13 *");
test("* * * xxx *");
test("* * * * 8");
test("* * * * xxx");
test("@reboot");
