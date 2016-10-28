var builder = require('botbuilder');

var azapi = require('./azapi');
var azstate = require('./azstate');

var util = require('util');

var azbot = {

    // for returning message
    bot: undefined,

    //http://stackoverflow.com/questions/141348/what-is-the-best-way-to-parse-a-time-into-a-date-object-from-user-input-in-javas
    /**
     * Parse a time in nearly any format
     * @param {string} time - Anything like 1 p, 13, 1:05 p.m., etc.
     * @returns {Date} - Date object for the current date and time set to parsed time
    */
    parseTime: function (time) {
        var b = time.match(/\d+/g);

        // return undefined if no matches
        if (!b) return;

        var d = new Date();
        d.setHours(b[0] > 12 ? b[0] : b[0] % 12 + (/p/i.test(time) ? 12 : 0), // hours
            /\d/.test(b[1]) ? b[1] : 0,     // minutes
            /\d/.test(b[2]) ? b[2] : 0);    // seconds
        return d;
    },

    // help cmd
    cmdlist: 'list',
    cmdstart: 'start `vmname`',
    cmdstop: 'stop `vmname`',
    cmdstatus: 'status `vmname`',
    cmdusage: 'usage [sum | detail [meter|date]',
    cmdschset: 'sch set [start|stop|echo] `vmname` `time` [once*|d(ay)|w(eek) n]',
    cmdschunset: 'sch unset `id`',
    cmdschshow: 'sch show',
    cmddebug: 'debug',

    help: function (session) {

        // DO NOT USE "<vmname>" syntax, this will cause 'BAD REQUEST' in skype bot
        var helpdoc = "## Commands List\n\n";
        helpdoc += util.format("* %s\n\n* %s\n\n* %s\n\n", azbot.cmdlist, azbot.cmdstart, azbot.cmdstop);
        helpdoc += util.format("* %s\n\n* %s\n\n* %s\n\n", azbot.cmdstatus, azbot.cmdusage, azbot.cmdschset);
        helpdoc += util.format("* %s\n\n* %s\n\n* %s\n\n", azbot.cmdschunset, azbot.cmdschshow, azbot.cmddebug);

        session.send(helpdoc);
        session.endDialog();
    },

    debug: function (session) {
        var uid = session.message.user.id;
        var conf = azstate.globalState.UserConf[uid];
        var date = new Date(azstate.lastRuntime + 32400000);

        var body = util.format("User: %s, %s\n\n", session.message.user.name, session.message.user.id);

        body += util.format("subscription: %s\n\n", conf.azure.subscription);
        body += util.format("last schedule runtime(KST): %s\n\n", date.toLocaleString());

        var obj = Object.keys(azstate.globalState.Schedule);    // toArray
        if (obj.length == 0) {
            body += "No schedule set\n\n";
        } else {
            body += "Schdules are:\n\n"
            for (var i = 0; i < obj.length; i++) {

                var runDate = new Date(azstate.globalState.Schedule[obj[i]].time + 32400000);
                body += util.format("- %s(KST), %s\n\n", runDate.toLocaleString(),
                    JSON.stringify(azstate.globalState.Schedule[obj[i]]));
            }
        }

        session.send(body);
        session.endDialog();
    },

    usage: function (session, args, next) {
        var cmd = session.message.text.split(/[ ,]+/);

        var uid = session.message.user.id;
        azapi.checkTokenAndRun(uid, function () {

            if (cmd[1] === "sum") {
                // show summary
                session.beginDialog('/usagesum');

            } else if (cmd[1] === "detail") {

                session.beginDialog('/usagedetail', cmd[2])

            } else {
                // do nothing
                session.send("Wrong command: " + azbot.cmdusage);
                session.endDialog();
            }
        });
    },

    sch: function (session, args, next) {

        var cmd = session.message.text.split(/[ ,]+/);
        var uid = session.message.user.id;

        switch (cmd[1]) {
            case 'set':
                if (cmd.length >= 5) {
                    var _cmd = cmd[2]
                    var _vmname = cmd[3];
                    var _time = azbot.parseTime(cmd[4]);
                    var _rep = 0;
                    var _offsetday = 0;
                    if (cmd[5] !== undefined) {
                        switch (cmd[5]) {
                            case 'd':
                            case 'day':
                                _rep = 86400000;
                                break;
                            case 'w':
                            case 'week':
                                var offsetday = 0
                                if (cmd[6] !== undefined) {
                                    _offsetday = parseInt(cmd[6]);
                                }
                                _rep = 86400000 * 7;
                                break;
                            // debug set
                            case 'm':
                                _rep = 60000;
                                break;
                            case 'm5':
                                _rep = 300000;
                                break;
                            case 'h':
                                _rep = 3600000;
                                break;
                        }
                    }

                    if (session.userData.list === undefined || session.userData.list[_vmname] === undefined) {
                        session.send("vmname `%s` is not listed, Run `list`", _vmname);
                        session.endDialog();
                        return;
                    }

                    session.beginDialog('/schedule', [_cmd, _vmname, _time.getTime() + 86400000 * _offsetday, _rep]);

                }
                else {
                    session.beginDialog('/schedule');
                }
                break;
            case 'unset':
                session.beginDialog('/unschedule', cmd[2]);
                break;
            case 'show':
                session.beginDialog('/showschedule');
                break;
            default:
                session.send('Please type `help`');
                session.endDialog();
        }
    },

    runSchedule: function () {

        var date = new Date();
        console.log("timer at " + date);
        azstate.lastRuntime = date.getTime();

        var obj = Object.keys(azstate.globalState.Schedule);    // toArray
        for (var i = 0; i < obj.length; i++) {
            var schedule = azstate.globalState.Schedule[obj[i]];

            var runtime = date.getTime();

            if (runtime > schedule.time) {

                var uid = schedule.uid;
                var vmlist = azstate.globalState.UserConf[uid].vmlist;

                //var vm = vmlist[schedule.vmname];
                console.log(util.format("vm id: %", (schedule.vmid === undefined) ? "undefined" : schedule.vmid));

                var msg = JSON.parse(azstate.globalState.UserConf[uid]._message);
                if (schedule.cmd == "start") {
                    azapi.doStart(uid, schedule.vmid, function (restxt) {
                        msg.timestamp = date;
                        msg.text = restxt;
                        azbot.bot.send(msg);
                    });
                } else if (schedule.cmd == "stop") {
                    azapi.doStop(uid, schedule.vmid, function (restxt) {

                        msg.timestamp = date;
                        msg.text = restxt;
                        azbot.bot.send(msg);
                    });
                } else if (schedule.cmd == "echo") {

                    msg.timestamp = date;
                    msg.text = util.format("Hello %s:%s", schedule.cmd, schedule.vmname);
                    azbot.bot.send(msg);
                }

                if (schedule.repeat == 0) {
                    // delete if no repeat set
                    delete azstate.globalState.Schedule[obj[i]];
                } else {
                    // set repeat 
                    azstate.globalState.Schedule[obj[i]].time += schedule.repeat;
                }

                azstate.saveGlobalState();
            }
        }
    }

};

module.exports = azbot;