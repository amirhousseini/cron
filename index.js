/**
 * This module implements classes and functions related to a cron-like service.
 * Cron schedule expressions follow GNU's crontab specifications
 * (see https://www.gnu.org/software/mcron/manual/html_node/Crontab-file.html).
 */

'use strict';

const { homedir, EOL } = require('node:os');
const { cwd, stdout, stderr, exit } = require('node:process');
const { basename, dirname, resolve, sep: pathSeparator, delimiter: pathDelimiter } = require('node:path');
const { existsSync } = require('node:fs');
const { open, readFile, watch } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const { fork } = require('node:child_process');
const { Worker } = require('node:worker_threads');

/**
 * Default schedule expression: every minute
 */
const DefaultSchedule = '* * * * *';

/**
 * Supported schedule expression aliases.
 */
const ScheduleAlias = {
    '@yearly':   '0 0 1 1 *',   // Once a year (January 1st at 00:00)
    '@annually': '0 0 1 1 *',   // Alias for @yearly (January 1st at 00:00)
    '@monthly':  '0 0 1 * *',   // Once a month im Monat (1st day of month at 00:00)
    '@weekly':   '0 0 * * 0',   // Once a week (Sunday at 00:00)
    '@daily':    '0 0 * * *',   // Once daily (at 00:00)
    '@midnight': '0 0 * * *',   // Alias for @daily, midnight (at 00:00)
    '@hourly':   '0 * * * *'    // Every hour (at 0 minutes)
}

/*
 * One minute in milliseconds
 */
const OneMinute = 60 * 1000;

/**
 * Number of fields in schedule expressions
 */
const FieldCount = 5;

/*
 * Schedule field indexes
 */
const Field = {
    Minute: 0,
    Hour: 1,
    DayOfMonth: 2,
    Month: 3,
    DayOfWeek: 4,
    ReverseDayOfMonth: 5    // Not an actual field in schedule expressions
}

/*
 * Schedule field names to use in messages
 */
const FieldNames = [
    'minute', 'hour', 'day-of-month', 'month', 'day-of-week', 'reverse-day-of-month'
]

/*
 * Abbreviated month names all lowercase
 */
const MonthNames = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

/*
 * Abbreviated week day names all lowercase
 */
const DayNames = [
    'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
];

/*
 * Value validator functions
 */
const ValueValidators = [
    (n) => 0 <= n && n <= 59,       // Minutes
    (n) => 0 <= n && n <= 23,       // Hours
    (n) => n && -9 <= n && n <= 31, // Day-of-month (-3, -2 and -1 represent the last three days of month)
    (n) => 1 <= n && n <= 12,       // Month
    (n) => 0 <= n && n <= 7         // Day-of-week   
];

/**
 * Custom error thrown by CronSchedule with invalid cron schedule expression. 
 */
class CronScheduleError extends Error {
  constructor(message, options) {
    super(message, options);
  }
}

/**
 * CronSchedule is the parsed representation of a cron schedule expression as specified by GNU's crontab.
 * It is mainly used by CronEngine, but can be used to separately validate a cron schedule expression.
 */
class CronSchedule {

    #expression;
    #alias;
    #values = [];

    /**
     * Construct a CronSchedule object by parsing the given cron schedule expression.
     * @constructor
     * @param {string} expression Optional cron schedule expression. Defaults to every minute.
     * @throws {TypeError} if expression is not a string.
     * @throws {CronScheduleError} if syntax error.
     */
    constructor(expression = DefaultSchedule) {
        if (typeof expression !== 'string') {
            throw new TypeError('Schedule expression must be a string');
        }
        this.#parse(expression);
    }

    /*
     * Parse the cron schedule expression.
     * @param {string} expression Cron schedule expression.
     * @throws {CronScheduleError} if syntax error.
     */
    #parse(expression) {
        // Trim the expression by removing leading and trailing spaces,
        // and squeezing sequences of blanks to single space characters
        this.#expression = expression.trim().replaceAll(/\s+/g, ' ');

        // Replace an alias by the corresponding expression
        if (this.#expression.startsWith('@')) {
            this.#alias = this.#expression;
            this.#expression = ScheduleAlias[this.#alias];
            if (!this.#expression) {
                throw new CronScheduleError(`Invalid alias: "${this.#alias}"`);
            }
        }

