/**
 * Unit test of the class CronSchedule.
 */

'use strict';

const { suite, test } = require('node:test');
const { expect } = require('chai');

const { CronSchedule } = require('..');

/**
 * Helper function that return an array of enumerated integer numbers.
 * Examples:
 *  enumerate(6) -> [0, 1, 2, 3, 4, 5, 6]
 *  enumerate(1, 6) -> [1, 2, 3, 4, 5, 6]
 *  enumerate(1, 6, 2) -> [1, 3, 5]
 * @param {number} startOrEnd Starting number inclusive.
 *  Ending number with a start number of zero if it is the only argument.
 * @param {number} end Ending number inclusive; defaults to undefined
 * @param {number} step Step; defaults to 1
 * @returns Array<number>
 */
const enumerate = (startOrEnd, end = undefined, step = 1) => {
    if (end === undefined) {
        return Array.from({ length: startOrEnd }, (_, i) => i);
    } else {
        let a = [];
        for (let n = startOrEnd; n <= end; n += step) a.push(n);
        return a;
    }
}

/**
 * Pre-defined enumerations
 */
const everyMinutes = enumerate(60);         // Minutes are zero-based
const everyHours = enumerate(24);           // Hours are zero-based
const everyDaysOfMonths = enumerate(1, 31); // Days of month are one-based
const everyMonths = enumerate(1, 12);       // Months are one-based
const everyDaysOfWeeks = enumerate(8);      // Days of weeks are zero-based and values up to 7, where 7 is equal to 0 (Sunday)

// Test suites

