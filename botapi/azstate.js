//
// azstate
//

var util = require('util');
var fs = require('fs');

var azstate = {

    globalState: {UserConf: {}, Schedule: {}},

    lastRuntime: 0,

    filepath: (process.env.HOME || process.env.HOMEDRIVE) + "\\site\\azmanbotglobal.json",

    getGlobalState: () => {

        fs.exists(azstate.filepath, (exists) => {
            if (exists) {
                fs.readFile(azstate.filepath, (err, data) => {
                    if (err) throw err;
                    console.log("read from", azstate.filepath);
                    azstate.globalState = JSON.parse(data);
                });
            }
        });
    },

    getUserConf: (uid) => { return azstate.globalState.UserConf[uid]; }, 
    getSchedule: (uid) => { return azstate.globalState.Schedule; }, 

    saveGlobalState: () => {

        var body = JSON.stringify(azstate.globalState, null, 4);

        fs.writeFile(azstate.filepath, body, function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("The file saved at", azstate.filepath);
            }
        });
    },

    setGlobalState: (message) => {

        var uid = message.user.id;
        if (azstate.globalState.UserConf[uid] === undefined || azstate.globalState.UserConf[uid].address === undefined) {
            azstate.globalState.UserConf[uid] = { id: uid, address: message.address, _message: JSON.stringify(message) };
        }
    },

    setGlobalStateVMList: (uid, vmlist) => {

        if (azstate.globalState.UserConf[uid] === undefined) {
            throw "No Userid State Error";
        }

        azstate.globalState.UserConf[uid].vmlist = vmlist;
    },

    setGlobalStateAzSubs: (uid, azure) => {

        if (azstate.globalState.UserConf[uid] === undefined) {
            throw "No Userid State Error";
        }

        azstate.globalState.UserConf[uid].azure = azure;
    },

    setGlobalStateToken: (uid, token, exp) => {

        if (azstate.globalState.UserConf[uid] === undefined) {
            throw "No Userid State Error";
        }

        azstate.globalState.UserConf[uid].token = { access_token: token, expire: exp };
    }

}

module.exports = azstate;

function clone(obj) {
    var cpy = {};
    if (obj) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                cpy[key] = obj[key];
            }
        }
    }
    return cpy;
}
exports.clone = clone;