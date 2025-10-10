'use strict';

const Duration = require('./duration.js');

const displayDateTime = (date = new Date()) => {
    date = new Date(date);
    console.log(date, `(${['Sun','Mon','Tue','Wed','Thu','Fri','Sat','Sun'][date.getDay()]})`);
}

const displayDuration = (duration) =>
    console.log(duration instanceof Duration ? duration.expression : duration);

function test(expr) {
    displayDuration(expr);
    // Parse the duration expression using regexp
    try {
        let duration = new Duration(expr);
        console.log('Type', duration.type);
        console.log(duration.fields);
        console.log("isZero:", duration.isZero());
        console.log("isZeroDate:", duration.isZeroDate());
        console.log("isZeroTime:", duration.isZeroTime());
    } catch (err) {
        console.error('Error>', err.message);
    }
    console.log();
}

// Date and time
test("P00010204T050607");

// Only date
test("P00010204");
test("P00000204");

// Only time
test("PT050607");
test("PT000607");

// Zero duration
test("P00000000");
test("PT000000");
test("P");

function test2(expr) {
    displayDuration(expr);
    try {
        let now = Date.now();
        let time = new Duration(expr).toMillis();
        console.log(time);
        console.log(Duration.toExpression(time, { type: 1 }));
        displayDateTime(now);
        displayDateTime(now + time);
    } catch (err) {
        console.error('Error>', err.message);
    }
    console.log();
}

let startDate, endDate, duration;

test2("P00010212");

test2("-P00010000");
test2("-P00000100");
test2("-P00000001");
test2("-PT010000");
test2("-PT000100");
test2("-PT000001");

test2("PT000000");

startDate = '2025-09-06T00:00:00+02:00';
endDate = '2025-09-05T00:00:00+02:00';
//let startDate = new Date('2025-09-06T00:00:00+02:00');
//let endDate = new Date('2025-09-05T00:00:00+02:00');
displayDateTime(startDate);
displayDateTime(endDate);
displayDuration(Duration.durationOf(new Date(endDate), new Date(startDate)));
displayDuration(Duration.durationOf(endDate, startDate));

displayDuration(new Duration("+P00000001").plus(new Duration("PT010000")));
displayDuration(new Duration("+P1D").plus("-PT1H"));
displayDuration(new Duration("+P1D").plus());
displayDuration(new Duration("+P1D").minus(new Duration("PT1H")));
displayDuration(new Duration("+P1D").minus("-PT1H"));
displayDuration(new Duration("+P1D").minus(Duration.ZeroSeconds));
displayDuration(new Duration("+P1D").minus());
displayDuration(new Duration("+P1D").mult());
displayDuration(new Duration("+P1D").mult(5));
displayDuration(new Duration("+P1D").mult(0));
displayDuration(new Duration("-P1D").div(5));
displayDuration(new Duration("-P1D").div());
displayDuration(new Duration("-P1D").div(0));

test2("+P1D");
test2(new Duration("+P1D"));

startDate = new Date('2025-09-05T00:00:00+02:00');
displayDateTime(startDate);
duration = new Duration("+P1D");
displayDuration(duration);
displayDateTime(duration.endDate(startDate));
console.log();
displayDateTime(startDate);
duration = new Duration("-P1D");
displayDuration(duration);
displayDateTime(duration.endDate(startDate));

duration = new Duration("P1D");
displayDuration(duration);
displayDuration(duration.reverse());