suite("Unit tests of class 'CronSchedule' - Construct valid schedule expressions, checking internal values", { skip: false }, () => {

    // Unit tests

    test("Default schedule expression should be '* * * * *'", { skip: false }, () => {
        let expression = new CronSchedule().expression;
        expect(expression).to.equal('* * * * *');
    });
    
    test("Default schedule expressions should have proper internal keys and values", { skip: false }, () => {
        let values = new CronSchedule().values;
        expect(values, "Invalid keys in values").to.have.all.keys('minute','hour','day-of-month','month','day-of-week','reverse-day-of-month');
        // Minutes are zero-based
        expect(values.minute, "Invalid minute values").to.be.an('array').with.all.members(everyMinutes);
        // Hours are zero-based
        expect(values.hour, "Invalid hour values").to.be.an('array').with.all.members(everyHours);
        // Days of month are one-based
        expect(values['day-of-month'], "Invalid day-of-month values").to.be.an('array').with.all.members(everyDaysOfMonths);
        expect(values['reverse-day-of-month'], "Invalid reverse-day-of-month values").to.be.an('array').that.is.empty;
        // Months are one-based
        expect(values.month, "Invalid month values").to.be.an('array').with.all.members(everyMonths);
        // Days of weeks are zero-based and values up to 7, where 7 is equal to 0 (Sunday)
        expect(values['day-of-week'], "Invalid day-of-week values").to.be.an('array').with.all.members(everyDaysOfWeeks);
    });

    test("Any number and type of blanks", { skip: false }, () => {
        let schedule = new CronSchedule("\t*\t*  *  *\t* ");
        expect(schedule.expression).to.equal('* * * * *');
        expect(schedule.alias).to.be.undefined;
    });
    
    test("Single values", { skip: false }, () => {
        expect(new CronSchedule("24 * * * *").values.minute).to.be.an('array').with.all.members([ 24 ]);
        expect(new CronSchedule("* 3 * * *").values.hour).to.be.an('array').with.all.members([ 3 ]);
        expect(new CronSchedule("* * 19 * *").values['day-of-month']).to.be.an('array').with.all.members([ 19 ]);
        expect(new CronSchedule("* * * 5 *").values.month).to.be.an('array').with.all.members([ 5 ]); 
        expect(new CronSchedule("* * * * 6").values['day-of-week']).to.be.an('array').with.all.members([ 6 ]);
    });

    test("Special negative values in day-of-month field", { skip: false }, () => {
        let values = new CronSchedule("* * _1,_2,_3 * *").values;
        expect(values['day-of-month']).to.be.an('array').that.is.empty;
        expect(values['reverse-day-of-month']).to.be.an('array').with.all.members([ -3, -2, -1 ]);
    });

    test("List of values", { skip: false }, () => {
        expect(new CronSchedule("24,26,30 * * * *").values.minute).to.be.an('array').with.all.members([ 24, 26, 30 ]);
        expect(new CronSchedule("* 3,13,23 * * *").values.hour).to.be.an('array').with.all.members([ 3, 13, 23 ]);
        expect(new CronSchedule("* * 1,11,21 * *").values['day-of-month']).to.be.an('array').with.all.members([ 1, 11, 21 ]);
        expect(new CronSchedule("* * * 1,6,12 *").values.month).to.be.an('array').with.all.members([ 1, 6, 12 ]); 
        expect(new CronSchedule("* * * * 1,3,5").values['day-of-week']).to.be.an('array').with.all.members([ 1, 3, 5 ]);
    });
    
    test("Range of values", { skip: false }, () => {
        expect(new CronSchedule("10-20 * * * *").values.minute).to.be.an('array').with.all.members(enumerate(10, 20));
        expect(new CronSchedule("* 12-23 * * *").values.hour).to.be.an('array').with.all.members(enumerate(12, 23));
        expect(new CronSchedule("* * 15-25 * *").values['day-of-month']).to.be.an('array').with.all.members(enumerate(15, 25));
        expect(new CronSchedule("* * * 6-9 *").values.month).to.be.an('array').with.all.members(enumerate(6, 9));
        expect(new CronSchedule("* * * * 4-6").values['day-of-week']).to.be.an('array').with.all.members(enumerate(4, 6));
    });
    
    test("Range of values within list of values", { skip: false }, () => {
        expect(new CronSchedule("1,2,3,10-20,4,5 * * * *").values.minute).to.be.an('array').with.all.members([1, 2, 3, 4, 5].concat(enumerate(10, 20)));
        expect(new CronSchedule("* 1,2,3,12-23,4,5 * * *").values.hour).to.be.an('array').with.all.members([1, 2, 3, 4, 5].concat(enumerate(12, 23)));
        expect(new CronSchedule("* * 1,2,3,15-25,4,5 * *").values['day-of-month']).to.be.an('array').with.all.members([1, 2, 3, 4, 5].concat(enumerate(15, 25)));
        expect(new CronSchedule("* * * 1,2,3,6-9,4,5 *").values.month).to.be.an('array').with.all.members([1, 2, 3, 4, 5].concat(enumerate(6, 9)));
        expect(new CronSchedule("* * * * 1,2,3,4-6,7").values['day-of-week']).to.be.an('array').with.all.members([1, 2, 3].concat(enumerate(4, 6)).concat([ 7 ]));
    });

    test("Range of values with step", { skip: false }, () => {
        expect(new CronSchedule("10-20/2 * * * *").values.minute).to.be.an('array').with.all.members(enumerate(10, 20, 2));
        expect(new CronSchedule("* 12-23/3 * * *").values.hour).to.be.an('array').with.all.members(enumerate(12, 23, 3));
        expect(new CronSchedule("* * 15-25/5 * *").values['day-of-month']).to.be.an('array').with.all.members(enumerate(15, 25, 5));
        expect(new CronSchedule("* * * 6-9/3 *").values.month).to.be.an('array').with.all.members(enumerate(6, 9, 3));
        expect(new CronSchedule("* * * * 4-6/2").values['day-of-week']).to.be.an('array').with.all.members(enumerate(4, 6, 2));
    });

    test("Abbreviated month names", { skip: false }, () => {
        expect(new CronSchedule("* * * Mar,Jun-sep/3 *").values.month).to.be.an('array').with.all.members([3, 6, 9]);
    });

    test("Abbreviated week names", { skip: false }, () => {
        expect(new CronSchedule("* * * * tuE,thu-SAT/2").values['day-of-week']).to.be.an('array').with.all.members([2, 4, 6]);
    });

    test("Alias '@hourly'", { skip: false }, () => {
        let schedule = new CronSchedule("@hourly");
        expect(schedule.expression).to.equal('0 * * * *');
        expect(schedule.alias).to.equal('@hourly');
        expect(schedule.values.minute).to.be.an('array').with.all.all.members([ 0 ]);
        expect(schedule.values.hour).to.be.an('array').with.all.members(everyHours);
        expect(schedule.values['day-of-month']).to.be.an('array').with.all.members(everyDaysOfMonths);
        expect(schedule.values.month).to.be.an('array').with.all.members(everyMonths);
        expect(schedule.values['day-of-week']).to.be.an('array').with.all.members(everyDaysOfWeeks);
    });

    test("Alias '@daily'", { skip: false }, () => {
        let schedule = new CronSchedule("@daily");
        expect(schedule.expression).to.equal('0 0 * * *');
        expect(schedule.alias).to.equal('@daily');
        expect(schedule.values.minute).to.be.an('array').with.all.members([ 0 ]);
        expect(schedule.values.hour).to.be.an('array').with.all.members([ 0 ]);
        expect(schedule.values['day-of-month']).to.be.an('array').with.all.members(everyDaysOfMonths);
        expect(schedule.values.month).to.be.an('array').with.all.members(everyMonths);
        expect(schedule.values['day-of-week']).to.be.an('array').with.all.members(everyDaysOfWeeks);
    });

    test("Alias '@midnight'", { skip: false }, () => {
        let schedule = new CronSchedule("@midnight");
        expect(schedule.expression).to.equal('0 0 * * *');
        expect(schedule.alias).to.equal('@midnight');
        expect(schedule.values.minute).to.be.an('array').with.all.members([ 0 ]);
        expect(schedule.values.hour).to.be.an('array').with.all.members([ 0 ]);
        expect(schedule.values['day-of-month']).to.be.an('array').with.all.members(everyDaysOfMonths);
        expect(schedule.values.month).to.be.an('array').with.all.members(everyMonths);
        expect(schedule.values['day-of-week']).to.be.an('array').with.all.members(everyDaysOfWeeks);
    });

    test("Alias '@weekly'", { skip: false }, () => {
        let schedule = new CronSchedule("@weekly");
        expect(schedule.expression).to.equal('0 0 * * 0');
        expect(schedule.alias).to.equal('@weekly');
        expect(schedule.values.minute).to.be.an('array').with.all.members([ 0 ]);
        expect(schedule.values.hour).to.be.an('array').with.all.members([ 0 ]);
        expect(schedule.values['day-of-month']).to.be.an('array').with.all.members(everyDaysOfMonths);
        expect(schedule.values.month).to.be.an('array').with.all.members(everyMonths);
        expect(schedule.values['day-of-week']).to.be.an('array').with.all.members([ 0 ]);
    });

    test("Alias '@monthly'", { skip: false }, () => {
        let schedule = new CronSchedule("@monthly");
        expect(schedule.expression).to.equal('0 0 1 * *');
        expect(schedule.alias).to.equal('@monthly');
        expect(schedule.values.minute).to.be.an('array').with.all.members([ 0 ]);
        expect(schedule.values.hour).to.be.an('array').with.all.members([ 0 ]);
        expect(schedule.values['day-of-month']).to.be.an('array').with.all.members([ 1 ]);
        expect(schedule.values.month).to.be.an('array').with.all.members(everyMonths);
        expect(schedule.values['day-of-week']).to.be.an('array').with.all.members(everyDaysOfWeeks);
    });

    test("Alias '@yearly'", { skip: false }, () => {
        let schedule = new CronSchedule("@yearly");
        expect(schedule.expression).to.equal('0 0 1 1 *');
        expect(schedule.alias).to.equal('@yearly');
        expect(schedule.values.minute).to.be.an('array').with.all.members([ 0 ]);
        expect(schedule.values.hour).to.be.an('array').with.all.members([ 0 ]);
        expect(schedule.values['day-of-month']).to.be.an('array').with.all.members([ 1 ]);
        expect(schedule.values.month).to.be.an('array').with.all.members([ 1 ]);
        expect(schedule.values['day-of-week']).to.be.an('array').with.all.members(everyDaysOfWeeks);
    });

    test("Alias '@annually'", { skip: false }, () => {
        let schedule = new CronSchedule("@annually");
        expect(schedule.expression).to.equal('0 0 1 1 *');
        expect(schedule.alias).to.equal('@annually');
        expect(schedule.values.minute).to.be.an('array').with.all.members([ 0 ]);
        expect(schedule.values.hour).to.be.an('array').with.all.members([ 0 ]);
        expect(schedule.values['day-of-month']).to.be.an('array').with.all.members([ 1 ]);
        expect(schedule.values.month).to.be.an('array').with.all.members([ 1 ]);
        expect(schedule.values['day-of-week']).to.be.an('array').with.all.members(everyDaysOfWeeks);
    });

});