        // Split the cron expression into fields and parse them individually
        let fields = this.#expression.split(' ');
        if (fields.length !== FieldCount) {
            throw new CronScheduleError(`Invalid number of fields (${fields.length} instead of ${FieldCount})`);
        }
        fields.forEach((fieldExpr, fieldIndex) => {
            let [ valuesListExpr, stepExpr, more ] = fieldExpr.split('/');
            if (more) {
                throw new CronScheduleError(`Illegal ${FieldNames[fieldIndex]} field expression: "${fieldExpr}"`);
            }

            // Parse the step part of the field
            let step = 1;
            if (stepExpr) {
                if (/^\d+$/.test(stepExpr)) {
                    step = parseInt(stepExpr);
                } else {
                    throw new CronScheduleError(`Illegal step expression in ${FieldNames[fieldIndex]} field: "${stepExpr}"`);
                }
            }

            // Parse the values part of the field
            let values = new Set();
            if (valuesListExpr === '*') {
                // The field consists of the wildcard character
                switch (fieldIndex) {
                    case Field.Minute:
                        for (let n = 0; n <= 59; n += step) values.add(n); break;
                    case Field.Hour:
                        for (let n = 0; n <= 23; n += step) values.add(n); break;
                    case Field.DayOfMonth:
                        for (let n = 1; n <= 31; n += step) values.add(n); break;
                    case Field.Month:
                        for (let n = 1; n <= 12; n += step) values.add(n); break;
                    case Field.DayOfWeek:
                        for (let n = 0; n <= 7; n += step) values.add(n); break;
                }
            } else {
                // Split the list of comma-separated expressions, and parse them individually
                valuesListExpr.split(',').map(valuesExpr => {
                    // An expression is either a single value or a dash-separated pair of values to express a range of value
                    let res;
                    if ((res = /^(_?\d+)(?:-(\d+))?$/.exec(valuesExpr))) {
                        collectNumbers(parseInt);
                    } else if (fieldIndex === Field.Month &&
                               (res = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))?$/i.exec(valuesExpr))) {
                        // Increment index by one to obtain one-based month values
                        collectNumbers(name => MonthNames.indexOf(name.toLowerCase()) + 1);
                    } else if (fieldIndex === Field.DayOfWeek &&
                               (res = /^(sun|mon|tue|wed|thu|fri|sat|sun)(?:-(sun|mon|tue|wed|thu|fri|sat|sun))?$/i.exec(valuesExpr))) {
                        collectNumbers(name => DayNames.indexOf(name.toLowerCase()));
                    } else {
                        throw new CronScheduleError(`Invalid ${valuesExpr.indexOf('-') < 0 ? 'value' : 'range values'} in ${FieldNames[fieldIndex]} field: "${valuesExpr}"`);
                    }

                    function collectNumbers(parse) {
                        let [, first, last] = res;
                        let validate = ValueValidators[fieldIndex];
                        let n1 = parse(first.replace('_', '-'));
                        if (!validate(n1)) {
                            throw new CronScheduleError(`Illegal value in ${FieldNames[fieldIndex]} field: "${valuesExpr}"`);
                        }
                        if (last === undefined) {
                            // Single value case
                            values.add(n1);
                        } else {
                            // Range of values case
                            let n2 = parse(last);
                            if (!validate(n2)) {
                                throw new CronScheduleError(`Illegal value in ${FieldNames[fieldIndex]} field: "${valuesExpr}"`);
                            }
                            if (n2 <= n1) {
                                throw new CronScheduleError(`Invalid range expression in ${FieldNames[fieldIndex]} field: "${valuesExpr}"`);
                            }
                            for (let n = n1; n <= n2; n += step) values.add(n);
                        }
                    }
                });

            }

            // Final adjustments
            if (fieldIndex === Field.DayOfMonth) {
                // Segregate negative day-of-month values into a separate set
                let array = [...values.values()];
                this.#values[Field.ReverseDayOfMonth] = new Set(array.filter(n => n < 0));
                values = new Set(array.filter(n => n > 0));
            } else if (fieldIndex === Field.Month) {
                // Make month values zero-based internally
                let array = [...values.values()];
                values = new Set(array.map(n => n - 1));
            }

            this.#values[fieldIndex] = values;
        });
        this.#values[Field.ReverseDayOfMonth] ||= new Set();
    }

    /**
     * Return the cron schedule expression.
     * @returns {string} 
     */
    get expression() {
        return this.#expression;
    }

    /**
     * Return the alias if the expression was specified as alias, undefined if not.
     * @returns {string} 
     */
    get alias() {
        return this.#alias;
    }

    /**
     * Return an object with the field values resulting from the parsing of the cron expression.
     * Object keys are field names, e.g. "minute".
     * @returns {Object}
     */
    get values() {
        let obj = {};
        for (let fieldIndex of Object.values(Field)) {
            obj[FieldNames[fieldIndex]] = [...this.#values[fieldIndex].values()].sort((a, b) => a - b);
        }
        // Month names one-based as specified in expressions, although they are zero-based internally
        obj.month = obj.month.map(n => n + 1);
        return obj;
    }

    /**
     * Boolean function returning true if the given timestamp or date matches this cron schedule.
     * @param {Date|number} date Optional date/time or timestamp to check; defaults to the current date/time.
     * @returns {boolean}
     */
    matches(date = Date.now()) {
        // Get the date corresponding to the argument
        date = new Date(date);
        if (!(date.getMilliseconds() === 0 && date.getSeconds() === 0)) return false;
        let matchMinutes = this.#values[Field.Minute].has(date.getMinutes());
        let matchHours = this.#values[Field.Hour].has(date.getHours());
        let matchDayOfMonth = this.#values[Field.DayOfMonth].has(date.getDate()) || this.#matchesReverse(date);
        let matchMonth = this.#values[Field.Month].has(date.getMonth());
        let matchDayOfWeek = this.#values[Field.DayOfWeek].has(date.getDay());
        return matchMinutes && matchHours && matchDayOfMonth && matchMonth && matchDayOfWeek;
    }

    /*
     * Boolean function returning true if the given date matches any reverse day-of-month values
     * of this cron schedule.
     * @param {Date|number} date Optional date/time or timestamp to check; defaults to the current date/time.
     * @return {boolean}
     */
    #matchesReverse(date = Date.now()) {
        for (let offset of this.#values[Field.ReverseDayOfMonth]) {
            // Clone the given date to be able to mutate it
            let workDate = new Date(date);
            // Roll the date by the current offset (offset are negative values)
            workDate.setDate(date.getDate() - offset);
            // Check whether this makes the date reach the first day of the month.
            if (workDate.getDate() === 1) return true;
        }
        return false;
    }

    /**
     * Return the next timestamp matching this schedule.
     * @param {Date|number} from Optional date/time or timestamp from when to check; defaults to the current date/time.
     * @return {number} Return the number of milliseconds since Epoch.
     */
    nextMatch(from = Date.now()) {
        // Get the timestamp corresponding to the argument
        if (typeof from !== 'number') from = from.getTime();
        // Calculate the timestamp of the following round minute
        let time = from + OneMinute - from % OneMinute;
        // Iterate over round minutes until a match
        while (!this.matches(time)) time += OneMinute;
        return time;
    }
}

