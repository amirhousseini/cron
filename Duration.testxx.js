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
test("P1Y2M4DT5H6M7S");

// Only date
test("P1Y2M4D");
test("P2M4D");
test("P3W");
test("P0.5Y");
test("P0.5Y0.5M");

//Only time
test("PT5H6M7S");
test("PT6M7S");
test("PT0.5H");
test("PT0.5H2M");
test("PT0.5H0.5M");

// Zero duration
test("P0Y");
test("P0D");
test("PT0H");
test("PT0S");
test("P");

function test2(expr) {
    displayDuration(expr);
    try {
        let now = Date.now();
        let time = new Duration(expr).toMillis();
        console.log(time);
        console.log(Duration.toExpression(time));
        displayDateTime(now);
        displayDateTime(now + time);
    } catch (err) {
        console.error('Error>', err.message);
    }
    console.log();
}

let startDate, endDate, duration;

test2("P1.2Y");
test2("P1Y2M12D");
test2("P1.2M");
test2("P1.2W");
test2("P1.2D");
test2("PT1.2H");
test2("PT1.2M");
test2("PT1.2S");

test2("-P1Y");
test2("-P1M");
test2("-P1W");
test2("-P1D");
test2("-PT1H");
test2("-PT1M");
test2("-PT1S");

test2("PT0S");

startDate = '2025-09-06T00:00:00+02:00';
endDate = '2025-09-05T00:00:00+02:00';
//let startDate = new Date('2025-09-06T00:00:00+02:00');
//let endDate = new Date('2025-09-05T00:00:00+02:00');
displayDateTime(startDate);
displayDateTime(endDate);
displayDuration(Duration.durationOf(new Date(endDate), new Date(startDate)));
displayDuration(Duration.durationOf(endDate, startDate));

displayDuration(new Duration("+P1D").plus(new Duration("PT1H")));
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