suite("Unit tests of class 'CronSchedule' - Matching date/times against schedules", { skip: false }, () => {

    test("'* * * * *' schedule", { skip: false }, () => {
        let schedule = new CronSchedule();
        expect(schedule.matches("2025-06-18T03:23")).to.be.true;
        expect(schedule.matches("2025-06-19T03:24")).to.be.true;
        expect(schedule.matches("2025-06-20T03:25")).to.be.true;
        expect(schedule.matches("2025-06-18T03:23:45")).to.be.false;
    });

    test("'24 * * * *' schedule", { skip: false }, () => {
        let schedule = new CronSchedule("24 * * * *");
        expect(schedule.matches("2025-06-18T03:23")).to.be.false;
        expect(schedule.matches("2025-06-19T03:24")).to.be.true;
        expect(schedule.matches("2025-06-20T03:25")).to.be.false;
    });

    test("'* 3 * * *' schedule", { skip: false }, () => {
        let schedule = new CronSchedule("* 3 * * *");
        expect(schedule.matches("2025-06-18T02:23")).to.be.false;
        expect(schedule.matches("2025-06-19T03:24")).to.be.true;
        expect(schedule.matches("2025-06-20T04:25")).to.be.false;
    });

    test("'* * 19 * *' schedule", { skip: false }, () => {
        let schedule = new CronSchedule("* * 19 * *");
        expect(schedule.matches("2025-06-18T03:23")).to.be.false;
        expect(schedule.matches("2025-06-19T03:24")).to.be.true;
        expect(schedule.matches("2025-06-20T03:25")).to.be.false;
    });

    test("'* * _3,_2,_1 * *' schedule", { skip: false }, () => {
        let schedule = new CronSchedule("* * _3,_2,_1 * *");
        expect(schedule.matches("2025-02-25T00:00")).to.be.false;
        expect(schedule.matches("2025-02-26T00:00")).to.be.true;
        expect(schedule.matches("2025-02-27T00:00")).to.be.true;
        expect(schedule.matches("2025-02-28T00:00")).to.be.true;
        expect(schedule.matches("2025-03-01T00:00")).to.be.false;
        expect(schedule.matches("2025-10-28T00:00")).to.be.false;
        expect(schedule.matches("2025-10-29T00:00")).to.be.true;
        expect(schedule.matches("2025-10-30T00:00")).to.be.true;
        expect(schedule.matches("2025-10-31T00:00")).to.be.true;
        expect(schedule.matches("2025-11-01T00:00")).to.be.false;
    });

    test("'* 3 1,19 * 4' schedule", { skip: false }, () => {
        let schedule = new CronSchedule("* 3 1,19 * 4");
        expect(schedule.matches("2025-06-01T03:24")).to.be.false;
        expect(schedule.matches("2025-06-18T03:23")).to.be.false;
        expect(schedule.matches("2025-06-19T03:24")).to.be.true;
        expect(schedule.matches("2025-06-20T03:25")).to.be.false;
    });

    test("'*/6 3 1,19 * Thu' schedule", { skip: false }, () => {
        let schedule = new CronSchedule("*/6 3 1,19 * Thu");
        expect(schedule.matches("2025-06-18T03:23")).to.be.false;
        expect(schedule.matches("2025-06-19T03:24")).to.be.true;
        expect(schedule.matches("2025-06-20T03:25")).to.be.false;
    });

    test("'20-40/2 * 15-20 Jun-Sep Thu' schedule", { skip: false }, () => {
        let schedule = new CronSchedule("20-40/2 * 15-20 Jun-Sep Thu");
        expect(schedule.matches("2025-06-18T03:23")).to.be.false;
        expect(schedule.matches("2025-06-19T03:24")).to.be.true;
        expect(schedule.matches("2025-06-20T03:25")).to.be.false;
    });

    test("'@hourly' schedule", { skip: false }, () => {
        let schedule = new CronSchedule("@hourly");
        expect(schedule.matches("2025-06-18T03:00")).to.be.true;
        expect(schedule.matches("2025-06-18T03:24")).to.be.false;
        expect(schedule.matches("2025-06-18T04:00")).to.be.true;
    });
    
    test("'@daily' schedule", { skip: false }, () => {
        let schedule = new CronSchedule("@daily");
        expect(schedule.matches("2025-06-18T11:30")).to.be.false;
        expect(schedule.matches("2025-06-19T00:00")).to.be.true;
        expect(schedule.matches("2025-06-19T00:30")).to.be.false;
    });

    test("'@midnight' schedule", { skip: false }, () => {
        let schedule = new CronSchedule("@midnight");
        expect(schedule.matches("2025-06-18T11:30")).to.be.false;
        expect(schedule.matches("2025-06-19T00:00")).to.be.true;
        expect(schedule.matches("2025-06-19T00:30")).to.be.false;
    });

    test("'@weekly' schedule", { skip: false }, () => {
        let schedule = new CronSchedule("@weekly");
        expect(schedule.matches("2025-06-21T00:00")).to.be.false;   // Saturday
        expect(schedule.matches("2025-06-22T00:00")).to.be.true;    // Sunday
        expect(schedule.matches("2025-06-23T00:00")).to.be.false;   // Monday
    });

    test("'@monthly' schedule", { skip: false }, () => {
        let schedule = new CronSchedule("@monthly");
        expect(schedule.matches("2025-06-30T00:00")).to.be.false;
        expect(schedule.matches("2025-07-01T00:00")).to.be.true;
        expect(schedule.matches("2025-06-05T00:00")).to.be.false;
    });

    test("'@yearly' schedule", { skip: false }, () => {
        let schedule = new CronSchedule("@yearly");
        expect(schedule.matches("2025-12-31T00:00")).to.be.false;
        expect(schedule.matches("2026-01-01T00:00")).to.be.true;
        expect(schedule.matches("2026-01-05T00:00")).to.be.false;
    });

    test("'@annually' schedule", { skip: false }, () => {
        let schedule = new CronSchedule("@annually");
        expect(schedule.matches("2025-12-31T00:00")).to.be.false;
        expect(schedule.matches("2026-01-01T00:00")).to.be.true;
        expect(schedule.matches("2026-01-05T00:00")).to.be.false;
    });

});

