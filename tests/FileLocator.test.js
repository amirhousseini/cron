/**
 * Unit tests of the class FileLocator.
 */

'use strict';

const { homedir } = require('node:os');
const { cwd } = require('node:process');
const { relative, sep: pathSeparator, delimiter: pathDelimiter } = require('node:path');
const { suite, test, afterEach } = require('node:test');
const { expect } = require('chai');

const { newTempDir, newTempFile, purge } = require('./utils.js');
const { FileLocator } = require('..');

// Test suites

const workDir = cwd();

suite("Unit tests of class 'FileLocator'", () => {

    /*
     * Ensure purging of temporary directories and files
     */
    afterEach(() => purge());

    // Unit tests

    test("Verify that the resolution paths include the home directory", { skip: false }, () => {
        let paths = new FileLocator().list;
        expect(paths).to.include(homedir());
    });

    test("Verify that the resolution paths include the current working directory", { skip: false }, () => {
        let paths = new FileLocator().list;
        expect(paths).to.include(workDir);
    });

    test("Verify that the resolution paths include the main path", { skip: false }, () => {
        let paths = new FileLocator().list;
        expect(paths).to.include(require.main.path);
    });

    test("Verify that the resolution paths include all possible node_modules paths", { skip: false }, () => {
        let paths = new FileLocator().list;
        let parts = require.main.path.split(pathSeparator);
        parts.push('node_modules');
        while (parts.length > 2) {
            parts.splice(-2, 1);
            expect(paths).to.include(parts.join(pathSeparator));
        }
    });

    test("Verify that the resolution paths include supplemental paths specified as absolute paths", { skip: false }, () => {
        let tempDirs = [ newTempDir(), newTempDir(),newTempDir() ];
        let paths = new FileLocator(tempDirs[0], tempDirs[1], tempDirs[2]).list;
        for (let dir of tempDirs) expect(paths).to.include(dir);
    });

    test("Verify that the resolution paths include supplemental paths specified as relative paths", { skip: false }, () => {
        let tempDirs = [ newTempDir(), newTempDir(),newTempDir() ];
        let paths = new FileLocator(relative(workDir, tempDirs[0]), relative(workDir, tempDirs[1]), relative(workDir, tempDirs[2])).list;
        for (let dir of tempDirs) expect(paths).to.include(dir);
    });

    test("Verify that the resolution paths include supplemental paths specified as array of absolute paths", { skip: false }, () => {
        let tempDirs = [ newTempDir(), newTempDir(),newTempDir() ];
        let paths = new FileLocator(tempDirs).list;
        for (let dir of tempDirs) expect(paths).to.include(dir);
    });

    test("Verify that the resolution paths include supplemental paths specified as array of relative paths", { skip: false }, () => {
        let tempDirs = [ newTempDir(), newTempDir(),newTempDir() ];
        let paths = new FileLocator(tempDirs.map(dir => relative(workDir, dir))).list;
        for (let dir of tempDirs) expect(paths).to.include(dir);
    });

    test("Verify that the resolution paths include supplemental paths specified as OS path", { skip: false }, () => {
        let tempDirs = [ newTempDir(), newTempDir(),newTempDir() ];
        let paths = new FileLocator(tempDirs.join(pathDelimiter)).list;
        for (let dir of tempDirs) expect(paths).to.include(dir);
    });

    test("Verify that the file locator resolves absolute paths", { skip: false }, () => {
        let path = newTempFile();
        let locator = new FileLocator();
        expect(locator.resolve(path)).equals(path);
    });

    test("Verify that file locator resolves relative paths", { skip: false }, () => {
        let path = newTempFile();
        let relPath = relative(workDir, path);
        let locator = new FileLocator();
        expect(locator.resolve(relPath)).equals(path);
    });

});