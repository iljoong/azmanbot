var request = require('request');
var util = require('util');

var azstate = require('./azstate');

var billingurl = process.env.BILLINGAPIURL || 'http://localhost:5000';

var azapi = {

    _requestAPI: function (token, vmid, verb, cmd, func) {
        var urlpath = cmd ? 'https://management.azure.com' + vmid + '/' + cmd + '?api-version=2015-05-01-preview' : vmid;

        var config = {
            uri: urlpath,
            method: verb,
            json: true,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json;charset=utf-8'
            }
        };

        request(config, function (err, resp, body) {
            if (err) {
                console.log(err);
            }
            else {
                //console.log(body); 
                if (resp.statusCode == 200 || resp.statusCode == 202) {
                    func(resp, body);
                }
                else
                    func(resp, null);
            }
        });
    },

    getToken: function (uid, func) {

        var g = azstate.globalState.UserConf[uid];

        var config = {
            uri: 'https://login.microsoftonline.com/' + g.azure.tenant_id + '/oauth2/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            form: {
                grant_type: 'client_credentials',
                resource: 'https://management.core.windows.net/',
                client_id: g.azure.client_id,
                client_secret: g.azure.client_secret
            }
        };

        request(config, function (err, resp, body) {
            if (err) {
                console.log(err);
            }
            else {

                var json = JSON.parse(body);
                var date = new Date();
                azstate.setGlobalStateToken(uid, json.access_token, date.getTime() + 3600000);

                func(json.access_token);
            }

        });
    },

    requestAPI: function (uid, vmid, verb, cmd, func) {

        var g = azstate.globalState.UserConf[uid];

        // check token expire
        var date = new Date();
        var exp = (g.token === undefined) ? -1 : (g.token.expire - date.getTime());

        if (exp < 0) {
            azapi.getToken(uid, function (token) {
                azapi._requestAPI(token, vmid, verb, cmd, func);
            });
        } else {
            azapi._requestAPI(g.token.access_token, vmid, verb, cmd, func);
        }
    },

    getList: (uid, func) => {

        var g = azstate.globalState.UserConf[uid];

        var listapi = 'https://management.azure.com/subscriptions/' + g.azure.subscription
            + '/providers/Microsoft.Compute/virtualmachines?api-version=2016-03-30';

        azapi.requestAPI(uid, listapi, 'GET', null, function (res, body) {

            func(body);
        });
    },

    getStatus: function (uid, vmid, cb) {

        azapi.requestAPI(uid, vmid, 'GET', 'InstanceView', function (res, body) {
            cb(body);
        });
    },

    doStart: function (uid, vmid, cb) {

        azapi.requestAPI(uid, vmid, 'POST', 'start', function (res, body) {
            if (res.statusCode == 200 || res.statusCode == 202) {
                cb('VM start requested');
            } else {
                cb("Something wrong!");
            }
        });
    },

    doStop: function (uid, vmid, cb) {

        azapi.requestAPI(uid, vmid, 'POST', 'deallocate', function (res, body) {
            if (res.statusCode == 200 || res.statusCode == 202) {
                cb('VM stop requested');
            } else {
                cb("Something wrong!");
            }
        });
    },

    /////////////////////////////////////////////////////////

    checkTokenAndRun: function (uid, cb) {
        var g = azstate.globalState.UserConf[uid];

        // check token expire
        var date = new Date();
        var exp = (g.token === undefined) ? -1 : (g.token.expire - date.getTime());

        if (exp < 0) {
            azapi.getToken(uid, function (token) {
                cb();
            });
        } else {
            cb();
        }
    },

    showUsageSummary: function (uid, cb) {

        var g = azstate.globalState.UserConf[uid];

        azapi.checkTokenAndRun(uid, () => {

            azapi._billingAPI(g, 'sku', function (json) {
                if (json.error === undefined) {

                    var response = util.format("Total usage: %d", json.total.toFixed(0));

                    cb(response);
                } else {
                    cb(json.detail);
                }
            });
        });

    },

    showUsagebySku: function (uid, cb) {

        var g = azstate.globalState.UserConf[uid];

        azapi.checkTokenAndRun(uid, () => {

            azapi._billingAPI(g, 'sku', function (json) {
                if (json.error === undefined) {
                    var response = {
                        "attachments": [
                            {
                                "contentType": "application/vnd.microsoft.card.receipt",
                                "content": {
                                    "title": "Usage by Meter Name(Sku)",
                                    "items": []
                                }
                            }
                        ]
                    };

                    response.attachments[0].content.items = json.values;
                    response.attachments[0].content.total = json.total.toFixed(0);

                    cb(response);
                } else {
                    cb(json.detail);
                }
            });
        });
    },

    showUsagebyDate: function (uid, cb) {

        var g = azstate.globalState.UserConf[uid];

        azapi.checkTokenAndRun(uid, () => {

            azapi._billingAPI(g, 'date', function (json) {

                if (json.error === undefined) {
                    var response = {
                        "attachments": [
                            {
                                "contentType": "application/vnd.microsoft.card.receipt",
                                "content": {
                                    "title": "Usage by Date",
                                    "items": []
                                }
                            }
                        ]
                    };

                    response.attachments[0].content.items = json.values;
                    response.attachments[0].content.total = json.total.toFixed(0);

                    cb(response);
                } else {
                    cb(json.detail);
                }
            });
        });
    },

    _billingAPI: function (g, cmd, func) {

        var config = {
            uri: billingurl + "/api/usage/" + cmd,
            method: 'GET',
            json: true,
            headers: {
                'Token': g.token.access_token,
                'Subscription': g.azure.subscription
            }
        };

        request(config, function (err, resp, body) {
            if (err) {
                console.log(err);
            }
            else {
                func(body);
            }
        });
    },


};

module.exports = azapi;