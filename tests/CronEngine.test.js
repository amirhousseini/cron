/**
 * Unit test of the class CronEngine.
 */

'use strict';

const { suite, test, before, after } = require('node:test');
const { expect } = require('chai');

const { newTempDir, newTempFile, appendContent, purge } = require('./utils.js');
const { CronEngine, CronScheduleError } = require('../index.js');

// Code text

const DemoTaskCode = `
// The pseudo task simply logs the arguments passed by the cron engine
console.log('"%s" task %d -> %s %s', schedule, id, localTimeString(time), data);

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
`;

const DemoModuleCode = `
/**
 * Skeleton implementation of a module to be executed by the CronEngine as task.
 */
'use strict';

// Get the command-line arguments passed by the CronEngine
let [ id, schedule, time, data ] = require('node:process').argv.slice(2);

// De-stringify the arguments
id = parseInt(id);
time = parseInt(time);
if (data) data = JSON.parse(data);
${DemoTaskCode}
`;

// Task function
const TaskFunction = Function("id", "schedule", "time", "data", DemoTaskCode);

// Test suites

suite("Unit tests of class 'CronEngine' - Job management", { skip: false }, () => {

    let engine, taskModules = [];
    let validJobs, invalidJobs;

    /*
     * Create a CronEngine object with delayed start, two temporary task modules,
     * and valid and invalid jobs
     */
    before(() => {
        engine = new CronEngine({ delayStart: true });
        for (let i = 0; i < 2; i++) {
            let path = newTempFile(newTempDir());
            appendContent(path, DemoModuleCode);
            taskModules.push(path);
        }
        // Jobs with valid data and expected job id as last element
        validJobs = [
            // Job with function as task
            ['* * * * *', TaskFunction, ['execution_in_worker_thread'], 1],
            // Job with module as task, in forked process
            ['*/5 * * * *', taskModules[0], ["'execution in forked process'", 'more-data'], 2],
            // Job with module as task, in worker thread
            ['1-59/2 * * * *', taskModules[1], ['"execution in worker thread"', 'more-data-1', 'more-data-2'], 3],
        ];

        // Jobs with invalid data and expected error type as last element
        invalidJobs = [
            ['x * * * *', TaskFunction, ['execution_in_worker_thread'], CronScheduleError],
            ['*/5 * * * *', 'non/existing/file', ["'execution in forked process'", 'more-data'], Error],
            [123, taskModules[1], ['"execution in worker thread"', 'more-data-1', 'more-data-2'], TypeError],
        ];
    });

    /*
     * Purge temporary directories and files
     */
    after(() => purge());

    // Unit tests

    test("Registration of valid jobs", { skip: false }, () => {
        const forkOption = { fork: true };
        // Register jobs, verifying the returned id
        for (let i = 0; i < validJobs.length; i++) {
            let options = i === 1 ? forkOption : undefined;
            expect(engine.registerJob(validJobs[i][0], validJobs[i][1], validJobs[i][2], options)).to.equal(validJobs[i][3]);
        }
        // Verify list of jobs
        let jobs = engine.listJobs();
        expect(jobs.length).to.equal(validJobs.length);
        for (let i = 0; i < validJobs.length; i++) {
            expect(jobs[i]).to.have.all.keys('id', 'schedule', 'task', 'args', 'options');
            expect(jobs[i].id).to.equal(validJobs[i][3]);
            expect(jobs[i].schedule).to.equal(validJobs[i][0]);
            expect(jobs[i].task).to.equal(validJobs[i][1]);
            expect(jobs[i].args).to.deep.equal(validJobs[i][2]);
            expect(jobs[i].options).to.be.deep.equal(i === 1 ? forkOption : {});
        }
    });
    
    test("Registration of invalid jobs", { skip: false }, () => {
        for (let i = 0; i < invalidJobs.length; i++) {
            let regFn = function () { engine.registerJob(invalidJobs[i][0], invalidJobs[i][1], invalidJobs[i][2]); };
            let err = invalidJobs[i][3];
            expect(regFn).to.throw(err);
        }
    });

    test("De-registration of an existing job", { skip: false }, () => {
        // De-register second registered job
        expect(engine.deregisterJob(validJobs[1][3])).to.be.true;
        // Verify list of jobs
        let jobs = engine.listJobs();
        expect(jobs.length).to.equal(validJobs.length - 1);
        expect(jobs[0].id).to.equal(validJobs[0][3]);
        expect(jobs[1].id).to.equal(validJobs[2][3]);
    });

    test("De-registration of a non-existing job", { skip: false }, () => {
        expect(engine.deregisterJob(9999)).to.be.false;
        // Verify list of jobs
        let jobs = engine.listJobs();
        expect(jobs.length).to.equal(validJobs.length - 1);
        expect(jobs[0].id).to.equal(validJobs[0][3]);
        expect(jobs[1].id).to.equal(validJobs[2][3]);
    });

    test("De-registration of all jobs", { skip: false }, () => {
        expect(engine.deregisterAllJobs()).to.be.undefined;
        // Verify list of jobs is empty
        let jobs = engine.listJobs();
        expect(jobs.length).to.equal(0);
    });

});

suite("Unit tests of class 'CronEngine' - Job execution", { skip: false }, () => {

    let taskModules = [], jobs;

    /*
     * Create a CronEngine object with delayed start, two temporary task modules,
     * and valid and invalid jobs
     */
    before(() => {
        for (let i = 0; i < 2; i++) {
            let path = newTempFile(newTempDir());
            appendContent(path, DemoModuleCode);
            taskModules.push(path);
        }
        // Jobs data with expected job id as last element
        jobs = [
            // Job with function as task
            ['* * * * *', TaskFunction, ['execution_in_worker_thread'], 1],
            // Job with module as task, in forked process
            ['*/5 * * * *', taskModules[0], ["'execution in forked process'", 'more-data'], 2],
            // Job with module as task, in worker thread
            ['1-59/2 * * * *', taskModules[1], ['"execution in worker thread"', 'more-data-1', 'more-data-2'], 3],
        ];
    });

    /*
     * Purge temporary directories and files
     */
    after(() => purge());

    // Unit tests

    test("Is running by default", { skip: false }, () => {
        let engine = new CronEngine();
        expect(engine.isRunning).to.be.true;
        engine.stop();
    });

    test("Is running if started with option delayStart set to false", { skip: false }, () => {
        let engine = new CronEngine({ delayStart: false });
        expect(engine.isRunning).to.be.true;
        engine.stop();
    });

    test("Is not running if started with option delayStart set to true", { skip: false }, () => {
        let engine = new CronEngine({ delayStart: true });
        expect(engine.isRunning).to.be.false;
    });

    test("Running tasks", { skip: true }, () => {
        let engine = new CronEngine();
        // Register jobs
        for (let i = 0; i < jobs.length; i++) {
            let options = i === 1 ? { fork: true } : undefined;
            engine.registerJob(jobs[i][0], jobs[i][1], jobs[i][2], options);
        }
        setTimeout(() => {
            engine.stop();
            purge()
        }, 18 * 60 * 1000);
    });

});