/**
 * Custom error class used by FileLocator when a file path cannot be resolved. 
 */
class ResolutionError extends Error {
  constructor(message, options) {
    super(message, options);
  }
}

/**
 * Class encapsulating file location paths for resolving relative file paths.
 */
class FileLocator {

    #paths;
    #list;

    /**
     * Construct a FileLocator with optional supplemental paths.
     * The supplemental paths can themselves be relative paths.
     * They are resolved against the primordial paths, which consist of the standard
     * location paths, extended by the home directory, the current working directory,
     * and the main path.
     * The supplemental paths can also take the form of OS path specifications,
     * with multiple paths delimited by an OS specific separator character.
     * @param {Array<string>} paths Supplemental paths.
     */
    constructor(...paths) {
        this.#paths = (paths?.length ? paths.flat() : []);
        this.#build();
    }

    /*
     * Build the resolution paths.
     */
    #build() {
        // Build the primordial location paths
        let primordials = new Set([ homedir(), cwd(), require.main?.path, ...module.paths]);
        // Remove defensively possibly null and undefined members.
        primordials.delete(null);
        primordials.delete(undefined);

        // Collect the supplemental paths to be added to the location paths as a set,
        // filtering out undefined or empty paths, and finally trimming paths.
        let supplementals = new Set(this.#paths
            .reduce((prev, curr) => {
                return (curr && curr.trim()) ? prev.concat(curr.trim().split(pathDelimiter)) : prev;
            }, [])
            .filter(p => p && p.trim())
            .map(p => p.trim()));

        // Resolve the supplemental paths against the primordial paths
        let pathSet = new Set(primordials);
        primordials.forEach(
            from => supplementals.forEach(
                to => pathSet.add(resolve(from, to))));

