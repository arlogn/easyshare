"use strict";

const ss = require("sdk/simple-storage");
const { defer } = require('sdk/core/promise');
const request = require("sdk/request").Request;


function getAspectId(aspectName) {
    let user_aspects = ss.storage.diasporaAspects;

    for (let a in user_aspects) {
        if (user_aspects[a].name === aspectName) {
            return user_aspects[a].id;
        }
    }

    return 0;
}

function getToken(data) {
    let { promise, resolve } = defer();

    let req = request({
        url: data.url,
        onComplete: (response) => {

            let csrf_token = null, user_aspects = {};

            let match = response.text.match(/<input[^>]* name="authenticity_token"[^>]* value="(.*)"/);

            if (match) csrf_token = match[1];

            if (data.getAspects) {
                match = response.text.match(/"aspects":(\[{.*}\]),"services/);

                if (match) user_aspects = JSON.parse(match[1]);

                resolve([csrf_token, user_aspects]);
            }
            else {
                resolve(csrf_token);
            }
        }
    });

    req.get();

    return promise;
}

function login(data, token) {
    let { promise, resolve } = defer();

    let req = request({
        url: data.url + "/users/sign_in",
        content: {
            "user[username]": data.username,
            "user[password]": data.password,
            "user[remember_me]": 1,
            "utf8": "✓",
            "authenticity_token": token
        },
        onComplete: (response) => {

            resolve(response.status);
        }
    });

    req.post();

    return promise;
}

function storeSessionData(stream_data) {
    ss.storage.diasporaToken = stream_data[0];
    ss.storage.diasporaAspects = stream_data[1];
    ss.storage.diasporaSession = true;
}

function postStatusMessage(data, token, callback) {
    let aspectId;

    if (data.aspect === "public" || data.aspect === "all_aspects") {
        aspectId = data.aspect;
    }
    else {
        aspectId = getAspectId(data.aspect);
    }

    if (aspectId === 0) {
        callback("unknown aspect");
    }
    else {

        let provider = require("sdk/preferences/service").
                          get("extensions.jid1-gqfeTXcouyVkpg@jetpack.providerDisplay");

        if (provider) json.status_message.provider_display_name = "Easyshare";

        let req = request({
            url: data.url  + "/status_messages",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "X-CSRF-Token": token
            },
            content: {"status_message[text]": data.message, "aspect_ids": aspectId},
            onComplete: (response) => {

                // Try to start a new session if the response is Unauthorized.
                if (response.status === 401 && ss.storage.diasporaLogin < 2) {
                    ss.storage.diasporaToken = null;
                    post(data, callback);
                } else {
                    callback(response.status);
                }
            }
        });

        req.post();
    }
}

// Post a status message
function post(data, callback) {
    let token = ss.storage.diasporaToken,
        opt = {};

    if (!token) {
        opt.url = data.url + "/users/sign_in";
        opt.getAspects = false;

        // Get the token to signin
        getToken(opt).then((signin_token) => {
            if (!signin_token) {
                callback("no token");
            }
            else {
                // Sign in to start a new diaspora session
                login(data, signin_token).then((resp_status) => {
                    if (resp_status !== 200) {
                        callback(resp_status);
                    }
                    else {
                        opt.url = data.url + "/stream";
                        opt.getAspects = true;
                        // Get the csrf token and the user aspects json
                        getToken(opt).then((stream_data) => {
                            // Since we cannot catch the 302 Found from the login response
                            // we have to check the user aspects object here to determine
                            // whether the login has been successful.
                            if (Object.keys(stream_data[1]).length === 0) {
                                ss.storage.diasporaToken = null;
                                callback("login failed");
                            }
                            else {
                                // Updates the counter to allow you start a new session at most twice
                                ss.storage.diasporaLogin += 1;

                                // Store data and post the status message
                                storeSessionData(stream_data);
                                postStatusMessage(data, stream_data[0], callback);
                            }
                        });
                    }
                });
            }
        });
    }
    else {
        // Get token and aspects at start of every resumed session
        if (!ss.storage.diasporaSession) {
            opt.url = data.url + "/stream";
            opt.getAspects = true;

            getToken(opt).then((stream_data) => {
                // If the aspects were not found it probably means that
                // the token has expired and a new session is to be started.
                if (Object.keys(stream_data[1]).length === 0) {
                    ss.storage.diasporaToken = null;
                    post(data, callback);
                } else {
                    // Store data and post the status message
                    storeSessionData(stream_data);
                    postStatusMessage(data, stream_data[0], callback);
                }
            });
        }
        else {
            // Post the status message using the stored token
            postStatusMessage(data, token, callback);
        }
    }
}

exports.post = post;
