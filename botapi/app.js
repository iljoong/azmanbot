/*
 * azurebot: Azure management bot
 * bot with CLI style
 */

var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');
var util = require('util');
var fs = require('fs');

var azapi = require('./azapi');
var azbot = require('./azbot');
var azstate = require('./azstate');

// setup
var server = restify.createServer();
// post bodyparser
server.use(restify.bodyParser({ mapParams: true }));

server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log("%s listening to %s", server.name, server.url);

    azstate.getGlobalState();
});

// create bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

// Init
azbot.runSchedule();
setInterval(azbot.runSchedule, 300000);  // every 5 min
//setInterval(azbot.runSchedule, 60000);  // every 1 min

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// dialog
var intents = new builder.IntentDialog();
bot.dialog('/', intents);

//it calls every new dialog
intents.onBegin((session, args, next) => {

    // init
    azstate.setGlobalState(session.message);
    azbot.bot = bot;

    // check registration
    var uid = session.message.user.id;
    if (azstate.getUserConf(uid).azure == undefined) {
        session.send('First things first, %s. Please, register your Azmanbot info', session.message.user.name);
        session.endDialog();
        session.beginDialog('/register');
        return;
    }

    return next();
});

// features
intents.matches(/^list/i, [
    (session, args, next) => {

        var uid = session.message.user.id;

        azapi.getList(uid, function (result) {

            session.userData.list = {};

            for (var i = 0; i < result.value.length; i++) {
                session.userData.list[result.value[i].name] = { 'name': result.value[i].name, 'id': result.value[i].id };
            }

            session.beginDialog('/list');
        });
    }]);

intents.matches(/^status/i, [
    (session, args, next) => {

        var cmd = session.message.text.split(/[ ,]+/);

        if (cmd.length > 1) {
            next({ response: cmd[1] })
        }
        else {
            builder.Prompts.text(session, "Name of VM to show status?");
        }

    },
    (session, results) => {
        if (results.response) {
            session.beginDialog('/status', results.response);
        }
    }
]);

intents.matches(/^start/i, [
    (session, args, next) => {

        var cmd = session.message.text.split(/[ ,]+/);

        if (cmd.length > 1) {
            next({ response: cmd[1] });

        } else {
            builder.Prompts.text(session, "Name of VM to start?");
        }
    },
    (session, results) => {
        if (results.response) {
            session.beginDialog('/start', results.response);
        }
    }
]);

intents.matches(/^stop/i, [
    (session, args, next) => {
        var cmd = session.message.text.split(/[ ,]+/);

        if (cmd.length > 1) {
            next({ response: cmd[1] });

        } else {
            builder.Prompts.text(session, "Name of VM to stop?");
        }
    },
    (session, results) => {
        if (results.response) {

            session.beginDialog('/stop', results.response);
        }
    }
]);

intents.matches(/^help/i, [
    (session, args, next) => {
        azbot.help(session);
    }
]);

intents.matches(/^debug/i, [
    (session, args, next) => {
        azbot.debug(session);
    }
]);

intents.matches(/^register/i, [
    (session, args, next) => {
        session.beginDialog('/register');
    }
]);

intents.onDefault([
    (session, args, next) => {

        // intents.matches won't work with long command line. for instance 'sch set start vmname 5:00pm week 2' it returns 0 score
        var cmd = session.message.text.split(/[ ,]+/);

        switch (cmd[0].toLowerCase()) {
            case 'usage':
                azbot.usage(session, args, next);
                break;
            case 'sch':
                azbot.sch(session, args, next);
                break;
            default:
                session.send('Unknown command, please type `help` for available commands');
                session.endDialog();
        }
    }
]);

bot.dialog('/register', [
    function (session, args, next) {
        var registerurl = process.env.BILLINGAPIURL || 'http://localhost:5000';
        session.send("Register URL %s/index.html?uid=%s", registerurl, session.message.user.id);
        session.endDialog();
    }]);