        // Convert the resulting set into an array
        this.#list = [...pathSet.values()];
    }
    
    /**
     * Return the list of resolution paths.
     * @returns {Array<string>} Return the list of paths used for resolution.
     */
    get list() { return this.#list };

    /*
     * Resolve a file path (cannot be a directory path).
     * @param {string} path File path to resolve. Can be a simple name, a relative, or an absolute path.
     * @param {string} message Alternative message to use in exceptions with code MODULE_NOT_FOUND, instead of the default.
     * @returns {string} Return the absolute path.
     * @throws {ResolutionError} if the file path could not be resolved.
     * @throws {Error} if any other error occurs.
     */
    resolve(path, message) {
        // Transform a simple name into a relative path
        // (because require.resolve only supports paths, not simple names)
        if (!path.startsWith('.' + pathSeparator) && !path.startsWith('..' + pathSeparator) && !path.startsWith(pathSeparator)) {
            path = '.' + pathSeparator + path;
        }
        // Resolve the file path
        try {
            return require.resolve(path, { paths: this.#list })
        } catch (err) {
            if (err.code === 'MODULE_NOT_FOUND') {
                throw new ResolutionError(message || `File not found: "${path}"`);
            } else {
                throw err;
            }
        }
    }

}

/**
 * CronEngine is a background service executing recurring scheduled tasks.
 * The service can be started and stopped at any time, starts immediately by default.
 * Any number of tasks can be registered and deregistered at any time.
 * Tasks are executed in a fire and forget fashion. This means that there is no
 * communication between the tasks and the service and the service does not monitor
 * tasks' execution. Hence the service will not attempt to abort looping tasks or
 * skip faulty tasks. Also deregistrations do not abort corresponding running tasks.
 * Schedules are specified according to GNU's crontab specifications.
 * Tasks are either functions or modules, both with optional arguments.
 * Functions are always executed in the same thread as the service. Modules, however,
 * are executed as worker threads or as forked child processes.
 * Execution of OS commands is not supported.
 * There is no logging of the operations.
 */
class CronEngine {

    #jobs = new Map();
    #counter = 0;
    #timer;
    
    /**
     * Create a CronEngine object.
     * The option "delayStart" specifies whether the cron engine must start immediately or not.
     * @constructor
     * @param {Object} options Options.
     */
    constructor(options = { delayStart: false }) {
        options = Object.assign({}, { delayStart: false }, options);
        if (!options.delayStart) this.start();
    }
    
    /**
     * Register a job representing a recurring task.
     * A task is either a function or an external module specified by its absolute path.
     * As an external module the task is executed in a worker thread by default,
     * (see "node:worker_threads.Worker"), or in a forked process (see "node:child_process.fork")
     * when options.fork is set to true.
     * At execution time tasks are passed as arguments the job id, the cron schedule expression,
     * the target time, and the optional arguments specified when registered.
     * With external modules all data are stringified before being passed as arguments.
     * It is also possible to pass as options the ones specified by "node:worker_threads.Worker"
     * and "node:child_process.fork".
     * @param {string|CronSchedule} schedule Cron schedule expression or CronSchedule object. Defaults to every minute.
     * @param {Function|string} task Task to be executed. Is either a function or a module path.
     * @param {Array<any>} args Optional arguments to be passed alongside the standard arguments to the task at execution time.
     * @param {Object} options Options.
     * @returns {number} Return the unique job identification.
     * @throws {TypeError} if an argument has an invalid type.
     * @throws {CronScheduleError} if schedule is invalid.
     * @throws {Error} if a module path is not found.
     */
    registerJob(schedule = DefaultSchedule, task, args, options = {}) {
        // Validate schedule
        if (typeof schedule === 'string') {
            schedule = new CronSchedule(schedule);
        } else if (!(typeof schedule === 'object' && schedule.constructor === CronSchedule)) {
            throw new TypeError('Schedule must be a string or a CronSchedule');
        }
        // Validate task
        if (typeof task !== 'function' && typeof task !== 'string') {
            throw new TypeError(`Task is a ${typeof task}; must be function or a string`);
        }
        if (typeof task === 'string' && !existsSync(task)) {
            throw new Error(`Task "${task}" not found`);
        }
        // Obtain a unique job identification by incrementing the registry counter
        let id = ++this.#counter;
        // Add an entry to the internal job map and return the unique job identification
        this.#jobs.set(id, { schedule, task, args, options });
        return id;
    }

    /**
     * Deregister a specific job. This does not abort a corresponding already running task.
     * @param {number} jobId Unique job identification returned by the function registerJob().
     * @returns {boolean} Return true if the given job was registered and is now deregistered.
     */
    deregisterJob = (jobId) => jobId && jobId > 0 && this.#jobs.delete(jobId);

    /**
     * Deregister all jobs. This does not abort already running tasks.
     */
    deregisterAllJobs = () => { this.#jobs.clear(); this.#counter = 0; }

    /**
     * Return the list of currently registered tasks sorted by their job id (i.e. the time of their registration).
     * @returns {Array<Object>} Return an array of objects with job id, schedule expression, task, arguments, and options.
     */
    listJobs = () =>
        [...this.#jobs.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([id, { schedule, task, args, options }]) =>
            ({ id, schedule: schedule.expression, task, args, options }));

    /*
     * Select tasks due for execution by comparing their schedule expression to the target time specified,
     * then execute them in the order of their registration time.
     * @param {number} time Target time in milliseconds; defaults to the current time.
     */
    #executeDueTasks = (time = Date.now()) => {
        [...this.#jobs.entries()]
        .filter(([, { schedule }]) => schedule.matches(time))
        .sort((a, b) => a[0] - b[0])
        .forEach(([id, { schedule, task, args, options }]) => {
            if (typeof task === 'function') {
                try {
                    setImmediate(task, id, schedule.expression, time, args);
                } catch (err) {
                    logError(`Failed to execute function "${task}" with arguments "${args}"`, err);
                }
            } else {
                // All arguments are passed as strings
                let argv = [id.toString(), schedule.expression, time.toString()];
                // Add optional argument, stringifying objects to JSON.
                if (args) {
                    argv.push(typeof args === 'object' ? JSON.stringify(args) : args.toString());
                }
                if (options?.fork) {
                    fork(task, argv, options);
                } else {
                    try {
                        new Worker(task, { argv }, options);
                    } catch (err) {
                        logError(`Failed to execute module "${task}" with arguments "${args}"`, err);
                    }
                }
            }
        });
    }

    /*
     * Recursively set a timer to expire after every plain minute and execute tasks due,
     * passing the target expiration time as argument.
     * The function must be initially called without arguments.
     * @param {number} delay Timer delay in milliseconds
     * @param {number} expirationTime Expiration timestamp in milliseconds
     */
    #setTimer(delay, expirationTime) {
        if (!arguments.length) {
            // Initialize delay and expirationTime
            let currentTime = Date.now();
            delay = OneMinute - currentTime % OneMinute;
            expirationTime = currentTime + delay;
        }
        this.#timer = setTimeout(() => {
            // Execute any due tasks
            this.#executeDueTasks(expirationTime);
            // Reset the timer
            expirationTime += OneMinute;
            delay = expirationTime - Date.now();
            this.#setTimer(delay, expirationTime);
        }, delay);
    }

    /**
     * Start the cron engine.
     * @returns {boolean} Return true if the cron engine was stopped and is now running.
     */
    start() {
        if (this.#timer) return false;
        this.#setTimer();
        return true;
    }

    /**
     * Stop the cron engine. Currently running tasks in forked processes are not aborted.
     * @returns {boolean} Return true if the cron engine was running and is now stopped.
     */
    stop() {
        if (!this.#timer) return false;
        clearTimeout(this.#timer);
        this.#timer = undefined;
        return true;
    }

    /**
     * Boolean function returning whether the cron engine is running (i.e. active) or not.
     * @returns {boolean} Return true if the cron engine is currently running
     */
    get isRunning() { return this.#timer != undefined; }

}

/**
 * CrontabService is a background service executing recurring scheduled tasks specified
 * through a crontab-like file (@see @function parseCrontabFile and @class CronEngine).
 * The service can be started and stopped at any time, starts immediately by default.
 * All operations are logged to standard output. All errors are logged to standard error.
 */
class CrontabService {

    #path;
    #options;
    #locator;
    #controller;
    #engine;

    /**
     * Create a CrontabService object.
     * The option "delayStart" specifies whether the service must start immediately or not.
     * The option "locationPaths" provides supplemental paths for looking up the crontab file and the module files.
     * The option "monitorCrontab" specifies whether the crontab file should be monitored for changes,
     * reloading it when it has changed.
     * @constructor
     * @param {string} path Path of the crontab file.
     * @param {Object} options Options.
     * @throws {Error} if the specified crontab file does not exist, cannot be access, has no entries or has errors.
     */
    constructor(path, options = { delayStart: false, locationPaths: undefined, monitorCrontab: true }) {
        // Set options defaults
        this.#options = Object.assign({}, { delayStart: false, locationPaths: undefined, monitorCrontab: true }, options);
        this.#locator = new FileLocator(this.#options.locationPaths);
        try {
            // Resolve the crontab path
            this.#path = this.#locator.resolve(path);
            // Create the cron engine
            this.#engine = new CronEngine({ delayStart: true });
            // Load the crontab file
            this.#handleCrontabFile();
            // Activate the crontab file monitoring if requested
            if (this.#options.monitorCrontab) {
                logMessage(`Activate monitoring of the crontab file`);
                this.#controller = new AbortController();
                monitorFile(this.#path, (event) => this.#handleCrontabFile(event), this.#controller.signal);
            } else {
                logMessage(`Do not activate monitoring of the crontab file`);
            }
            // Start the cron engine unless delayed
            if (!this.#options.delayStart) {
                this.start();
            }
        } catch (err) {
            if (err instanceof ResolutionError) {
                logError(`Crontab file "${path}" not found`);
            } else {
                logError("Failed to start the crontab service", err);
            }
        }
    }
    
    /*
     * Handle the crontab file, initially and whenever changes occur and monitoring
     * is activated.
     * If the file has been modified, update all jobs. 
     * If the crontab file has been deleted, deregistered all jobs.
     * If errors occur, they are written to standard error, and currently registered
     * jobs remain active.
     * @param {string} eventType Event type as notified from the monitoring activity.
     *  Do not specify an event type to load the crontab file initially.
     */
    #handleCrontabFile(eventType) {
        const loadJobs = (annoucement, confirmation) => {
            logMessage(annoucement);
            let entries = parseCrontabFile(this.#path);
            logMessage(confirmation);
            entries.then((entries) => this.#registerAllJobs(entries));
        }
        const unloadJobs = (annoucement) => {
            logMessage(annoucement);
            this.#deregisterAllJobs();
        }
        try {
            if (!eventType) {
                loadJobs(`Initial load of the crontab file "${this.#path}"`, `Crontab file loaded`);
            } else if (eventType === 'create') {
                loadJobs(`A new crontab file "${this.#path}" has been created`, `Crontab file reloaded`);
            } else if (eventType === 'modify') {
                loadJobs(`The crontab file "${this.#path}" has been modified`, `Crontab file reloaded`);
            } else if (eventType === 'delete') {
                unloadJobs(`The crontab file "${this.#path}" has been moved or deleted`);
            }
        } catch (err) {
            logError(`Failed to load the crontab file "${this.#path}"`, err);
        }
    } 
    
    /*
     * Register the jobs parsed from the crontab file.
     * @param {Array<Array<any>>} entries The entries returned by parseCrontabFile().
     */
    #registerAllJobs(entries) {
        // Defensively deregister all jobs
        this.#engine.deregisterAllJobs();
        if (entries.length) {
            for (let entry of entries) {
                let [ lineNbr, schedule, , path, ] = entry;
                try {
                    let [ , schedule, flag, path, args ] = validateCrontabEntry(entry, this.#locator);
                    this.#engine.registerJob(schedule, path, args, { fork: flag === 'F' });
                } catch(err) {
                    if (err instanceof CronScheduleError) {
                        logError(`Invalid schedule expression "${schedule}" at crontab line ${lineNbr}`, err);
                    } else if (err instanceof ResolutionError) {
                        logError(`Module at crontab line ${lineNbr} not found: ${path}`, err);
                    } else {
                        logError(err);
                    }
                }
            }
            logMessage(`${this.#engine.listJobs().length} jobs scheduled for execution`);
        } else {
            logMessage("No jobs to schedule.");
        }
    }
    
    /*
     * Deregister all jobs.
     */
    #deregisterAllJobs() {
        this.#engine.deregisterAllJobs();
        logMessage("All jobs unscheduled");
    }

    /**
     * Start the service.
     * @returns {boolean} Return true if the service was stopped and is now running.
     */
    start() {
        logMessage("Start service");
        if (!this.isRunning) {
            this.#engine.start();
            return true;
        } else {
            logMessage("Service is already started");
            return false;
        }
    }

    /**
     * Stop the service. Currently running tasks are not aborted.
     * @returns {boolean} Return true if the service was running and is now stopped.
     */
    stop() {
        logMessage("Stop service");
        if (this.isRunning) {
            if (this.#controller) this.#controller.abort();
            this.#engine.stop();
            return true;
        } else {
            logMessage("Service already stopped");
            return false;
        }
    }

    /**
     * Boolean function returning whether the service is running (i.e. active) or not.
     * @returns {boolean} Return true if the service is currently running.
     */
    get isRunning() { return this.#engine !== undefined && this.#engine.isRunning; }

    /**
     * Run a CrontabService based on the two environment variables CRONTAB_PATH and LOCATION_PATHS. 
     */
    static run() {
        let crontabPath = process.env.CRONTAB_PATH;
        if (!crontabPath) {
            logError("Missing required environment variable CRONTAB_PATH");
            return;
        }
        let locationPaths = process.env.LOCATION_PATHS;
        new CrontabService(crontabPath, { locationPaths });
    }

}

/*
 * Return the local date/time string of the specified date in the format "YYYY-MM-DD hh:mm:ss.iii".
 * @param {Date|number} date Optioanl Date or number of milliseconds since Eapoch: defaults to the current date.
 * @return {string} The formatted local date/time.
 */ 
function localDateTimeString(date = new Date()) {
    const fmt = (num = 0, siz = 2) => num.toString().padStart(siz, "0");
    // Get the date corresponding to the argument
    date = new Date(date);
    let dateStr = [ date.getFullYear(), fmt(date.getMonth() + 1), fmt(date.getDate()) ].join('-');
    let timeStr = [ fmt(date.getHours()), fmt(date.getMinutes()), fmt(date.getSeconds())].join(':');
    return dateStr + ' ' + timeStr + '.' + fmt(date.getMilliseconds(), 3);
}

/**
 * Log a message to standard output.
 * @param {string} msg Message to log.
 */
function logMessage(msg) {
    stdout.write(`${localDateTimeString()} - ${msg}`);
    stdout.write(EOL);
}

/**
 * Log an error to standard error.
 * @param {string} msg Optional message to log.
 * @param {Error|Object} err Optional error object or object with similar properties.
 */
function logError(msg, err) {
    if (!arguments.length) {
        stderr.write(`${localDateTimeString()} - ERROR> `);
    } else if (arguments.length === 1 && msg instanceof Error) {
        stderr.write(`${localDateTimeString()} - ERROR> ${msg.message}`);
        if (msg?.cause?.message) stderr.write(`; cause: ${msg.cause.message}`);
    } else {
        stderr.write(`${localDateTimeString()} - ERROR> ${msg}`);
        if (err?.message) stderr.write(`. ${err.message}`);
        if (err?.cause?.message) stderr.write(`; cause: ${err.cause.message}`);
    }
    stderr.write(EOL);
}

/**
 * Asynchronous function to parse a crontab-like file into an array of objects.
 * Only lexical parsing is performed. Parsed data are not validated.
 * Each object is an array of following data:
 *  - {number} line number (one-based)
 *  - {string} schedule expression
 *  - {string} optional flag
 *  - {string} module path
 *  - {Array<any>} optional arguments.
 * 
 * Crontab entries must have the following format:
 * 
 *      +----------------------------------  Schedule expression
 *      |       +--------------------------  Optional fork flag
 *      |       |         +----------------  Module path
 *      |       |         |            +--   Optional arguments
 *      |       |         |            |
 *  ---------   -   -------------   --------
 *  * * * * *   F   ./module/path   args ...
 *  | | | | |
 *  | | | | +--  Week
 *  | | | +----  Month
 *  | | +------  Day
 *  | +--------  Hours
 *  +----------  Minutes
 *
 * @param {string} path File path.
 * @throws {Error} if the file does not exist or could not be read.
 * @returns {Promise<Array<Array<any>>>} Promise of an array of parsed entries.
 */
async function parseCrontabFile(path) {
    let entries = [];
    // Process the file line by line
    let file = await open(path);
    let lineNbr = 0;
    for await (let line of file.readLines()) {
        lineNbr++;
        line = line.trim();
        // Skip comment and empty lines
        if (!line.startsWith('#') && line.length)  {
            // Parse the line into tokens
            let tokens = parseCommandLine(line);

            // Consume the tokens making up the schedule expression
            let schedule; 
            if (tokens[0].startsWith('@')) {
                // Potentially an alias
                schedule = tokens.shift();
            } else {
                schedule = tokens.slice(0, 5).join(' ');
                tokens = tokens.slice(5);
            }

            // Consume the optional flag 
            let flag;
            if (tokens[0]?.length == 1) {
                flag = tokens.shift()
            }

            // Consume the tokens making up the module path
            let path = tokens.shift();
            // The remaining tokens are the optional arguments

            // Return the line number and the parsed data
            entries.push([ lineNbr, schedule, flag, path, tokens ]);
        }
    }
    return entries;
}

/**
 * Validate a crontab-like file entry.
 * Each entry is an array of following data:
 *  - {number} line number (one-based)
 *  - {string} schedule expression
 *  - {string} optional flag
 *  - {string} module path
 *  - {Array<any>} optional arguments.
 * @param {Array<any>} entry Entry
 * @param {FileLocator} fileLocator Optional file locator for resolving file paths.
 * @return {Objec} The entry with the schedule expression replaced by a CronSchedule object,
 *  and the path resolved against the file locator.
 * @throws {CronScheduleError} if the schedule expression is invalid.
 * @throws {ResolutionError} if the module is not found.
 * @throws {Error} if the fork flag is invalid.
 */
function validateCrontabEntry(entry, fileLocator = new FileLocator()) {
    let [ lineNbr, schedule, flag, path, args ] = entry;
    // Validate schedule
    schedule = new CronSchedule(schedule);
    // Validate flag
    if (flag != undefined && flag != 'F') {
        throw new Error(`Invalid fork flag "${flag}" at crontab line ${lineNbr}`);
    }
    // Validate task
    path = fileLocator.resolve(path);
    return [ lineNbr, schedule, flag, path, args ];
}

/**
 * Parse and validate a crontab file, and write the result to standard output.
 * The option "locationPaths" provides supplemental paths for looking up the crontab file and the module files.
 * The main path, the current directory, and the home directory are automatically part of the location paths.
 * @param {string} path Path of the crontab file.
 * @param {Object} options Options.
 * @return {number} Status code 0 for success, 1 for failure.
 */
function validateCrontabFile(path, options = { locationPaths: undefined }) {
    // Set options defaults
    options = Object.assign({}, { locationPaths: undefined }, options);
    // Build the file locator
    let locator = new FileLocator(options.locationPaths);
    try {
        // Resolve the crontab path
        path = locator.resolve(path);
        let count = 0;
        parseCrontabFile(path).then((entries) => {
            for (let entry of entries) {
                let [ lineNbr, schedule, , path, ] = entry;
                try {
                    validateCrontabEntry(entry, locator);
                    count++;
                } catch (err) {
                    if (err instanceof CronScheduleError) {
                        stdout.write(`ERROR> Invalid schedule expression "${schedule}" at crontab line ${lineNbr}${EOL}`);
                    } else if (err instanceof ResolutionError) {
                        stdout.write(`ERROR> Module at crontab line ${lineNbr} not found: ${path}${EOL}`);
                    } else {
                        stdout.write(`ERROR> ${err.message}${EOL}`);
                    }
                }
            }
            stdout.write(`Crontab file "${path}"`);
            if (entries.length) {
                stdout.write(` is ${entries.length === count ? "valid" : "invalid"}${EOL}`);
            } else {
                stdout.write(` has no entries${EOL}`);
            }
        })
    } catch (err) {
        if (err instanceof ResolutionError) {
            stdout.write(`ERROR> Crontab file "${path}" not found${EOL}`);
        } else {
            stdout.write(`ERROR> ${err.message}${EOL}`);
        }
        exit(1);
    }
}

/**
 * Parse a command line provided as single string into an array of tokens.
 * Single and double quoted strings are recognized.
 * Escaped sequences are recognized and interpreted.
 * However, wildcards are not recognized and interpreted.
 * Tokens are trimmed from leading and trailing blanks.
 * Example:
 * Input: './sampleTask.js "arg\\"1\\" " "arg 2"'
 * Output: [ './sampleTask.js', 'arg"1" ', 'arg 2' ]
 * @param {string} input Command as text.
 * @returns {Array<string>} Array of terms.
 * @throws {Error} if quotes are unbalanced or escape sequences have invalid characters.
 */
function parseCommandLine(input) {

    // The states making up the internal state machine
    const State = {
        separator: "separator",
        unquoted: "unquoted",
        singleQuoted: "singleQuoted",
        doubleQuoted: "doubleQuoted",
        charEscape: "charEscape",
        hexCode: "hexCode",
    }

    // Current and previous states of the state machine
    let state, prevState;
    // Offset in the input string of the character being processed
    let offset;

    /*
     * Swith the state of the state machine, making the current state as the previous state.
     * @param {string} newState The new state to switch to.
     */
    const switchState = (newState) => {
        if (newState !== State.hexCode) prevState = state;
        state = newState;
    }

    /*
     * Return the character corresponding to the single letter used in escape sequence (like "\t").
     * @param  östring} c The single character appearing after the backslash character.
     * @returns {string} The corresponding character.
     */
    const letterToChar = (c) => {
        // Mappings to corresponding ASCII codes
        const letterToDecimal = {
            b: 8,   // backspace character
            t: 9,   // horizontal tab character
            n: 10,  // newline character
            v: 11,  // vertical tab character
            f: 12,  // form feed character
            r: 13,  // carriage return character
        }
        return String.fromCharCode(letterToDecimal[c]);
    }

    // Code characters appearing in escape sequences (actually only dhexadecimal characters)
    const code = [];
    let codeLen;

    /*
     * Initialize a new code.
     * @param {string} c The type of code: x for UTF-16, u for Unicode codes
     */
    const newCode = (c) => {
        code.length = 0;
        codeLen = c === 'x' ? 2 : 4;
    }

    /*
     * Convert the characters accumulated in the code variables to a character.
     * @param {number} radix Optional radix to use; defaults to 16.
     * @returns {string} Character corresponding to the code point.
     * @throws {Error} if code contains an invalid character.
     */ 
    const codeToChar = (radix = 16) => {
        let n = 0;
        for (let c of code) {
            //n = n * radix + parseInt(c, radix);
            n *= radix;
            n += parseInt(c, radix);
            if (isNaN(n)) throw new Error(`Invalid radix ${radix} character at offset ${offset}`);
        }
        return String.fromCharCode(n);
    }

    // The current token accumulating parsed characters 
    const token = [];
    // The resulting token array
    const tokens = [];

    /*
     * Initialize a new token, saving the previous token in the result array.
     * @param c Optional first character of the token
     */
    const newToken = (c) => {
        if (token.length) {
            // Convert the array of characters to a string and save the token to the result array
            tokens.push(token.join('').trim());
            // Reinitialize the current token
            token.length = 0;
        }
        // If provided, push the character into the new token
        if (c) token.push(c);
    }

    // The state machine implementation

    // Initialize the state
    state = State.separator;
    prevState = State.separator;
    offset = -1;

    // Iterate over the characters of the input
    for (const c of input) {
        offset++;
        // Print offset, current state, and character to process for debugging purpose
        //console.log(offset, state, `|${c}|`);
        switch (state) {
            case State.separator:
                switch (c) {
                    case '\'':
                        switchState(State.singleQuoted); newToken(); continue;
                    case '"':
                        switchState(State.doubleQuoted); newToken(); continue;
                    case ' ':
                    case '\b':
                    case '\t':
                    case '\n':
                    case '\v':
                    case '\f':
                    case '\r':
                        continue;
                    default:
                        switchState(State.unquoted); newToken(c);  continue;
                }
            case State.unquoted:
                switch (c) {
                    case '\'':
                        switchState(State.singleQuoted); newToken(); continue;
                    case '\"':
                        switchState(State.doubleQuoted); newToken(); continue;
                    case ' ':
                    case '\b':
                    case '\t':
                    case '\n':
                    case '\v':
                    case '\f':
                    case '\r':
                        switchState(State.separator); newToken(); continue;
                    default:
                        token.push(c); continue;
                }
            case State.singleQuoted:
                switch (c) {
                    case '\'':
                        switchState(State.separator); newToken(); continue;
                    case '\\':
                        switchState(State.charEscape); continue;
                    default:
                        token.push(c); continue;
                }
            case State.doubleQuoted:
                switch (c) {
                    case '"':
                        switchState(State.separator); newToken(); continue;
                    case '\\':
                        switchState(State.charEscape); continue;
                    default:
                        token.push(c); continue;
                }
            case State.charEscape:
                switch (c) {
                    case "'":
                    case '"':
                    case '\\':
                        token.push(c); continue;
                    case 'b':
                    case 't':
                    case 'n':
                    case 'v':
                    case 'f':
                    case 'r':
                        token.push(letterToChar(c)); continue;
                    case 'x':
                    case 'u':
                        switchState(State.hexCode); newCode(c); continue;
                    default:
                        token.push(c); switchState(prevState); continue;
                }
            case State.hexCode:
                if (code.length < codeLen) {
                    code.push(c); continue;
                } else {
                    token.push(codeToChar()); switchState(prevState); continue;
                }
        }
    }
    // Save the last token to the result array
    newToken();

    // Check for unbalanced quotes
    if (state === State.singleQuoted) {
        throw new Error("Unbalanced single quotes");
    } else if (state === State.doubleQuoted) {
        throw new Error("Unbalanced double quotes");
    }

    return tokens;
}

/**
 * Monitor a given file. The provided callback is called every time a change to the file occur.
 * This can be changes to the content of the file, or changes to the existence of the file.
 * @param {string} filePath Path of the file to monitor.
 *  The parent directory must exist, but the file may be missing.
 * @param {Function} callback Callback function called on file changes.
 *  The event type and the file path are passed as arguments.
 *  The event types are "create", "modify", and "delete".
 * @param {AbortSignal} signal Optional abort signal for aborting the operation.
 * @throws {Error} if the parent directory is moved or deleted.
 */
async function monitorFile(filePath, callback, signal) {

    let dirPath = dirname(filePath);
    let dirName = basename(dirPath);
    let baseName = basename(filePath);

    const digest = async (filePath) =>
        createHash('md5').update(await readFile(filePath, { encoding: 'utf8' })).digest('hex');

    let currDigest = existsSync(filePath) ? await digest(filePath) : undefined;
    let prevDigest = currDigest;

    try {
        let watcher = signal ? watch(dirPath, { signal }) : watch(dirPath);
        for await (const { eventType, filename } of watcher) {
            if (filename === dirName) {
                throw new Error(`Directory ${dirPath} has been moved or deleted`);
            }
            if (filename === baseName) {
                if (eventType === 'change') {
                    currDigest = await digest(filePath);
                    if (currDigest !== prevDigest) {
                        callback('modify', filePath);
                    }
                } else if (eventType === 'rename') {
                    if (existsSync(filePath)) {
                        currDigest = await digest(filePath);
                        callback('create', filePath);
                    } else {
                        currDigest = undefined;
                        callback('delete', filePath);
                    }
                }
                prevDigest = currDigest;
            }
        }
    } catch (err) {
        if (err.code !== 'ABORT_ERR') throw err;
    } 
}

module.exports = {
    FileLocator, ResolutionError,
    CronSchedule, CronScheduleError, DefaultSchedule, ScheduleAlias,
    CronEngine,
    parseCrontabFile, parseCommandLine, validateCrontabFile, 
    CrontabService,
    monitorFile
};
