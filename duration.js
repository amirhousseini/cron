/**
 * Implementation of ISO 8601 durations.
 */

'use strict';

/**
 * This class represent a date/time duration, based on the ISO 8601 standards.
 * @see https://en.wikipedia.org/wiki/ISO_8601
 */
class Duration {

    // Standard durations
    static OneYear = 'P1Y';
    static OneYear1 = 'P00010000';
    static OneYear2 = 'P0001-00-00';
    static OneMonth = 'P1M';
    static OneMonth1 = 'P00000100';
    static OneMonth2 = 'P0000-01-00';
    static OneWeek = 'P1W';
    static OneWeek1 = 'P00000700';
    static OneWeek2 = 'P0000-07-00';
    static OneDay = 'P1D';
    static OneDay1 = 'P00000001';
    static OneDay2 = 'P0000-00-01';
    static OneHour = 'PT1H';
    static OneHour1 = 'PT010000';
    static OneHour2 = 'PT01:00:00';
    static OneMinute = 'PT1M';
    static OneMinute1 = 'PT000100';
    static OneMinute2 = 'PT00:01:00';
    static OneSecond = 'PT1S';
    static OneSecond1 = 'PT000001';
    static OneSecond2 = 'PT00:00:01';

    // Zero durations (preferred is ZeroSeconds)
    static ZeroDays = 'P0D';
    static ZeroDays1 = 'P00000000';
    static ZeroDays2 = 'P0000-00-00';
    static ZeroSeconds = 'PT0S';
    static ZeroSeconds1 = 'PT000000';
    static ZeroSeconds2 = 'PT00:00:00';

    // Infinity durations (conventional)
    static PlusInfinity = 'P9999Y';
    static PlusInfinity1 = 'P99990000';
    static PlusInfinity2 = 'P9999-00-00';
    static MinusInfinity = '-P9999Y';
    static MinusInfinity1 = 'P99990000';
    static MinusInfinity2 = 'P9999-00-00';

