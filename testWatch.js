
const { basename, dirname } = require('node:path');
const { existsSync } = require('node:fs');
const { readFile, watch } = require('node:fs/promises');
const { createHash } = require('node:crypto');

const file = '/home/dev/projects/cron/xtest/x';
const delaySeconds = 60;

async function monitorFile(filePath, callback, signal) {

    let dirPath = dirname(filePath);
    let dirName = basename(dirPath);
    let baseName = basename(filePath);

    const digest = async (filePath) =>
        createHash('md5').update(await readFile(filePath, { encoding: 'utf8' })).digest('utf8');

    let prevDigest;
    let currDigest = existsSync(filePath) ? await digest(filePath) : undefined;

    try {
        for await (const { eventType, filename } of watch(dirPath, { signal })) {
            if (filename && filename === dirName) {
                throw new Error(`Directory ${dirPath} has been moved or deleted`);
            }
            if (filename && filename === baseName) {
                if (eventType === 'change') {
                    currDigest = await digest(filePath);
                    if (prevDigest && currDigest !== prevDigest) {
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
        if (err.code === 'ABORT_ERR') {
            console.log(`Abort watcher after ${delaySeconds} seconds`);
        } else {
            throw err;
        }
    } 
}

let ac = new AbortController();

monitorFile(file, (eventType) => {
    switch(eventType) {
        case 'create': console.log(`file ${file} created`); break;
        case 'modify': console.log(`file ${file} modified`); break;
        case 'delete': console.log(`file ${file} deleted`); break;
    }
}, ac.signal);

setTimeout(() => ac.abort(), delaySeconds*1000);
