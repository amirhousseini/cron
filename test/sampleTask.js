'use strict';

const process = require('node:process');
const { localDateTimeString } = require('./util.js');

// Return the local time in format "hh:mm:ss.zzz"
const localTimeString = (date) => localDateTimeString(date).slice(11, 23);

// Get passed arguments
let [ id, schedule, time, data ] = process.argv.slice(2);

// De-stringify arguments
id = parseInt(id);
time = parseInt(time);
if (data) data = JSON.parse(data);

// Execute the task
console.log(`"${schedule}"`, 'task', id, '->', localTimeString(time), data);
