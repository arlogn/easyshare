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

            // if logged-in get the aspects list
            if (data.logged) {
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

        let json = {
            "status_message": { "text": data.message },
            "aspect_ids": aspectId
        };

        let provider = require("sdk/preferences/service").
                          get("extensions.jid1-gqfeTXcouyVkpg@jetpack.providerDisplay");

        if (provider) json.status_message.provider_display_name = "Easyshare";

        let req = request({
            url: data.url  + "/status_messages",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-CSRF-Token": token
            },
            content: JSON.stringify(json),
            onComplete: (response) => {

                // Try re-logging in the case of 401 caused by the token expiration
                if (response.status === 401 && ss.storage.diasporaLogin === 0) {
                    ss.storage.diasporaToken = null;
                    postMessage(data, callback);
                } else {
                    if (ss.storage.diasporaLogin === 1) ss.storage.diasporaLogin = 0;
                    callback(response.status);
                }
            }
        });

        req.post();
    }
}

// Post a status message
function postMessage(data, callback) {
    let stream_token = ss.storage.diasporaToken;
    let user_aspects = ss.storage.diasporaAspects;

    if (!stream_token || !user_aspects) {
        let opt = { url: data.url + "/users/sign_in",
                    logged: false };

        getToken(opt).then((signin_token) => {
            if (!signin_token) {
                callback("no token");
            }
            else {
                login(data, signin_token).then((resp_status) => {
                    if (resp_status !== 200) {
                        callback(resp_status);
                    }
                    else {
                        opt.url = data.url + "/stream";
                        opt.logged = true;

                        getToken(opt).then((stream_data) => {
                            stream_token = stream_data[0];
                            user_aspects = stream_data[1];
                            // Since we cannot catch the 302 Found from the login response
                            // we have to check the user-aspects object here to determine
                            // whether the login has been successful.
                            if (Object.keys(user_aspects).length === 0) {
                                callback("login failed");
                            }
                            else {
                                ss.storage.diasporaToken = stream_token;
                                ss.storage.diasporaAspects = user_aspects;
                                ss.storage.diasporaLogin = 1;

                                postStatusMessage(data, stream_token, callback);
                            }
                        });
                    }
                });
            }
        });
    }
    else {
        postStatusMessage(data, stream_token, callback);
    }
}

exports.postMessage = postMessage;
