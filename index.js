/**
 * This module implements a cron-like service.
 * It exports two classes: CronSchedule and CronEngine.
 * CronEngine is the actual service.
 * CronSchedule is the parsed representation of a cron schedule expression as specified
 * by GNU's crontab (see https://www.gnu.org/software/mcron/manual/html_node/Crontab-file.html).
 */

'use strict';

const { homedir } = require('node:os');
const fs = require('node:fs');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
const { fork } = require('node:child_process');
const { Worker } = require('node:worker_threads');

/*
 * One minute in milliseconds
 */
const OneMinute = 60000;

/*
 * Cron field indexes
 */
const CronField = {
    Minute: 0,
    Hour: 1,
    DayOfMonth: 2,
    Month: 3,
    DayOfWeek: 4
}

/*
 * Cron schedule expression aliases
 */
const Alias = {
    //'@reboot': undefined,     // At system start (unsupported)
    '@yearly': '0 0 1 1 *',     // Once a year (January 1st at 00:00)
    '@annually': '0 0 1 1 *',   // Alias for @yearly (1. January 1st at 00:00)
    '@monthly': '0 0 1 * *',    // Once a month im Monat (first day of month at 00:00)
    '@weekly': '0 0 * * 0',     // Once a week (Sunday at 00:00)
    '@daily':  '0 0 * * *',     // Once daily (at 00:00)
    '@midnight': '0 0 * * *',   // Alias for @daily, midnight (at 00:00)
    '@hourly': '0 * * * *'      // Every hour ()
}

/*
 * Default cron expression: every minute
 */
const DefaultCronExpression = '* * * * *';

/*
 * Technical cron field names
 */
