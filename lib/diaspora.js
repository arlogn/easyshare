/*
 * diaspora* authentication, fetch some user data and post a status message.
 * Inspired to the unofficial diaspora* api:
 *    diaspy (https://github.com/marekjm/diaspy)
 *    node-diaspora (https://github.com/rainbowintheshell/node-diaspora)
 */

"use strict";

const request = require("sdk/request").Request;

const MAX_ATTEMPTS = 3;

let attempts = 0;
let userAspects = userAspects || {};


/* Return the aspect ID or 0 if name doesn't match */
function getAspectId(aspectName) {
    for (var a in userAspects) {
        if (userAspects[a].name == aspectName) {
            return userAspects[a].id;
        }
    }

    return 0;
}


/* Get user aspects {name:id} */
function getAspects(url, callback) {
    let req = request({
        url: url  + "/bookmarklet",
        onComplete: (response) => {
            let match = response.text.match(/gon.user=({.*});gon.preloads/);
            if (match) {
                callback(JSON.parse(match[1])['aspects']);
            } else {
                callback(userAspects);
            }
        }
    });

    req.get();
}


/* Get authentication token */
function getToken(url, callback) {
    let req = request({
        url: url  + "/users/sign_in",
        onComplete: (response) => {
            let match = response.text.match(/<input[^>]* name="authenticity_token"[^>]* value="(.*)"/);
            let token = match[1] || "";
            require("sdk/preferences/service").set("extensions.jid1-gqfeTXcouyVkpg@jetpack.diasporaAuthenticationToken", token);
            callback(token);
        }
    });

    req.get();
}


/* Sign in to the pod */
function login(data, callback) {
    getToken(data.url, (token) => {
        let req = request({
            url: data.url  + "/users/sign_in",
            content: {
                "user[username]": data.username,
                "user[password]": data.password,
                "user[remember_me]": 1,
                "utf8": "✓",
                "authenticity_token": token
            },
            onComplete: (response) => {
                getAspects(data.url, (aspects) => {
                    userAspects = aspects;
                    post(data, callback);
                });
            }
        });

        req.post();
    });

}


/* Post status message to diaspora* session */
function post(data, callback) {
    let token = require("sdk/preferences/service").get("extensions.jid1-gqfeTXcouyVkpg@jetpack.diasporaAuthenticationToken");
    let aspectId;

    if (data.aspect == "public" || data.aspect == "all_aspects") {
        aspectId = data.aspect;
    } else {
        aspectId = getAspectId(data.aspect);
    }

    if (Object.keys(userAspects).length > 0 && aspectId === 0) {
        callback(aspectId);
    } else {
        let statusMessage = { "text": data.post };
        let pd = require("sdk/preferences/service").get("extensions.jid1-gqfeTXcouyVkpg@jetpack.providerDisplay");

        if (pd) statusMessage.provider_display_name = "Easyshare";

        let req = request({
            url: data.url  + "/status_messages",
            headers: {
                "contentType": "application/json",
                "accept": "application/json",
                "x-csrf-token": token
            },
            content: {
                "status_message": statusMessage,
                "aspect_ids": aspectId
            },
            onComplete: (response) => {
                // log response headers:
                // for (var headerName in response.headers) {
                //     console.log(headerName + " : " + response.headers[headerName]);
                // }

                if (response.status != "201" && attempts < MAX_ATTEMPTS) {
                    login(data, callback);
                    attempts += 1;
                } else {
                    attempts = 0;
                    callback(response.status);
                }
            }
        });

        req.post();

    }
}

exports.post = post;