    // Construction of the regular expression used internally for parsing
    static #v = '\\d+(?:[.,]\\d+)?';
    static #sect = (str) => [...str].map(c => `(?:(${Duration.#v})${c})?`).join('');
    static #pattern = [
        `^([+-])?P(?!$)(?:${Duration.#sect('YMWD')})?(?:T(?:${Duration.#sect('HMS')}))?$`,
        `^([+-])?P(?!$)(?:(\\d{4})(\\d{2})(\\d{2}))?(?:T(\\d{2})(\\d{2})(\\d{2}))?$`,
        `^([+-])?P(?!$)(?:(\\d{4})-(\\d{2})-(\\d{2}))(?:T(\\d{2}):(\\d{2}):(\\d{2}))?$`
    ];
    static #regexp = [
        new RegExp(Duration.#pattern[0]),
        new RegExp(Duration.#pattern[1]),
        new RegExp(Duration.#pattern[2])
    ];

    static #OneYearInMonths = 12;
    static #OneMonthInDaysMax = 31;
    static #OneWeekInDays = 7;
    static #OneDayInHours = 24;
    static #OneHourInMinutes = 60;
    static #OneMinuteInSeconds = 60;
    static #OneSecondInMillis = 1000;
    
    // Internal attributes
    #expr;
    #type = 0;
    #vals;

    /**
     * Construct a Duration object from an ISO 8601 string expression, or from another Duration object.
     * The main and preferred format (type 0) is: [s]P[n]Y[n]M[n]DT[n]H[n]M[n]S
     * The alternative formats (type 1): [s]PYYYYMMDDThhmmss and (type2) [s]P[YYYY]-[MM]-[DD]T[hh]:[mm]:[ss]
     * are also supported
     * The syntaxes are validated, but the number of digits and the corresponding values in each field are
     * only validate with type 2 format.
     * @constructor
     * @param {string|Duration} duration A duration as ISO8601 string expression.
     *  If a Duration object, the object is simply cloned.
     * @throws TypeError if the argument has an invalid type.
     * @throws Error if the argument is invalid according to the ISO 8601 specifications.
     */
    constructor(duration = Duration.ZeroDays) {
        if (typeof duration === 'string') {
            this.#parse(duration);
            this.#expr = duration.trim();
        } else if (duration instanceof Duration) {
            this.#expr = duration.#expr;
            this.#vals = [...duration.#vals];
        } else {
            throw new TypeError("Argument must be a string or a Duration object");
        }
    }

    /**
     * Return whether an ISO 8601 string expression is valid or not.
     * @param {string|Duration} duration A duration as ISO8601 string expression.
     * @returns {boolean}
     */
    static isValid = (duration = Duration.ZeroDays) => {
        try {
            new Duration(duration);
            return true;
        } catch (err) {
            return false;
        }
    };

    /*
     * Return whether a number has a fractional part or not.
     */
    #isDecimal = (e) => e ? e !== Math.trunc(e) : false;

    /*
     * Parse an ISO 8601 string expression into numeric fields using a regular expression
     */
    #parse(expr) {
        let rslt;
        while (this.#type < 2) {
            rslt = Duration.#regexp[this.#type].exec(expr);
            if (rslt) break;
            this.#type++;
        }
        // Basic syntax validation
        if (!rslt) {
            throw new Error(`Illegal ISO8601 duration expression "${expr}"`);
        }
        // Extract data
        this.#vals = rslt.slice(2, 9).map(v => v ? Number(v.replace(',', '.')) : undefined);
        this.#vals.unshift(rslt[1] === '-' ? -1 : 1);
        // Type 1 and 2 formats do not have a week field
        if (this.#type > 0) {
            this.#vals.splice(3, 0, undefined);
        }
        // Validate moduli with format of type 2
        if (this.#type == 2) {
            if (this.#vals[2] > Duration.#OneYearInMonths) {
                throw new Error(`Invalid number of months in ISO8601 duration expression "${expr}"`);
            }
            if (this.#vals[4] > Duration.#OneMonthInDaysMax) {
                throw new Error(`Invalid number of days in ISO8601 duration expression "${expr}"`);
            }
            if (this.#vals[5] > Duration.#OneDayInHours) {
                throw new Error(`Invalid number of hours in ISO8601 duration expression "${expr}"`);
            }
            if (this.#vals[6] > Duration.#OneHourInMinutes) {
                throw new Error(`Invalid number of minutes in ISO8601 duration expression "${expr}"`);
            }
            if (this.#vals[7] > Duration.#OneMinuteInSeconds) {
                throw new Error(`Invalid number of seconds in ISO8601 duration expression "${expr}"`);
            }
        }
        // Validate decimal value if present
        let lastIndex = this.#vals.findLastIndex(this.#isDecimal);
        if (lastIndex >= 0) {
            let firstIndex = this.#vals.findIndex(this.#isDecimal);
            let hasAnother = firstIndex >= 0 && firstIndex !== lastIndex;
            let isNotLast = this.#vals.slice(lastIndex + 1).some(v => !v);
            if (hasAnother || isNotLast) {
                throw new Error(`Illegal ISO8601 duration expression "${expr}": only smallest unit can have a decimal value`);
            }
        }
        // Validate zero duration expression
        if (this.isZero()) {
            if (this.#type === 0 && expr !== Duration.ZeroDays && expr !== Duration.ZeroSeconds) {
                throw new Error(`Illegal zero ISO8601 duration expression "${expr}": valid expressions are "${Duration.ZeroDays}" or "${Duration.ZeroSeconds}"`);
            }
            if (this.#type === 1 && expr !== Duration.ZeroDays1 && expr !== Duration.ZeroSeconds1) {
                throw new Error(`Illegal zero ISO8601 duration expression "${expr}": valid expressions are "${Duration.ZeroDays1}" or "${Duration.ZeroSeconds1}"`);
            }
            if (this.#type === 2 && expr !== Duration.ZeroDays2 && expr !== Duration.ZeroSeconds2) {
                throw new Error(`Illegal zero ISO8601 duration expression "${expr}": valid expressions are "${Duration.ZeroDays2}" or "${Duration.ZeroSeconds2}"`);
            }
        }
    }

    /**
     * Return the underlying string expression
     */
    get expression() { return this.#expr; };

    /**
     * Return the underlying string expression
     */
    get type() { return this.#type; };

    /**
     * Return the underlying sign as the numbers 1 or -1. 
     */
    get sign() { return this.#vals[0]; };

    /**
     * Return the years field if specified, or undefined if not.
     */
    get years() { return this.#vals[1]; }

    /**
     * Return the months field if specified, or undefined if not.
     */
    get months() { return this.#vals[2]; };

    /**
     * Return the weeks field if specified, or undefined if not.
     */
    get weeks() { return this.#vals[3]; }

    /**
     * Return the days field if specified, or undefined if not.
     */
    get days() { return this.#vals[4]; };

    /**
     * Return the hours field if specified, or undefined if not.
     */
    get hours() { return this.#vals[5]; };

    /**
     * Return the minutes field if specified, or undefined if not.
     */
    get minutes() { return this.#vals[6]; };

    /**
     * Return the seconds field if specified, or undefined if not.
     */
    get seconds() { return this.#vals[7]; };

    /**
     * Return an object with properties corresponding to the fields.
     */
    get fields() {
        return {
            sign: this.sign,
            years: this.years,
            months: this.months,
            days: this.days,
            weeks: this.weeks,
            hours: this.hours,
            minutes: this.minutes,
            seconds: this.seconds 
        }
    };

    /**
     * Return whether this duration is zero or not.
     * @returns {boolean}
     */
    isZero = () => this.#vals.slice(1).every(v => !v);

    /**
     * Return whether the date component of this duration is zero or not.
     * @returns {boolean}
     */
    isZeroDate = () => this.#vals.slice(1, 5).every(v => !v);

    /**
     * Return whether the time component of this duration is zero or not.
     * @returns {boolean}
     */
    isZeroTime = () => this.#vals.slice(5).every(v => !v);
    
    /*
     * Split a value into its integer and decimal parts.
     * @return Array<number>
     */
    #split = (v) => {
        if (!v) return [0, 0];
        v = v.toString();
        let i = v.indexOf('.');
        return [Math.trunc(v), i < 0 ? 0 : parseFloat(v.slice(i))];
    }

    /**
     * Return the number of milliseconds of this duration.
     * A reference date/time can be specified if necessary.
     * @param {any} refDate Optional reference date/time. Default to the current date/time.
     * @returns {number}
     */
    toMillis(refDate = Date.now()) {
        refDate = new Date(refDate); 
        let endDate = new Date(refDate);
        let vals = this.#vals.map(v => v || 0);
        let value = 0, carry = 0, oneMonth = 0;
        if (vals[1]) {
            [value, carry] = this.#split(vals[1]);
            endDate.setUTCFullYear(refDate.getUTCFullYear() + value);
        }
        if (vals[2] || carry) {
            [value, carry] = this.#split(vals[2] + carry * Duration.#OneYearInMonths);
            endDate.setUTCMonth(refDate.getUTCMonth() + value);
            // Calculate the number of days in the following month
            let toDate2 = new Date(endDate);
            toDate2.setUTCMonth(endDate.getUTCMonth() + 1);
            oneMonth = (toDate2.getTime() - endDate.getTime()) /
                (Duration.#OneDayInHours * Duration.#OneHourInMinutes * Duration.#OneMinuteInSeconds * Duration.#OneSecondInMillis);
        }
        if (vals[3] || vals[4] || carry) {
            [value, carry] = this.#split(vals[3] * Duration.#OneWeekInDays + vals[4] + carry * oneMonth);
            endDate.setUTCDate(refDate.getUTCDate() + value);
        }
        if (vals[5] || carry) {
            [value, carry] = this.#split(vals[5] + carry * Duration.#OneDayInHours);
            endDate.setUTCHours(refDate.getUTCHours() + value);
        }
        if (vals[6] || carry) {
            [value, carry] = this.#split(vals[6] + carry * Duration.#OneHourInMinutes);
            endDate.setUTCMinutes(refDate.getUTCMinutes() + value);
        }
        if (vals[7] || carry) {
            [value, carry] = this.#split(vals[7] + carry * Duration.#OneMinuteInSeconds);
            endDate.setUTCSeconds(refDate.getUTCSeconds() + value);
        }
        return this.#vals[0] * (endDate.getTime() - refDate.getTime()) + carry * Duration.#OneSecondInMillis;
    }

    static #format = (nbr = 0, siz = 2) => Math.trunc(nbr).toString().padStart(siz, "0");

    static #staticDefOptions = {type: 0, useWeeks: false, useDecimal: false};
    #defOptions = {type: this.#type, useWeeks: false, useDecimal: false};

    #getArgs(...argv) {
        if (arguments > 1 && arguments.length < 3) {
            for (let i = 1; i < 3; i++) {
                if (typeof arguments[i] === 'object') {
                    if (arguments[i] instanceof Date) {
                        return [ arguments[0], arguments[i], this.#defOptions ];
                    } else {
                        return [ arguments[0], Date.now(), arguments[i] ];
                    }
                }
            }
        } else {
            return [ arguments[0], arguments[1], arguments[2] ];
        }
    }

    /**
     * Return the ISO 8601 string expression of a duration in milliseconds.
     * A reference date/time can be specified if necessary.
     * @param {any} millis Duration in milliseconds.
     * @param {any} refDate Optional reference date/time. Default to the current date/time.
     * @param {Object} options Options.
     * @returns Duration
     */
    static toExpression(millis = 0, refDate = Date.now(), options = Duration.#staticDefOptions) {
        //[ millis, refDate, options ] = Duration.#getArgs(millis, refDate, options);
        if (arguments.length > 1 && arguments.length < 3) {
            for (let i = 1; i < 3; i++) {
                if (typeof arguments[i] === 'object') {
                    if (arguments[i] instanceof Date) {
                        refDate = arguments[i];
                        options = Duration.#staticDefOptions;
                    } else {
                        refDate = Date.now();
                        options = arguments[i];
                    }
                }
            }
        }
        if (!millis) {
            return options?.type === 2 ?
                Duration.ZeroSeconds2 : options?.type === 1 ?
                    Duration.ZeroSeconds1 : Duration.ZeroSeconds;
        }
        if (millis === Infinity) {
            return options?.type === 2 ?
                Duration.PlusInfinity2 : options?.type === 1 ?
                    Duration.PlusInfinity1 : Duration.PlusInfinity;
        }
        if (millis === -Infinity) {
            return options?.type === 2 ?
                Duration.MinusInfinity2 : options?.type === 1 ?
                    Duration.MinusInfinity1 : Duration.MinusInfinity;
        }
        let startDate = new Date(refDate); 
        let endDate = new Date(startDate.getTime() + millis);
        if (millis < 0) [ startDate, endDate ] = [ endDate, startDate ];
        let fromTime = startDate.getTime();
        let sign = millis < 0 ? -1 : 1;
        let years = 0, months = 0, days = 0, weeks = 0, hours = 0, minutes = 0, seconds = 0;
        while (endDate.setUTCFullYear(endDate.getUTCFullYear() - 1) >= fromTime) years++;
        endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);
        while (endDate.setUTCMonth(endDate.getUTCMonth() - 1) >= fromTime) months++;
        endDate.setUTCMonth(endDate.getUTCMonth() + 1)
        while (endDate.setUTCDate(endDate.getUTCDate() - 1) >= fromTime) days++;
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        while (endDate.setUTCHours(endDate.getUTCHours() - 1) >= fromTime) hours++;
        endDate.setUTCHours(endDate.getUTCHours() + 1);
        while (endDate.setUTCMinutes(endDate.getUTCMinutes() - 1) >= fromTime) minutes++;
        endDate.setUTCMinutes(endDate.getUTCMinutes() + 1);
        seconds = (endDate.getTime() - fromTime) / Duration.#OneSecondInMillis;
        // useWeeks is only supported for type 0 format
        if (options?.useWeeks && !options?.type) {
            weeks = Math.trunc(days / Duration.#OneWeekInDays);
            days %= Duration.#OneWeekInDays;
        }
        // Format the expression. The default format type 0 is used if an invalid type is specified.
        let fields = []
        if (sign && sign < 0) fields.push('-');
        fields.push('P');
        if (options?.type === 1) {
            if (years || months || days) {
                fields.push(Duration.#format(years, 4));
                fields.push(Duration.#format(months));
                fields.push(Duration.#format(days));
            }
            if (hours || minutes || seconds) {
                fields.push('T'); 
                fields.push(Duration.#format(hours));
                fields.push(Duration.#format(minutes));
                fields.push(Duration.#format(seconds));
            }
        } else if (options?.type === 2) {
            if (years || months || days) {
                fields.push(Duration.#format(years, 4));
                fields.push('-'); 
                fields.push(Duration.#format(months));
                fields.push('-'); 
                fields.push(Duration.#format(days));
            }
            if (hours || minutes || seconds) {
                fields.push('T'); 
                fields.push(Duration.#format(hours));
                fields.push(':'); 
                fields.push(Duration.#format(minutes));
                fields.push(':'); 
                fields.push(Duration.#format(seconds));
            }
        } else {
            if (years) fields.push(years + 'Y');
            if (months) fields.push(months + 'M');
            if (weeks) fields.push(weeks + 'W');
            if (days) fields.push(days + 'D')
            if (hours || minutes || seconds) {
                fields.push('T'); 
                if (hours) fields.push(hours + 'H');
                if (minutes) fields.push(minutes + 'M');
                if (seconds) fields.push(seconds + 'S');
            }
        }
        return fields.join('');
    }

    /**
     * Return the duration between two date/times as a Duration object
     * The dates may be specified using any Date constructor argument.
     * @param {any} endDate Optional end date; defaults to the current date/time.
     * @param {any} startDate Optional start date; defaults to the current date/time.
     * @param {Object} options Options.
     * @returns Duration.
     */
    static durationOf(endDate = Date.now(), startDate = Date.now(), options = Duration.#staticDefOptions) {
        //[ startDate, options ] = Duration.#getArgs(arguments);
        let millis = new Date(endDate).getTime() - new Date(startDate).getTime();
        let expr = Duration.toExpression(millis, startDate, options);
        return new Duration(expr);
    }

    /**
     * Return the end date corresponding to a given start date and this duration object.
     * The start date may be specified using any Date constructor argument.
     * @param {any} startDate Optional start date; defaults to the current date/time.
     * @returns Date.
     */
    endDate(startDate = Date.now()) {
        new Date(new Date(startDate).getTime() + this.toMillis(startDate));
    }

    /**
     * Add a duration to this duration object, returning a new Duration object.
     * @param {string|Duration} duration Duration to add.
     * @param {any} refDate Optional reference date/time. Default to the current date/time.
     * @param {Object} options Options.
     * @returns Duration
     */
    plus(duration = Duration.ZeroDays, refDate = Date.now(), options = this.#defOptions) {
        [ duration, refDate, options ] = this.#getArgs(arguments);
        let millis = this.toMillis() + new Duration(duration).toMillis(refDate);
        let expr = Duration.toExpression(millis, refDate, options);
        return new Duration(expr);
    }

    /**
     * Subtract a duration from this duration object, returning a new Duration object.
     * @param {string|Duration} duration Duration to subtract.
     * @param {any} refDate Optional reference date/time. Default to the current date/time.
     * @param {Object} options Options.
     * @returns Duration
     */
    minus(duration = Duration.ZeroDays, refDate = Date.now(), options = this.#defOptions) {
        [ duration, refDate, options ] = this.#getArgs(arguments);
        let millis = this.toMillis() - new Duration(duration).toMillis(refDate);
        let expr = Duration.toExpression(millis, refDate, options);
        return new Duration(expr);
    }

    /**
     * Multiply this duration object by a factor, returning a new Duration object.
     * @param {number} factor Factor to multiply.
     * @param {any} refDate Optional reference date/time. Default to the current date/time.
     * @param {Object} options Options.
     * @returns Duration
     */
    mult(factor = 1, refDate = Date.now(), options = this.#defOptions) {
        [ factor, refDate, options ] = this.#getArgs(arguments);
        let millis = this.toMillis(refDate) * factor;
        let expr = Duration.toExpression(millis, refDate, options);
        return new Duration(expr);
    }

    /**
     * Divide this duration object by a factor, returning a new Duration object.
     * @param {number} factor Factor to divide.
     * @param {any} refDate Optional reference date/time. Default to the current date/time.
     * @param {Object} options Options.
     * @returns Duration
     */
    div(factor = 1, refDate = Date.now(), options = this.#defOptions) {
        [ factor, refDate, options ] = this.#getArgs(arguments);
        let millis = this.toMillis(refDate) / factor;
        let expr = Duration.toExpression(millis, refDate, options);
        return new Duration(expr);
    }

    /**
     * Return the reverse (i.e with opposite sign) Duration object of this Duration object,
     * returning a new Duration object.
     * @param {Object} options Options.
     * @returns Duration
     */
    reverse(options = this.#defOptions) {
        let millis = -this.toMillis();
        let expr = Duration.toExpression(millis, options);
        return new Duration(expr);
    }

}

module.exports = Duration;
