/**
 * Support module for the unit tests in the same directory.
 */

'use strict';

const { join } = require('node:path');
const { appendFileSync, mkdtempSync, rmSync } = require('node:fs');
const { cwd } = require('node:process');

// Registry of temporary files and directories created by newTempDir() and newTempFile().
const tempDirs = [];
const tempFiles = [];

/*
 * Register a temporary directory or file path in a given registry, returning the path registered.
 * @param {string} path File path.
 * @param {string} registry Path array.
 * @returns {string} Returns the path passed as argument.
 */
const register = (registry, path) => {
    registry.push(path);
    return path;
}

/**
 * Append some content to a given file. A new file is created if does not exist.
 * @param {string} path File path.
 * @param {string} content Content to append; defaults to an empty string.
 * @returns {string} Returns the file path passed as argument.
 */
const appendContent = (path, content = '') => {
    appendFileSync(path, content, { flush: true });
    return path;
}

/**
 * Return a random name of a given size.
 * The default character set features the same characters used for representing numbers with radix 36.
 * @param {number} size Number of character to return.
 * @param {string} charset Optional character set; defaults to the decimal digits, lowercase, and uppercase english letters.
 * @return {string} Returns a random name.
 */
const tempName = (size, charset = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') => {
    let chars = [];
    for (let i = 0; i < size; i++) {
        chars.push(charset.at(Math.floor(Math.random() * charset.length)));
    }
    return chars.join('');
}

/**
 * Create a temporary sub-directory to a given directory, returning its absolute path.
 * The resulting name starts with a dot.
 * The sub-directory is registered for later removal. 
 * @param {string} path Optional directory path; by default the current working directory.
 * @return {string} Returns the absolute path of the path passed as argument.
 */
const newTempDir = (path = cwd()) =>
    register(tempDirs, join(path, mkdtempSync('.')));

/**
 * Create a temporary empty file in a given directory, returning its absolute path.
 * The resulting name starts with a dot.
 * The file is registered for later removal. 
 * @param {string} path Optional directory path; by default the current working directory.
 * @return {string} Returns the absolute path of the path passed as argument.
 */
const newTempFile = (path = cwd()) =>
    register(tempFiles, appendContent(join(path, '.' + tempName(6))));

/**
 * Remove a given file or a directoy, recursively and forcibly by default.
 * @param {string} path File or directory path.
 * @param {Object} options Options (@see node:fs.rmSync() ).
 */
const remove = (path, options = { recursive: true, force: true }) => {
    options = Object.assign({}, { recursive: true, force: true }, options);
    rmSync(path, { recursive: true, force: true });
};

/**
 * Remove all temporary files and directories created so far.
 */
const purge = () => {
    tempFiles.forEach(path => remove(path));
    tempDirs.forEach(path => remove(path));
}

module.exports = {
    appendContent, tempName, newTempDir, newTempFile, remove, purge
}
