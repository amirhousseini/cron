/**
 * Module to test the class CronEngine and illustrate its usage.
 * It is NOT a proper unit test.
 */

'use strict';

const { CronEngine, CronSchedule } = require('../index.js');
const { localDateTimeString } = require('./util.js');

// Return the local time in format "hh:mm:ss.zzz"
const localTimeString = (date) => localDateTimeString(date).slice(11, 23);
// Log the arguments passed by the cron engine
const SampleTaskFunction = (id, schedule, time, data) =>
    console.log(`"${schedule}"`, 'task', id, '->', localTimeString(time), data);
const SampleTaskModule = './sampleTask.js';
const SampleCrontab = './sampleCrontab';
const Duration = 18;    // minutes

async function immediateStart() {
    console.log('immediate start');

    let cron = new CronEngine();
    console.log('started at', localTimeString());

    let schedule;
    // Execute every single minute a function in the same thread
    cron.register(schedule, SampleTaskFunction, 'execution in same thread');
    // Execute every odd minute a module task in a worker thread
    schedule = new CronSchedule('1-59/2 * * * *');
    cron.register(schedule, SampleTaskModule, { type: 'execution in worker thread', arg: 'more-data' });
    // Execute every 5 seconds a module task in a child process
    schedule = '*/5 * * * *'
    cron.register(schedule, SampleTaskModule, ['execution in forked process', 'more-data'], { fork: true });

    console.log(await cron.stop(Duration) ? `stopped at ${localTimeString()}` : 'already stopped');

    console.log();
}

async function delayedStart() {
    console.log('delayed start');

    let cron = new CronEngine(true);

    let schedule;
    // Execute every single minute a function in the same thread
    cron.register(schedule, SampleTaskFunction, 'execution in same thread');
    // Execute every odd minute a module task in a worker thread
    schedule = new CronSchedule('1-59/2 * * * *');
    cron.register(schedule, SampleTaskModule, { type: 'execution in worker thread', arg: 'more-data' });
    // Execute every 5 seconds a module task in a child process
    schedule = '*/5 * * * *'
    cron.register(schedule, SampleTaskModule, ['execution in forked process', 'more-data'], { fork: true });

    console.log(cron.start() ? `started at ${localTimeString()}` : 'already started');

    console.log(await cron.stop(Duration) ? `stopped at ${localTimeString()}` : 'already stopped');

    console.log();
}

async function immediateStartWithCrontab() {
    console.log('immediate start with crontab file');

    let cron = new CronEngine(SampleCrontab);
    console.log('started at', localTimeString());

    console.log(await cron.stop(Duration) ? `stopped at ${localTimeString()}` : 'already stopped');

    console.log();
}

async function delayedStartWithCrontab() {
    console.log('delayed start with crontab file');

    let cron = new CronEngine(SampleCrontab, true);

    console.log(cron.start() ? `started at ${localTimeString()}` : 'already started');

    console.log(await cron.stop(Duration) ? `stopped at ${localTimeString()}` : 'already stopped');

    console.log();
}

// Main

(async () => {
    await immediateStart();
    await delayedStart();
    await immediateStartWithCrontab();
    await delayedStartWithCrontab();
})();