suite("Unit tests of class 'CronSchedule' - Invalid schedule expressions", { skip: false }, () => {

    test("Schedule expressions with invalid number of fields should throw exceptions", { skip: false }, () => {
        expect(() => { throw new CronSchedule('* * *'); }, "With missing fields").throws();
        expect(() => { throw new CronSchedule('* * * * * * *'); }, "With too many fields").to.throw();
    });

    test("Schedule expressions with invalid field syntax should throw exceptions", { skip: false }, () => {
        expect(() => { throw new CronSchedule('x * * * *'); }, "With invalid character(s) in minute field").to.throw();
        expect(() => { throw new CronSchedule('3;4 * * * *'); }, "With invalid character(s) in minute field").to.throw();
        expect(() => { throw new CronSchedule('* x * * *'); }, "With invalid character(s) in hour field").to.throw();
        expect(() => { throw new CronSchedule('* 3;4 * * *'); }, "With invalid character(s) in hour field").to.throw();
        expect(() => { throw new CronSchedule('* * x * *'); }, "With invalid character(s) in day-of-month field").to.throw();
        expect(() => { throw new CronSchedule('* * 3.4 * *'); }, "With invalid character(s) in day-of-month field").to.throw();
        expect(() => { throw new CronSchedule('* * * x *'); }, "With invalid character(s) in month field").to.throw();
        expect(() => { throw new CronSchedule('* * * 3+4 *'); }, "With invalid character(s) in month field").to.throw();
        expect(() => { throw new CronSchedule('* * * * x'); }, "With invalid character(s) in day-of-week field").to.throw();
        expect(() => { throw new CronSchedule('* * * * 3:4'); }, "With invalid character(s) in day-of-week field").to.throw();
        expect(() => { throw new CronSchedule('66 * * * *'); }, "With invalid value(s) in minute field").to.throw();
        expect(() => { throw new CronSchedule('* 77 * * *'); }, "With invalid value(s) in hour field").to.throw();
        expect(() => { throw new CronSchedule('* _3 * * *'); }, "With invalid character(s) in hour field").to.throw();
        expect(() => { throw new CronSchedule('* * 88 * *'); }, "With invalid value(s) in day-of-month field").to.throw();
        expect(() => { throw new CronSchedule('* * _3-_1 * *'); }, "With invalid character(s) in day-of-month field").to.throw();
        expect(() => { throw new CronSchedule('* * * 99 *'); }, "With invalid value(s) in month field").to.throw();
        expect(() => { throw new CronSchedule('* * * * 55'); }, "With invalid value(s) in day-of-week field").to.throw();
        expect(() => { throw new CronSchedule('@reboot'); }, "With invalid alias").to.throw();
    });
});
