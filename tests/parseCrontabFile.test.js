/**
 * Unit test of the class Crontab.
 */

'use strict';

const { EOL } = require('node:os');
const { suite, test, beforeEach, afterEach } = require('node:test');
const { expect } = require('chai');

const { newTempDir, newTempFile, appendContent, purge } = require('./utils.js');
const { parseCrontabFile, parseCommandLine, CronSchedule } = require('../index.js');

/*
 * Crontab entries data
 */
const EntriesData = [
    ['*  *  *  *  *', undefined, './sample-task.js', ['execution_in_worker_thread']],
    ['*/5 * * * *', 'F', 'sample-task.js', ["'execution in forked process'", 'more-data']],
    ['1-59/2 * * * *', undefined, 'sample-task.js', ['"execution in worker thread"', 'more-data-1', 'more-data-2']],
];

const dataToLine = (index) => {
    let data = EntriesData[index];
    let str = data.slice(0, -1).join('\t');
    let last = data.slice(-1).flat().join(' ');
    return str + '\t' + last;
}

const CrontabEntries = [
`
# This is a comment for the first task
${dataToLine(0)}
`,
`
# This is a comment for the second task
${dataToLine(1)}
`,
`
# This is a comment for the third task
${dataToLine(2)}
`,
];

const CrontabContent = CrontabEntries.join(EOL);
const CrontabLineNbrs = [ 3, 7, 11 ];

/*
 * Transform the entry data at a given index to a data array suitable for
 * comparison with the corresponding entry returned by the Crontab object. 
 */
const getExpectedEntry = (i) => {
    const parseItem = (input) => parseCommandLine(input)[0];
    
    let entry = [CrontabLineNbrs[i], ...EntriesData[i]];
    // Transform the schedule
    entry[1] = new CronSchedule(entry[1]).expression;
    // Transform the module path
    entry[3] = parseItem(entry[3]);
    // Transform the arguments
    for (let i = 0; i < entry[4].length; i++) {
        entry[4][i] = parseItem(entry[4][i]);
    }

    return entry;
}

// Test suites

suite("Unit tests of function 'parseCrontabFile'", () => {
    
    // Path of the temporary Crontab file
    let filePath;

    /*
     * Create a temporary crontab file with entries
     */
    beforeEach(() => {
        filePath = appendContent(newTempFile(newTempDir()));
    });

    /*
     * Purge temporary directories and files
     */
    afterEach(() => purge());

    // Unit tests

    test("Entries parsed", { skip: false }, () => {
        parseCrontabFile(filePath).then(entries => {
            // Test
            for (let i = 0; i < entries.length; i++) {
                let actualEntry = entries[i];
                let expectedEntry = getExpectedEntry(i);
                expect(actualEntry).to.deep.equal(expectedEntry);
            }
        });
    });
    
});
