"use strict";

const request = require("sdk/request").Request;

let userAspects = {};


function getCookies(host) {
    const {Cc, Ci} = require("chrome");

    let cookieManager = Cc["@mozilla.org/cookiemanager;1"]
                             .getService(Ci.nsICookieManager2);

    return cookieManager.getCookiesFromHost(host);
}

function getAspectId(aspectName) {
    for (let a in userAspects) {
        if (userAspects[a].name === aspectName) {
            return userAspects[a].id;
        }
    }

    return 0;
}

function getToken(data, callback) {
    let req = request({
        url: data.url,
        onComplete: (response) => {

            let csrf_token = null, user_aspects = null;

            let match = response.text.match(/<input[^>]* name="authenticity_token"[^>]* value="(.*)"/);

            if (match) csrf_token = match[1];

            // if logged-in also get the aspects list
            if (data.logged) {
                match = response.text.match(/"aspects":(\[{.*}\]),"services/);

                if (match) user_aspects = JSON.parse(match[1]);

                callback(csrf_token, user_aspects);
            }
            else {
                callback(csrf_token);
            }
        }
    });

    req.get();
}

function login(data, callback) {
    let obj = { url: data.url + "/users/sign_in",
                logged: false };

    getToken(obj, (token) => {
        if (!token) {
            callback(null, null);
        }
        else {
            let req = request({
                url: obj.url,
                content: {
                    "user[username]": data.username,
                    "user[password]": data.password,
                    "user[remember_me]": 1,
                    "utf8": "✓",
                    "authenticity_token": token
                },
                onComplete: (response) => {

                    callback(response.status, token);
                }
            });

            req.post();
        }
    });
}

function postStatusMessage(data, token, callback) {
    let aspectId, aspectsLength = Object.keys(userAspects).length;


    if (data.aspect === "public" || data.aspect === "all_aspects") {
        aspectId = data.aspect;
    }
    else {
        aspectId = getAspectId(data.aspect);
    }

    if (aspectId === 0) {
        if (aspectsLength > 0) callback("unknown_aspect");
        else callback("no_aspects");
    }
    else {

        let statusMessage = { "text": data.message };

        let provider = require("sdk/preferences/service").
                          get("extensions.jid1-gqfeTXcouyVkpg@jetpack.providerDisplay");

        if (provider) statusMessage.provider_display_name = "Easyshare";

        let cookie = getCookies(data.url);

        let req = request({
            url: data.url  + "/status_messages",
            headers: {
                "contentType": "application/json",
                "accept": "application/json",
                "cookie": cookie,
                "x-csrf-token": token
            },
            content: {
                "status_message": statusMessage,
                "aspect_ids": aspectId
            },
            onComplete: (response) => {

                callback(response.status);
            }
        });

        req.post();
    }
}

// Log in to the pod and post a status message.
// If already logged in only post a status message using the stored token.
function postMessage(data, callback) {
    let aspectsLength = Object.keys(userAspects).length;

    let token = require("sdk/preferences/service").
                   get("extensions.jid1-gqfeTXcouyVkpg@jetpack.diasporaAuthenticationToken");

    if (!token || aspectsLength === 0) {
        login(data, (response, csrf_token) => {
            if (response !== 200 || !csrf_token) {
                callback("login_error");
            }
            else {
                let obj = { url: data.url + "/stream",
                            logged: true };
                getToken(obj, (csrf_token, aspects) => {
                    require("sdk/preferences/service").
                        set("extensions.jid1-gqfeTXcouyVkpg@jetpack.diasporaAuthenticationToken", csrf_token);
                        userAspects = aspects;
                        postStatusMessage(data, csrf_token, callback);
                });
            }
        });
    }
    else {
        postStatusMessage(data, token, callback);
    }
}

exports.postMessage = postMessage;