bot.dialog('/list', [
    function (session) {

        var obj = Object.keys(session.userData.list);

        if (obj.length == 0) {
            session.send("No VMs");
            session.endDialog();
        } else {
            var body = "##VM list\n\n";
            for (var i = 0; i < obj.length; i++) {
                body += util.format("* %s\n\n", session.userData.list[obj[i]].name);
            }

            builder.Prompts.choice(session, body + "Want to show VM status?", ["Yes", "No"]);
        }
    },
    function (session, results) {

        if (results.response.entity == "Yes") {
            builder.Prompts.choice(session, "Which VM to show status?", session.userData.list);
        } else {
            session.endDialog();
        }
    },
    function (session, results) {
        if (results.response) {
            session.send("reading vm status...");

            var vm = session.userData.list[results.response.entity];
            var uid = session.message.user.id;

            azapi.getStatus(uid, vm.id, (body) => {
                if (body != null) {
                    session.send("Status: %s, %s", body.statuses[0].displayStatus, body.statuses[1].displayStatus);
                } else {
                    session.send("Something wrong!");
                }
            });


        }

        session.endDialog();
    }
]);

bot.dialog('/status', [
    function (session, result, next) {

        console.log('vm:', result);

        if (session.userData.list == null) {
            next();
        } else {
            var vm = session.userData.list[result];
            var uid = session.message.user.id;
            if (vm !== undefined) {
                azapi.getStatus(uid, vm.id, (body) => {
                    if (body != null) {
                        session.send("Status: %s, %s", body.statuses[0].displayStatus, body.statuses[1].displayStatus);
                    } else {
                        session.send("Something wrong!");
                    }
                });
            }
            else {
                session.send('Cannot find `%s` in Server list', result);
            }

            session.endDialog();
        }
    },
    function (session, reseult, next) {
        session.send('Type `list` first to get list of VMs from Server');
        session.endDialog();
    }
]);

bot.dialog('/start', [
    function (session, result) {
        if (session.userData.list == null) {
            next();
        } else {
            var vm = session.userData.list[result];
            var uid = session.message.user.id;
            if (vm !== undefined) {
                azapi.doStart(uid, vm.id, (body) => {
                    var msg = util.format('%s: %s', vm.name, body);
                    session.send(msg);
                });
            }
            else {
                session.send('Cannot find `%s` in Server list', result);
            }

            session.endDialog();
        }
    },
    function (session, reseult, next) {
        session.send('Type `list` first to get list of VMs from Server');
        session.endDialog();
    }

]);

bot.dialog('/stop', [
    function (session, result) {
        if (session.userData.list == null) {
            next();
        } else {
            var vm = session.userData.list[result];
            var uid = session.message.user.id;
            if (vm !== undefined) {
                azapi.doStop(uid, vm.id, (body) => {
                    var msg = util.format('%s: %s', vm.name, body);
                    session.send(msg);
                });
            }
            else {
                session.send('Cannot find `%s` in Server list', result);
            }

            session.endDialog();
        }
    },
    function (session, reseult, next) {
        session.send('Type `list` first to get list of VMs from Server');
        session.endDialog();
    }
]);

bot.dialog('/usagesum', [
    function (session, results) {

        session.send("Please wait, this will take few seconds...");

        var uid = session.message.user.id;
        azapi.showUsageSummary(uid, (res) => {
            session.send(res);
        });

        session.endDialog();
    }
]);

bot.dialog('/usagedetail', [
    function (session, results) {

        if (results === undefined) {
            builder.Prompts.choice(session, "Select usage display format", ['Meter', 'Date']);
        } else {

            session.send("Please wait, this will take few seconds...");

            var uid = session.message.user.id;
            if (results === 'meter') {

                azapi.showUsagebySku(uid, (res) => {
                    session.send(res);
                });
            } else if (results === 'date') {

                azapi.showUsagebyDate(uid, (res) => {
                    session.send(res);
                });
            } else {
                session.send("Wrong command: " + azbot.cmdusage);
            }

            session.endDialog();
        }
    },
    function (session, results) {
        if (results.response) {

            session.send("Please wait, this will take few seconds...");
            var action = results.response.entity;
            var uid = session.message.user.id;

            if (action === 'Meter') {

                azapi.showUsagebySku(uid, (res) => {
                    session.send(res);
                });
            } else {

                azapi.showUsagebyDate(uid, (res) => {
                    session.send(res);
                });
            }
        }

        session.endDialog();
    }
]);

