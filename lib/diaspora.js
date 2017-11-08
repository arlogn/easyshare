/*jshint node: true, esversion: 6 */

"use strict";

const ss = require("sdk/simple-storage");
const { defer } = require('sdk/core/promise');
const request = require("sdk/request").Request;


// Store data to post
function storeData(data) {
    if (data.aspects) {
        let aspects = data.aspects;
        aspects.forEach(function(element) {
            delete element.selected;
        });
        ss.storage.diasporaAspects = aspects;
    }
    else {
        ss.storage.diasporaSession += 1;
    }

    ss.storage.diasporaToken = data.token;
}

// Extract token and aspects from the diaspora code
function extractData(code, aspects) {
    let data = {}, match;

    match = code.match(/<input[^>]* name="authenticity_token"[^>]* value="(.*)"/);

    if (match) {
        data.token = match[1];
    } else {
        data.error = "no token";
    }

    if (aspects) {
        match = code.match(/"aspects":(\[{.*}\]),"services/);
        if (match) {
            data.aspects = JSON.parse(match[1]);
        } else {
            data.error = data.error || "no aspects";
        }
    }

    return data;
}

// Get data to post
function getData(options) {
    let { promise, resolve } = defer();

    let req = request({
        url: options.url,
        onComplete: (response) => {

            let data = extractData(response.text, options.aspects);

            resolve(data);
        }
    });

    req.get();

    return promise;
}

// Sign in
function login(options) {
    let { promise, resolve } = defer();

    let req = request({
        url: options.url,
        content: {
            "user[username]": options.username,
            "user[password]": options.password,
            "user[remember_me]": 1,
            "utf8": "✓",
            "authenticity_token": options.token
        },
        onComplete: (response) => {
            if (response.status === 200) {
                // Try to catch a login error
                if (/<body[^>]*page-sessions[^>]*>/i.test(response.text)) {
                    resolve({error:"login failed"});
                }
                else {
                    let data = extractData(response.text, options.aspects);
                    resolve(data);
                }
            }
            else {
                 resolve(response.status);
            }
        }
    });

    req.post();

    return promise;
}

// Post the status message
function postStatusMessage(data, token, callback) {
    let content = {
        "status_message": { "text": data.message },
        "aspect_ids": data.aspect
    },
    provider = require("sdk/preferences/service").
                      get("extensions.jid1-gqfeTXcouyVkpg@jetpack.providerDisplay");

    if (provider) content.status_message.provider_display_name = "Easyshare";

    let req = request({
        url: data.url  + "/status_messages",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "X-CSRF-Token": token
        },
        // headers: {
        //     "Content-Type": "application/json",
        //     "Accept": "application/json, application/xhtml+xml",
        //     "X-Requested-With": "XMLHttpRequest",
        //     "X-CSRF-Token": token
        // },
        //content: JSON.stringify(content),
        content: content,
        onComplete: (response) => {

            // Try to start a new session if the response status is not 201.
            if (response.status !== 201 && ss.storage.diasporaSession < 2) {
                ss.storage.diasporaToken = null;
                sendRequests(data, callback);
            } else {
                callback(response.status);
            }
        }
    });

    req.post();
}

// Send http requests
function sendRequests(data, callback) {
    let token = ss.storage.diasporaToken, options = {};

    options.aspects = false;

    if (!token) {
        options.url = data.url + "/users/sign_in";

        getData(options).then((response) => {
            if (response.error) {
                callback(response.error);
            }
            else {
                options.username = data.username;
                options.password = data.password;
                options.token = response.token;
                if (data.request === "get_aspects") {
                    options.aspects = true;
                }

                login(options).then((response) => {
                    if (response.error) {
                        callback(response.error);
                    }
                    else {
                        storeData(response);
                        if (response.aspects) {
                            callback("aspects update");
                        }
                        else {
                            postStatusMessage(data, response.token, callback);
                        }
                    }
                });
            }
        });
    }
    else {
        if (!ss.storage.diasporaSession || data.request === "get_aspects") {
            options.url = data.url + "/stream";

            if (data.request === "get_aspects")
                options.aspects = true;

            getData(options).then((response) => {
                // If we get an error here probably means that
                // the csrf token has expired and we have to sign in again.
                if (response.error) {
                    ss.storage.diasporaToken = null;
                    sendRequests(data, callback);
                } else {
                    storeData(response);
                    if (options.aspects)
                        callback("aspects update");
                    else
                        postStatusMessage(data, response.token, callback);
                }
            });
        }
        else {
            postStatusMessage(data, token, callback);
        }
    }
}

exports.sendRequests = sendRequests;
