/**
 * Unit tests of the function parseCommandLine.
 */

'use strict';

const { suite, test } = require('node:test');
const { expect } = require('chai');

const { parseCommandLine } = require('..');

// Test suites

suite("Unit tests of function 'parseCommandLine'", () => {

    // Unit tests

    test("Parsing of simple tokens", { skip: false }, () => {
        let actualResult = parseCommandLine('AAAA BBBB CCCC');
        let expectedResult = [ 'AAAA', 'BBBB', 'CCCC' ];
        expect(actualResult).to.deep.equal(expectedResult);
    });

    test("Parsing of simple tokens with more than one space characters", { skip: false }, () => {
        let actualResult = parseCommandLine('  AAAA    BBBB    CCCC  ');
        let expectedResult = [ 'AAAA', 'BBBB', 'CCCC' ];
        expect(actualResult).to.deep.equal(expectedResult);
    });

    test("Parsing of simple tokens with more than one tab characters", { skip: false }, () => {
        let actualResult = parseCommandLine('\t\tAAAA\t\tBBBB\t\tCCCC\t\t');
        let expectedResult = [ 'AAAA', 'BBBB', 'CCCC' ];
        expect(actualResult).to.deep.equal(expectedResult);
    });

    test("Parsing of simple tokens with double quotes", { skip: false }, () => {
        let actualResult = parseCommandLine('"AAAA" "BBBB" "CCCC"');
        let expectedResult = [ 'AAAA', 'BBBB', 'CCCC' ];
        expect(actualResult).to.deep.equal(expectedResult);
    });

    test("Parsing of simple tokens with single quotes", { skip: false }, () => {
        let actualResult = parseCommandLine("'AAAA' 'BBBB' 'CCCC'");
        let expectedResult = [ 'AAAA', 'BBBB', 'CCCC' ];
        expect(actualResult).to.deep.equal(expectedResult);
    });

    test("Parsing of tokens featuring space characters within double quotes", { skip: false }, () => {
        let actualResult = parseCommandLine('"AA  AA" "B  BBB" "CCC  C"');
        let expectedResult = [ 'AA  AA', 'B  BBB', 'CCC  C' ];
        expect(actualResult).to.deep.equal(expectedResult);
    });

    test("Parsing of tokens featuring space characters within single quotes", { skip: false }, () => {
        let actualResult = parseCommandLine("'AA  AA' 'B  BBB' 'CCC  C'");
        let expectedResult = [ 'AA  AA', 'B  BBB', 'CCC  C' ];
        expect(actualResult).to.deep.equal(expectedResult);
    });

    test("Parsing of tokens featuring tabs characters within double quotes", { skip: false }, () => {
        let actualResult = parseCommandLine('"AA\t\tAA" "B\t\tBBB" "CCC\t\tC"');
        let expectedResult = [ 'AA\t\tAA', 'B\t\tBBB', 'CCC\t\tC' ];
        expect(actualResult).to.deep.equal(expectedResult);
    });

    test("Parsing of tokens featuring tabs characters within single quotes", { skip: false }, () => {
        let actualResult = parseCommandLine("'AA\t\tAA' 'B\t\tBBB' 'CCC\t\tC'");
        let expectedResult = [ 'AA\t\tAA', 'B\t\tBBB', 'CCC\t\tC' ];
        expect(actualResult).to.deep.equal(expectedResult);
    });

    test("Parsing of tokens with unbalanced double quotes", { skip: false }, () => {
        expect(() => parseCommandLine('"AAAA "BBBB" "CCCC"')).to.throw(Error);
    });

    test("Parsing of tokens with unbalanced single quotes", { skip: false }, () => {
        expect(() => parseCommandLine("AAAA 'BBBB CCCC")).to.throw(Error);
    });

    test("Parsing of tokens featuring escape sequence within double quotes", { skip: false }, () => {
        let actualResult = parseCommandLine('"AA\x09\u000AAA" "B\x09\u0013BBB" "CCC\x09\u0012C"');
        let expectedResult = [ 'AA\t\nAA', 'B\t\x13BBB', 'CCC\t\x12C' ];
        expect(actualResult).to.deep.equal(expectedResult);
    });

    test("Parsing of tokens featuring escape sequence within single quotes", { skip: false }, () => {
        let actualResult = parseCommandLine("'AA\x09\u000AAA' 'B\x09\u0013BBB' 'CCC\x09\u0012C'");
        let expectedResult = [ 'AA\t\nAA', 'B\t\x13BBB', 'CCC\t\x12C' ];
        expect(actualResult).to.deep.equal(expectedResult);
    });

    test("Parsing of complex tokens featuring escape sequences within double quotes", { skip: false }, () => {
        let actualResult = parseCommandLine('./sampleTask.js "arg\\"1\\" " " arg 2"');
        let expectedResult = [ './sampleTask.js', 'arg"1"', 'arg 2' ];
        expect(actualResult).to.deep.equal(expectedResult);
    });

    test("Parsing of complex tokens featuring escape sequence within single quotes", { skip: false }, () => {
        let actualResult = parseCommandLine("./sampleTask.js 'arg\"1\" ' ' arg 2'");
        let expectedResult = [ './sampleTask.js', 'arg"1"', 'arg 2' ];
        expect(actualResult).to.deep.equal(expectedResult);
    });

});