bot.dialog('/schedule', [
    function (session, args) {

        if (args === undefined) {
            session.send("Wrong command: " + azbot.cmdschset);
        } else {

            var _cmd = args[0];
            var _vmname = args[1];
            var _time = args[2];
            var _rep = args[3];

            var uid = session.message.user.id;
            var date = new Date();

            if (_time < (date.getTime() + 32400000)) { // in case of set time < current time
                _time += 86400000; //add day
            }

            var schedule = {
                id: date.getTime(), uid: uid, time: _time - 32400000,   // KST timezone
                cmd: _cmd, vmname: _vmname,
                vmid: session.userData.list[_vmname].id,
                repeat: _rep
            };

            azstate.globalState.Schedule[date.getTime()] = schedule;
            session.send("Schedule set done");
            //session.send(JSON.stringify(schedule));

            // save to file
            azstate.saveGlobalState();

            session.endDialog();
        }
    }
]);

bot.dialog('/unschedule', [
    function (session, arg) {

        if (arg === undefined) {
            session.send("Wrong command: " + azbot.cmdschunset);
        }
        else {

            if (azstate.globalState.Schedule[arg] === undefined) {
                session.send("Wrong id: " + arg);
            } else {
                delete azstate.globalState.Schedule[arg];

                // save to file
                azstate.saveGlobalState();
                session.send("Schedule removed")
            }
        }

        session.endDialog();
    }
]);

bot.dialog('/showschedule', [
    function (session) {

        var body = "";
        var obj = Object.keys(azstate.globalState.Schedule);    // toArray
        if (obj.length == 0) {
            body += "No schedule set\n\n";
        } else {
            body += "Schdules are:\n\n"
            for (var i = 0; i < obj.length; i++) {
                if (session.message.user.id === azstate.globalState.Schedule[obj[i]].uid) {
                    var runDate = new Date(azstate.globalState.Schedule[obj[i]].time + 32400000);
                    body += util.format("- %s(KST), %s\n\n", runDate.toLocaleString(),
                        JSON.stringify(azstate.globalState.Schedule[obj[i]]));
                }
            }
        }
        session.send(body);
        session.endDialog();
    }
]);

/////////////////////////////////////////////////////////////////////////////////////////////////
// handle register new user
server.post('/api/register/:userid', (req, res, next) => {
    //res.header("Access-Control-Allow-Origin", "*");
    //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    var uid = req.params.userid;
    // save userconfig;
    azstate.setGlobalStateAzSubs(uid, req.body);
    azstate.saveGlobalState();

    res.send(200, 'User register success');

});

server.get('/api/userdata/:userid', (req, res, next) => {
    console.log("/api/userdata");

    var user = azstate.globalState.UserConf[req.params.userid];

    if (user !== undefined) {

        var storageCtx = {
            userId: req.params.userid,
            conversationId: null,
            address: user.address,
            persistUserData: true,
            persistConversationData: false
        };

        bot.getStorageData(storageCtx, function (data) {
            //console.log(JSON.stringify(data));
            res.send(data);
        }, function (err) {
            res.send("No data");
        });
    } else {
        res.send("No user")
    }
});

server.post('/api/message/:userid', (req, res, next) => {
    //res.header("Access-Control-Allow-Origin", "*");
    //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    var uid = req.params.userid;

    if (azstate.globalState.UserConf[uid] !== undefined) {

        var msg = JSON.parse(azstate.globalState.UserConf[uid]._message);
        var date = new Date();
        msg.timestamp = date;
        msg.text = util.format("Hello, %s. Message from service\n\n%s", azstate.globalState.UserConf[uid].address.user.name,
            req.body.message);
        bot.send(msg);

        res.send(200, 'Success');
    } else {
        res.send(500, "Internal Error: Cannot find user");
    }

});