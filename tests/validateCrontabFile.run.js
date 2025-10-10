/**
 * Module to test the function validateCrontabFile and illustrate its usage.
 * It is NOT a proper unit test.
 */

'use strict';

const { validateCrontabFile } = require('..');

var crontabPath = process.argv[2];
if (crontabPath) {
    validateCrontabFile(crontabPath, { locationPaths: '../samples' });
} else {
    console.log("Usage: validateCrontab <crontabPath>");
}
