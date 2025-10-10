/**
 * Module to test the class CrontabService and illustrate its usage.
 * It is NOT a proper unit test.
 */

'use strict';

const { CrontabService } = require('..');

const delayMillis = 5 * 60 * 1000;
const SampleCrontab = 'sampleCrontab';

let service = new CrontabService(SampleCrontab, { locationPaths: '../samples' });
if (service.isRunning) setTimeout(() => service.stop(), delayMillis);
