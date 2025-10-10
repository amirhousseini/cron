# cron
## *** OUTDATED ***

Implementation of a cron-like service.
The module exports two classes: CronSchedule and CronEngine.
CronSchedule is the parsed representation of a cron schedule expression as specified by GNU's crontab
(see https://www.gnu.org/software/mcron/manual/html_node/Crontab-file.html).
It is mainly used by CronEngine, but can also be used to validate cron schedule expression.
CronEngine is a background service executing tasks at scheduled times.
The service can be started and stopped.
It starts automatically after construction by default.
Tasks can be registered and deregistered at any time in any number.
Deregistration does not cancel running tasks, however.
Schedules are specified according to GNU's crontab specifications.
Tasks are specified either as function or as module path with optional arguments.
Functions are executed in the main thread. Modules can be executed in either
worker threads or forked child processes.
Execution of OS commands is not supported.
Task can alternatively be specified in a crontab-like file specified at construction time.
There is no communication between tasks and the service.
The service does not log its operation and does not monitor tasks' execution.
Hence the service will not attempt to abort non-terminating tasks or skip faulty tasks.

## Install
```
$ npm install cron
```

## Usage
See test/testCronSchedule.js and test/testCronEngine.js.

## Test output example
```sh
$ npm run testCronEngine

> cron@1.0.1 testCronEngine
> (cd test; node testCronEngine.js)

immediate start
started at 19:22:29.593
"* * * * *" task 1 -> 19:23:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:23:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:24:00.000 execution in same thread
"* * * * *" task 1 -> 19:25:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:25:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"*/5 * * * *" task 3 -> 19:25:00.000 [ 'execution in forked process', 'more-data' ]
"* * * * *" task 1 -> 19:26:00.000 execution in same thread
"* * * * *" task 1 -> 19:27:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:27:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:28:00.000 execution in same thread
"* * * * *" task 1 -> 19:29:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:29:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:30:00.000 execution in same thread
"*/5 * * * *" task 3 -> 19:30:00.000 [ 'execution in forked process', 'more-data' ]
"* * * * *" task 1 -> 19:31:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:31:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:32:00.000 execution in same thread
"* * * * *" task 1 -> 19:33:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:33:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:34:00.000 execution in same thread
"* * * * *" task 1 -> 19:35:00.000 execution in same thread
"*/5 * * * *" task 3 -> 19:35:00.000 [ 'execution in forked process', 'more-data' ]
"1-59/2 * * * *" task 2 -> 19:35:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:36:00.000 execution in same thread
"* * * * *" task 1 -> 19:37:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:37:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:38:00.000 execution in same thread
"* * * * *" task 1 -> 19:39:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:39:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:40:00.000 execution in same thread
"*/5 * * * *" task 3 -> 19:40:00.000 [ 'execution in forked process', 'more-data' ]
"* * * * *" task 1 -> 19:41:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:41:00.000 { type: 'execution in worker thread', arg: 'more-data' }
stopped at 19:41:09.101

delayed start
started at 19:41:09.102
"* * * * *" task 1 -> 19:42:00.000 execution in same thread
"* * * * *" task 1 -> 19:43:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:43:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:44:00.000 execution in same thread
"* * * * *" task 1 -> 19:45:00.000 execution in same thread
"*/5 * * * *" task 3 -> 19:45:00.000 [ 'execution in forked process', 'more-data' ]
"1-59/2 * * * *" task 2 -> 19:45:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:46:00.000 execution in same thread
"* * * * *" task 1 -> 19:47:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:47:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:48:00.000 execution in same thread
"* * * * *" task 1 -> 19:49:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:49:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:50:00.000 execution in same thread
"*/5 * * * *" task 3 -> 19:50:00.000 [ 'execution in forked process', 'more-data' ]
"* * * * *" task 1 -> 19:51:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:51:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:52:00.000 execution in same thread
"* * * * *" task 1 -> 19:53:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:53:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:54:00.000 execution in same thread
"* * * * *" task 1 -> 19:55:00.000 execution in same thread
"*/5 * * * *" task 3 -> 19:55:00.000 [ 'execution in forked process', 'more-data' ]
"1-59/2 * * * *" task 2 -> 19:55:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:56:00.000 execution in same thread
"* * * * *" task 1 -> 19:57:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:57:00.000 { type: 'execution in worker thread', arg: 'more-data' }
"* * * * *" task 1 -> 19:58:00.000 execution in same thread
"* * * * *" task 1 -> 19:59:00.000 execution in same thread
"1-59/2 * * * *" task 2 -> 19:59:00.000 { type: 'execution in worker thread', arg: 'more-data' }
stopped at 19:59:48.486

immediate start with crontab file
started at 19:59:48.491
"* * * * *" task 1 -> 20:00:00.000 []
"*/5 * * * *" task 2 -> 20:00:00.000 [ 'execution in forked process', 'more-data-2' ]
"* * * * *" task 1 -> 20:01:00.000 []
"1-59/2 * * * *" task 3 -> 20:01:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:02:00.000 []
"* * * * *" task 1 -> 20:03:00.000 []
"1-59/2 * * * *" task 3 -> 20:03:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:04:00.000 []
"* * * * *" task 1 -> 20:05:00.000 []
"*/5 * * * *" task 2 -> 20:05:00.000 [ 'execution in forked process', 'more-data-2' ]
"1-59/2 * * * *" task 3 -> 20:05:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:06:00.000 []
"* * * * *" task 1 -> 20:07:00.000 []
"1-59/2 * * * *" task 3 -> 20:07:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:08:00.000 []
"* * * * *" task 1 -> 20:09:00.000 []
"1-59/2 * * * *" task 3 -> 20:09:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:10:00.000 []
"*/5 * * * *" task 2 -> 20:10:00.000 [ 'execution in forked process', 'more-data-2' ]
"* * * * *" task 1 -> 20:11:00.000 []
"1-59/2 * * * *" task 3 -> 20:11:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:12:00.000 []
"* * * * *" task 1 -> 20:13:00.000 []
"1-59/2 * * * *" task 3 -> 20:13:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:14:00.000 []
"*/5 * * * *" task 2 -> 20:15:00.000 [ 'execution in forked process', 'more-data-2' ]
"* * * * *" task 1 -> 20:15:00.000 []
"1-59/2 * * * *" task 3 -> 20:15:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:16:00.000 []
"* * * * *" task 1 -> 20:17:00.000 []
"1-59/2 * * * *" task 3 -> 20:17:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:18:00.000 []
stopped at 20:18:27.660

delayed start with crontab file
started at 20:18:27.662
"* * * * *" task 1 -> 20:19:00.000 []
"1-59/2 * * * *" task 3 -> 20:19:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:20:00.000 []
"*/5 * * * *" task 2 -> 20:20:00.000 [ 'execution in forked process', 'more-data-2' ]
"* * * * *" task 1 -> 20:21:00.000 []
"1-59/2 * * * *" task 3 -> 20:21:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:22:00.000 []
"* * * * *" task 1 -> 20:23:00.000 []
"1-59/2 * * * *" task 3 -> 20:23:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:24:00.000 []
"* * * * *" task 1 -> 20:25:00.000 []
"*/5 * * * *" task 2 -> 20:25:00.000 [ 'execution in forked process', 'more-data-2' ]
"1-59/2 * * * *" task 3 -> 20:25:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:26:00.000 []
"* * * * *" task 1 -> 20:27:00.000 []
"1-59/2 * * * *" task 3 -> 20:27:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:28:00.000 []
"* * * * *" task 1 -> 20:29:00.000 []
"1-59/2 * * * *" task 3 -> 20:29:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:30:00.000 []
"*/5 * * * *" task 2 -> 20:30:00.000 [ 'execution in forked process', 'more-data-2' ]
"* * * * *" task 1 -> 20:31:00.000 []
"1-59/2 * * * *" task 3 -> 20:31:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:32:00.000 []
"* * * * *" task 1 -> 20:33:00.000 []
"1-59/2 * * * *" task 3 -> 20:33:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:34:00.000 []
"* * * * *" task 1 -> 20:35:00.000 []
"*/5 * * * *" task 2 -> 20:35:00.000 [ 'execution in forked process', 'more-data-2' ]
"1-59/2 * * * *" task 3 -> 20:35:00.000 [ 'execution in forked process', 'more-data-3' ]
"* * * * *" task 1 -> 20:36:00.000 []
"* * * * *" task 1 -> 20:37:00.000 []
"1-59/2 * * * *" task 3 -> 20:37:00.000 [ 'execution in forked process', 'more-data-3' ]
stopped at 20:37:06.754

$ npm run testCronSchedule

> cron@1.0.1 testCronSchedule
> node test/testCronSchedule.js

Now is 2025-08-29T19:19:38.491+02:00 (Fri)

"       *       *  *  *  * "  =>  "* * * * *"
{"minute":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"hour":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"day-of-month":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],"month":[0,1,2,3,4,5,6,7,8,9,10,11],"day-of-week":[0,1,2,3,4,5,6,7]}
Next schedule is 2025-08-29T19:20:00.000+02:00 (Fri)
2025-06-18T03:23:45.000+02:00 (Wed) -> no match
2025-06-18T03:23:00.000+02:00 (Wed) -> match
2025-06-19T03:24:00.000+02:00 (Thu) -> match
2025-06-20T03:25:00.000+02:00 (Fri) -> match

"24 * * * *"
{"minute":[24],"hour":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"day-of-month":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],"month":[0,1,2,3,4,5,6,7,8,9,10,11],"day-of-week":[0,1,2,3,4,5,6,7]}
Next schedule is 2025-08-29T19:24:00.000+02:00 (Fri)
2025-06-18T03:23:00.000+02:00 (Wed) -> no match
2025-06-19T03:24:00.000+02:00 (Thu) -> match
2025-06-20T03:25:00.000+02:00 (Fri) -> no match

"* 3 * * *"
{"minute":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"hour":[3],"day-of-month":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],"month":[0,1,2,3,4,5,6,7,8,9,10,11],"day-of-week":[0,1,2,3,4,5,6,7]}
Next schedule is 2025-08-30T03:00:00.000+02:00 (Sat)
2025-06-18T03:23:00.000+02:00 (Wed) -> match
2025-06-19T03:24:00.000+02:00 (Thu) -> match
2025-06-20T03:25:00.000+02:00 (Fri) -> match

"* * 19 * *"
{"minute":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"hour":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"day-of-month":[19],"month":[0,1,2,3,4,5,6,7,8,9,10,11],"day-of-week":[0,1,2,3,4,5,6,7]}
Next schedule is 2025-09-19T00:00:00.000+02:00 (Fri)
2025-06-18T03:23:00.000+02:00 (Wed) -> no match
2025-06-19T03:24:00.000+02:00 (Thu) -> match
2025-06-20T03:25:00.000+02:00 (Fri) -> no match

"* 3 1,19 * 4"
{"minute":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"hour":[3],"day-of-month":[1,19],"month":[0,1,2,3,4,5,6,7,8,9,10,11],"day-of-week":[4]}
Next schedule is 2026-01-01T03:00:00.000+01:00 (Thu)
2025-06-18T03:23:00.000+02:00 (Wed) -> no match
2025-06-19T03:24:00.000+02:00 (Thu) -> match
2025-06-20T03:25:00.000+02:00 (Fri) -> no match

"*/6 3 1,19 * Thu"
{"minute":[0,6,12,18,24,30,36,42,48,54],"hour":[3],"day-of-month":[1,19],"month":[0,1,2,3,4,5,6,7,8,9,10,11],"day-of-week":[4]}
Next schedule is 2026-01-01T03:00:00.000+01:00 (Thu)
2025-06-18T03:23:00.000+02:00 (Wed) -> no match
2025-06-19T03:24:00.000+02:00 (Thu) -> match
2025-06-20T03:25:00.000+02:00 (Fri) -> no match

"20-40/2 * 15-20 Jun-Sep Thu"
{"minute":[20,22,24,26,28,30,32,34,36,38,40],"hour":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"day-of-month":[15,16,17,18,19,20],"month":[5,6,7,8],"day-of-week":[4]}
Next schedule is 2025-09-18T00:20:00.000+02:00 (Thu)
2025-06-18T03:23:00.000+02:00 (Wed) -> no match
2025-06-19T03:24:00.000+02:00 (Thu) -> match
2025-06-20T03:25:00.000+02:00 (Fri) -> no match

"@hourly"
{"minute":[0],"hour":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"day-of-month":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],"month":[0,1,2,3,4,5,6,7,8,9,10,11],"day-of-week":[0,1,2,3,4,5,6,7]}
Next schedule is 2025-08-29T20:00:00.000+02:00 (Fri)
2025-06-18T03:00:00.000+02:00 (Wed) -> match
2025-06-18T03:24:00.000+02:00 (Wed) -> no match
2025-06-18T04:00:00.000+02:00 (Wed) -> match

"@daily"
{"minute":[0],"hour":[0],"day-of-month":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],"month":[0,1,2,3,4,5,6,7,8,9,10,11],"day-of-week":[0,1,2,3,4,5,6,7]}
Next schedule is 2025-08-30T00:00:00.000+02:00 (Sat)
2025-06-18T11:30:00.000+02:00 (Wed) -> no match
2025-06-19T00:00:00.000+02:00 (Thu) -> match
2025-06-19T00:30:00.000+02:00 (Thu) -> no match

"@midnight"
{"minute":[0],"hour":[0],"day-of-month":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],"month":[0,1,2,3,4,5,6,7,8,9,10,11],"day-of-week":[0,1,2,3,4,5,6,7]}
Next schedule is 2025-08-30T00:00:00.000+02:00 (Sat)
2025-06-18T11:30:00.000+02:00 (Wed) -> no match
2025-06-19T00:00:00.000+02:00 (Thu) -> match
2025-06-19T00:30:00.000+02:00 (Thu) -> no match

"@weekly"
{"minute":[0],"hour":[0],"day-of-month":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],"month":[0,1,2,3,4,5,6,7,8,9,10,11],"day-of-week":[0]}
Next schedule is 2025-08-31T00:00:00.000+02:00 (Sun)
2025-06-21T00:00:00.000+02:00 (Sat) -> no match
2025-06-22T00:00:00.000+02:00 (Sun) -> match
2025-06-23T00:00:00.000+02:00 (Mon) -> no match

"@monthly"
{"minute":[0],"hour":[0],"day-of-month":[1],"month":[0,1,2,3,4,5,6,7,8,9,10,11],"day-of-week":[0,1,2,3,4,5,6,7]}
Next schedule is 2025-09-01T00:00:00.000+02:00 (Mon)
2025-06-30T00:00:00.000+02:00 (Mon) -> no match
2025-07-01T00:00:00.000+02:00 (Tue) -> match
2025-06-05T00:00:00.000+02:00 (Thu) -> no match

"@yearly"
{"minute":[0],"hour":[0],"day-of-month":[1],"month":[0],"day-of-week":[0,1,2,3,4,5,6,7]}
Next schedule is 2026-01-01T00:00:00.000+01:00 (Thu)
2025-12-31T00:00:00.000+01:00 (Wed) -> no match
2026-01-01T00:00:00.000+01:00 (Thu) -> match
2025-01-05T00:00:00.000+01:00 (Sun) -> no match

"@annually"
{"minute":[0],"hour":[0],"day-of-month":[1],"month":[0],"day-of-week":[0,1,2,3,4,5,6,7]}
Next schedule is 2026-01-01T00:00:00.000+01:00 (Thu)
2025-12-31T00:00:00.000+01:00 (Wed) -> no match
2026-01-01T00:00:00.000+01:00 (Thu) -> match
2025-01-05T00:00:00.000+01:00 (Sun) -> no match

"60 * * * *"
Error> Illegal value in minute field: "60"

"* 60 * * *"
Error> Illegal value in hour field: "60"

"* * 32 * *"
Error> Illegal value in day-of-month field: "32"

"* * * 13 *"
Error> Illegal value in month field: "13"

"* * * xxx *"
Error> Invalid value in month field: "xxx"

"* * * * 8"
Error> Illegal value in day-of-week field: "8"

"* * * * xxx"
Error> Invalid value in day-of-week field: "xxx"

"@reboot"
Error> Invalid alias: @reboot
```