const FieldNames = [
    'minute', 'hour', 'day-of-month', 'month', 'day-of-week'
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

/**
 * CronSchedule is the parsed representation of a cron schedule expression as specified by GNU's crontab.
 * It is mainly used by CronEngine, but can also be used to validate cron schedule expression.
 */
class CronSchedule {

    #expression;
    #values = [];

    /**
     * Construct a CronSchedule object by parsing the given cron schedule expression.
     * @constructor
     * @param {String} cronExpr Optional cron schedule expression. Defaults to every minute.
     * @throws Error with diagnostics when parsing failure.
     */
    constructor(cronExpr) {
        cronExpr ||= DefaultCronExpression;
        if (typeof cronExpr !== 'string') {
            throw new TypeError('cronExpr must be a string');
        }
        // Trim the expression by removing leading and trailing spaces,
        // and squeezing sequences of blanks to single space characters
        this.#expression = cronExpr.trim().replaceAll(/\s+/g, ' ');
        // Parse the trimmed expression
        this.#parseExpression(this.#expression);
    }

    /*
     * Parse a cron schedule expression.
     * @param {String} cronExpr Trimmed cron schedule expression.
     * @throws Error with diagnostics when parsing failure.
     */
    #parseExpression(cronExpr) {
        if (CronSchedule.isAlias(cronExpr)) {
            let alias = Object.keys(Alias).find(key => key === cronExpr);
            if (!alias) {
                throw new Error(`Invalid alias: ${cronExpr}`);
            }
            cronExpr = Alias[alias];
        }
        let fields = cronExpr.split(/\s/);
        if (fields.length !== Object.keys(CronField).length) {
            throw new Error(`Invalid number of fields: ${fields.length} instead of ${Object.keys(CronField).length}`);
        }
        // Split the cron expression into fields and parse them individually
        fields.forEach((fieldExpr, fieldIndex) => {
            let [ valuesListExpr, stepExpr, more ] = fieldExpr.split('/');
            if (more) {
                throw new Error(`Illegal ${FieldNames[fieldIndex]} field expression: "${fieldExpr}"`);
            }

            // Parse the step part of the field
            let step = 1;
            if (stepExpr) {
                if (/^\d+$/.test(stepExpr)) {
                    step = parseInt(stepExpr);
                } else {
                    throw new Error(`Illegal step expression in ${FieldNames[fieldIndex]} field: "${stepExpr}"`);
                }
            }

            // Parse the values part of the field
            let values = new Set();
            if (valuesListExpr === '*') {
                // The field consists of the wildcard character
                switch (fieldIndex) {
                    case CronField.Minute:
                        for (let n = 0; n <= 59; n += step) values.add(n); break;
                    case CronField.Hour:
                        for (let n = 0; n <= 23; n += step) values.add(n); break;
                    case CronField.DayOfMonth:
                        for (let n = 1; n <= 31; n += step) values.add(n); break;
                    case CronField.Month:
                        for (let n = 0; n <= 11; n += step) values.add(n); break;
                    case CronField.DayOfWeek:
                        for (let n = 0; n <= 7; n += step) values.add(n); break;
                }
            } else {
                // Split the list of comma-separated expressions, and parse them individually
                valuesListExpr.split(',').map(valuesExpr => {
                    // An expresison is either a single value or a dash-separated pair of values to express a range
                    let res;
                    if ((res = /^(\d+)(?:-(\d+))?$/.exec(valuesExpr))) {
                        let validValues;
                        switch (fieldIndex) {
                            case CronField.Minute:
                                validValues = n => 0 <= n && n <= 59; break;
                            case CronField.Hour:
                                validValues = n => 0 <= n && n <= 23; break;
                            case CronField.DayOfMonth:
                                validValues = n => 1 <= n && n <= 31; break;
                            case CronField.Month:
                                validValues = n => 1 <= n && n <= 12; break;
                            case CronField.DayOfWeek:
                                validValues = n => 0 <= n && n <= 7; break;
                        }
                        collectNumbers(parseInt, validValues);
                        if (fieldIndex === CronField.Month) {
                            values = new Set([...values.values()].map(n => n - 1));
                        }
                    } else if (fieldIndex === CronField.Month &&
                               (res = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))?$/i.exec(valuesExpr))) {
                        collectNumbers(name => MonthNames.indexOf(name.toLowerCase()));
                    } else if (fieldIndex === CronField.DayOfWeek &&
                               (res = /^(sun|mon|tue|wed|thu|fri|sat|sun)(?:-(sun|mon|tue|wed|thu|fri|sat|sun))?$/i.exec(valuesExpr))) {
                        collectNumbers(name => DayNames.indexOf(name.toLowerCase()));
                    } else {
                        throw new Error(`Invalid ${valuesExpr.indexOf('-') < 0 ? 'value' : 'range values'} in ${FieldNames[fieldIndex]} field: "${valuesExpr}"`);
                    }

                    function collectNumbers(parse, validate = n => true) {
                        let [, first, last] = res;
                        let n1 = parse(first);
                        let n2 = parse(last || first);
                        if (n2 < n1) {
                            throw new Error(`Invalid range expression in ${FieldNames[fieldIndex]} field: "${valuesExpr}"`);
                        }
                        if (!validate(n1) || !validate(n2)) {
                            throw new Error(`Illegal value in ${FieldNames[fieldIndex]} field: "${valuesExpr}"`);
                        }
                        for (let n = n1; n <= n2; n += step) values.add(n)
                    }
                });
            }
            this.#values[fieldIndex] = values;
        });
    }

    /**
     * Boolean function returning true if the given cron schedule expression
     * is an alias.
     * @param {String|Array} cronExpr Cron schedule expression or array of already parsed fields.
     */
    static isAlias(cronExpr) {
        if (!cronExpr) return false;
        if (Array.isArray(cronExpr)) return cronExpr.length === 1 && cronExpr[0].startsWith('@');
        return cronExpr.startsWith('@');
    }

    /**
     * Return the trimmed cron schedule expression.
     * @returns {String} 
     */
    expression() {
        return this.#expression;
    }

    /**
     * Return an object with the field values resulting from the parsing of the cron expression.
     * The object keys are the field names, e.g. "minute".
     * @returns {Object}
     */
    values() {
        let data = {};
        for (let fieldIndex of Object.values(CronField)) {
            data[FieldNames[fieldIndex]] = [...this.#values[fieldIndex].values()].sort((a, b) => a - b);
        }
        return data;
    }

    /**
     * Boolean function returning true if the given timestamp or date matches this cron specifications.
     * @param {Date|Number} date Optional date/time or timestamp to check; defaults to the current date/time
     * @returns {Boolean}
     */
    matches(date = Date.now()) {
        // Get the date corresponding to the argument
        date = new Date(date);
        return date.getMilliseconds() === 0 && date.getSeconds() === 0 &&
               this.#values[CronField.Minute].has(date.getMinutes()) &&
               this.#values[CronField.Hour].has(date.getHours()) &&
               this.#values[CronField.DayOfMonth].has(date.getDate()) &&
               this.#values[CronField.Month].has(date.getMonth()) &&
               this.#values[CronField.DayOfWeek].has(date.getDay());
    }

    /**
     * Return the next timestamp matching this schedule.
     * @param {Date|Number} from Optional date/time or timestamp from when to check; defaults to the current date/time
     * @return {Number}
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
 * CronEngine is a background service executing tasks at scheduled times.
 * The service can be started and stopped.
 * It starts automatically after construction by default.
 * Tasks can be registered and deregistered at any time in any number.
 * Deregistration does not cancel running tasks, however.
 * Schedules are specified according to GNU's crontab specifications.
 * Tasks are specified either as function or as module path with optional arguments.
 * Functions are executed in the main thread. Modules can be executed in either
 * worker threads or forked child processes.
 * Execution of OS commands is not supported.
 * Task can alternatively be specified in a crontab-like file specified at construction time.
 * There is no communication between tasks and the service.
 * The service does not log its operation and does not monitor tasks' execution.
 * Hence the service will not attempt to abort non-terminating tasks or skip faulty tasks.
 */
class CronEngine {

    #searchPaths;
    #counter = 0;
    #jobs = new Map();
    #timer;
    
    /**
     * Create a CronEngine object.
     * The option "delayStart" is a flag specifying wheter the background process starts immediately.
     * The option "paths" provide supplemental search paths for looking up modules and crontab files.
     * A search path can be a sub-directory name, a relative path, or absolute path.
     * Relative paths are resolved against the current working directory and aginst the module path.
     * The main path and the home directory are automatically added to the search paths.
     * @constructor
     * @param {String} crontabPath Optional path of a crontab file.
     * @param {Object} options Options.
     * @throws Error if a specified crontab file does not exist, cannot be access or has no entries.
     */
    constructor(crontabPath, options = { delayStart: false, paths: [] }) {
        if (arguments.length === 1 && typeof arguments[0] === 'object') {
            crontabPath = undefined;
            options = arguments[0];
        }
        // Build the search paths as a copy of the standard search path, prepending the main path and the home directory 
        this.#searchPaths = [require.main.path, homedir(), ...module.paths];
        if (options?.paths) {
            // Cast a string to an array of one string
            let paths = Array.isArray(options.paths) ? options.paths : [ options.paths ];
            // Resolve the added path against the main path and the home directory
            paths.forEach(pathToAdd => {
                this.#addSearchPath(resolve(homedir(), pathToAdd));
                this.#addSearchPath(resolve(pathToAdd));
            });
        }
        // Process the crontab file if provided
        if (crontabPath) this.#processCrontab(this.#resolvePath(crontabPath, `File not found: ${crontabPath}`));
        // Start immediately unless specified not to
        if (!options?.delayStart) this.start();
    }

    /*
     * Prepend the given path to the search path if not already present.
     * @param {String} path Absolute path
     */
    #addSearchPath = (path) => { if (this.#searchPaths.indexOf(path) < 0) this.#searchPaths.unshift(path); };

    /*
     * Resolve a given path.
     * @param {String} path Path to resolve. Must be a relative or an absolute file path.
     * @param {String} errorMessage Optional error message used by exceptions
     * @returns Error if the given path could not be resolved.
     */
    #resolvePath(path, errorMessage) {
        try {
            return require.resolve(path, { paths: this.#searchPaths })
        } catch (err) {
            if (err.code === 'MODULE_NOT_FOUND') {
                throw new Error(errorMessage || err.message);
            } else {
                throw err;
            }
        }
    }

    /*
     * Process the given crontab file.
     * @param {String} crontabPath Path of the crontab file.
     * @throws Error if the crontab file does not exist, cannot be access, has no entries, or an entry is invalid.
     */
    #processCrontab(crontabPath) {
        // Verify that the file exists and can be read
        fs.accessSync(crontabPath, fs.constants.R_OK);
        // Read the file content as an array of lines, ignoring comment and empty lines
        let entries = fs.readFileSync(crontabPath, { encoding: 'utf8', flag: 'r' })
                      .split(/\r?\n/)
                      .filter(line => !line.startsWith('#') && line.trim().length);
        if (!entries.length) {
            throw new Error('Crontab file has no entries');
        }
        entries.forEach(entry => {
            // Split the entry into blank-separated tokens up to the "command" (sixth token)
            let tokens = entry.trim().split(/\s+/, 6);
            // Assemble the schedule expression and parse the following "command" expression
            let schedule, commandStr; 
            if (CronSchedule.isAlias(tokens)) {
                schedule = tokens[0];
                commandStr = entry.slice(entry.search(tokens[1]));
            } else {
                schedule = tokens.slice(0, 5).join(' ');
                commandStr = entry.slice(entry.search(tokens[5]));
            }
            // Parse the "command" string into an array of tokens.
            // A "command" is a module path followed by an array of optional string arguments.
            let [ task, ...data ] = parseCommand(commandStr);
            // Resolve the task path
            task = this.#resolvePath(task);
            // Register the task with its schedule and optional data
            this.register(schedule, task, data, { fork: true });
        });
    } 
    
    /**
     * Register a recurring task, which can be either a function or a module path.
     * If task is a module path the task is executed in a worker thread by default,
     * (see "worker_threads.Worker") or in a forked process (see "child_process.fork")
     * when options.fork is set to true. In both cases data is stringified.
     * A module path must be either an absolute path, or a relative path to this
     * module's path with ./ or ../.
     * At execution time the job id, the schedule as cron expression, the target time,
     * and optional data are passed as argument to the task.
     * It is possible to pass with options any options specified by "worker_threads.Worker"
     * and  "child_process.fork".
     * @param {String|CronSchedule} schedule Cron schedule expression or CronSchedule object. Defaults to every minute.
     * @param {Function|String} task Task to be executed. Can be either a function or a module path.
     * @param {*} data Optional data to be passed as supplemental argument to the task at execution time.
     * @param {Object} options Options.
     * @returns {Number} A unique job identification.
     * @throws Error with diagnostics in case of invalid cron expression or if module path does not exist.
     */
    register(schedule = DefaultCronExpression, task, data, options = {}) {
        // Validate schedule
        if (typeof schedule === 'string') {
            schedule = new CronSchedule(schedule);
        } else if (!(typeof schedule === 'object' && schedule.constructor === CronSchedule)) {
            throw new TypeError('Schedule must be a string or CronSchedule');
        }
        // Validate task
        if (!task) {
            throw new Error("No task specified");
        }
        if (typeof task != 'function' && typeof task != 'string') {
            throw new TypeError('Task must be function or a string');
        }
        if (typeof task === 'string') {
            task = this.#resolvePath(task, `Invalid module path "${task}"`);
        }
        // Get the unique job identification by incrementing an internal counter
        let id = ++this.#counter;
        // Add to the internal map
        this.#jobs.set(id, { schedule, task, data, options });
        return id;
    }

    /**
     * Deregister a recurring task. This does not abort an already running task.
     * @param {Number} jobId Unique job identification returned by the function schedule().
     * @returns {Boolean} true if the given task was scheduled and has been unscheduled, or false if no such task is scheduled.
     */
    deregister = (jobId) => this.#jobs.delete(jobId);

    /**
     * Return the list of currently registered tasks sorted by their job id (i.e. the time of their registration).
     * @returns {Array<any>} Array of tuples with job id, schedule expression, and data, and options.
     */
    registered = () =>
        [...this.#jobs.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([id, { schedule, data, options }]) => ({ id, cronExpr: schedule.expression(), data, options }));

    /*
     * Select tasks due for execution according to their cron expression and the specified time,
     * and execute them in the order of their registration time.
     * @param {Number} time Time in milliseconds since Epoch; defaults to the current time in milliseconds.
     */
    #executeTasks = (time = Date.now()) => {
        [...this.#jobs.entries()]
        .filter(([, { schedule }]) => schedule.matches(time))
        .sort((a, b) => a[0] - b[0])
        .forEach(([id, { schedule, task, data, options }]) => {
            if (typeof task === 'function') {
                setImmediate(task, id, schedule.expression(), time, data);
            } else {
                // All arguments are passed as strings
                let argv = [id.toString(), schedule.expression(), time.toString()];
                // Add data when provided, stringify objects to JSON.
                if (data) {
                    argv.push(typeof data === 'object' ? JSON.stringify(data) : data.toString());
                }
                if (options?.fork) {
                    fork(task, argv, options);
                } else {
                    new Worker(task, { argv }, options);
                }
            }
        });
    }

    /*
     * Recursively set a timer to expire after every plain minute and execute due tasks
     * passing the target expiration time as argument.
     * The function must be initially called without arguments.
     * @param delay Timer delay
     * @param expirationTime Expiration timestamp
     */
    #setTimer(delay, expirationTime) {
        if (!arguments.length) {
            // Initialize delay and expirationTime
            let currentTime = Date.now();
            delay = OneMinute - currentTime % OneMinute;
            expirationTime = currentTime + delay;
        }
        this.#timer = setTimeout(() => {
            this.#executeTasks(expirationTime);
            expirationTime += OneMinute;
            delay = expirationTime - Date.now();
            this.#setTimer(delay, expirationTime);
        }, delay);
    }

    /**
     * Start the cron immediately.
     * @returns {Boolean} true if the cron was stopped and is now starting, or false if it is already running.
     */
    start() {
        if (this.#timer) return false;
        this.#setTimer();
        return true;
    }

    /**
     * Stop the cron immediately or after a specified delay. This does not abort currently running tasks.
     * @param delay Optional delay in minutes.
     * @returns {Boolean|Promise} true if the cron was running and is now stopped, or false if it is already stopped.
     */
    stop(delay) {
        if (delay) return setTimeoutPromise(delay * OneMinute).then(() => this.stop());
        if (!this.#timer) return false;
        clearTimeout(this.#timer);
        this.#timer = null;
        return true;
    }

    /**
     * Boolean function returning whether the cron is running (i.e. active) or not.
     * @returns {Boolean}
     */
    isRunning = () => this.#timer != null;

}

/**
 * Parse a command with or without arguments, possibly quoted, provided as single string,
 * returning an array of unquoted strings, with escaped characters interpreted.
 * Example:
 * Input: './sampleTask.js "arg\\"1\\" " "arg 2"'
 * Output: [ './sampleTask.js', 'arg"1" ', 'arg 2' ]
 * @param {String} input Command as text.
 * @returns {Array<String>} Array of terms
 */
function parseCommand(input) {

    const State = {
        separator: "separator",
        unquoted: "unquoted",
        singleQuoted: "singleQuoted",
        doubleQuoted: "doubleQuoted",
        charEscape: "charEscape"
    }

    let state = State.separator;
    let prevState = State.separator;
    let token = [];

    const tokens = [];

    const newToken = (c) => {
        if (token.length) {
            tokens.push(token.join(''));
            token = [];
        }
        if (c) token.push(c);
    }

    const switchState = (newState) => {
        prevState = state;
        state = newState;
    }

    for (let c of input) {
        //console.log(state, c);
        switch (state) {
            case State.separator:
                switch (c) {
                    case '\'':
                        switchState(State.singleQuoted); newToken(); continue;
                    case '"':
                        switchState(State.doubleQuoted); newToken(); continue;
                    case ' ':
                    case '\t':
                        continue;
                    default:
                        switchState(State.unquoted); newToken(c);  continue;
                }
            case State.unquoted:
                switch (c) {
                    case ' ':
                    case '\t':
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
                    case '"':
                        token.push(c); switchState(prevState); continue;
                    default:
                        token.push(c); switchState(prevState); continue;
                }
        }

    }
    newToken();

    return tokens;
}

module.exports = { CronSchedule, CronEngine }
