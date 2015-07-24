"use strict";

const { defer } = require('sdk/core/promise');
const request = require("sdk/request").Request;
const tabs = require("sdk/tabs");

const CLIENT_ID = "8d4d19ba6f6287bd528d7c351eb8d272f87f0afc";
const REDIRECT_URI = "http://arlogn.github.io/easyshare/";


/* Shorten long URLs */
function shorten (longUrl, token) {
    let { promise, resolve } = defer();

    let bitlyApiURL = "https://api-ssl.bitly.com/v3/shorten?",
        params = "access_token=" + token + "&longUrl=" + encodeURIComponent(longUrl);

    let req = request({
        url: bitlyApiURL + params,
        onComplete: (response) => {
            let rt = JSON.parse(response.text);
            if (rt.status_txt == "OK" ) {
                resolve(rt.data.url);
            } else {
                resolve(rt.status_txt);
            }
        }
    });

    req.get();

    return promise;
}

exports.shorten = shorten;



/* Bitly OAuth web flow. */

/* The user have to authorize Easyshare on his private Bitly account.
 * When authorized, an access token is returned and stored (hidden) in the preferences. */

function authorize() {
    let bitlyOAuthURL = "https://bit.ly/oauth/authorize?",
        params = "client_id=" + CLIENT_ID + "&redirect_uri=" + encodeURIComponent(REDIRECT_URI);

    tabs.open({
        // Open the authorization page
        url: bitlyOAuthURL + params,
        onReady: (tab) => {
            // Upon authorization the tab loads the REDIRECT_URI with the OAuth verification
            // code appended as parameter. A script is attached to display a message waiting.
            if (tab.url.indexOf(REDIRECT_URI + "?code=") == 0) {
                tab.attach({
                    contentScript: "var c=document.getElementById('callback');" +
                                   "var t=document.createTextNode('(Bitly OAuth) " +
                                   "Addon authorized, please wait to receive your access token... ');" +
                                   "c.appendChild(t);"
                });

                // Extract the code from URL
                let vcode = tab.url.substring(40);

                // Call the API endpoint passing the code
                getAccessToken(vcode);
            }

            // If the API endpoint returns the access token, the tab
            // is reloaded with a successfull parameter appended.
            // A script is attached to display the success message.
            if (tab.url.indexOf(REDIRECT_URI + "?success=true") == 0) {
                tab.attach({
                    contentScript: "var c=document.getElementById('callback');" +
                                   "var t=document.createTextNode('(Bitly OAuth) SUCCESS! Your access token has been " +
                                   "saved in the Easyshare preferences. Now you can shorten long URLs with Bitly.');" +
                                   "c.appendChild(t);"
                });
            }
        }
    });
}

function getAccessToken(vcode) {
    let req = request({
        url: "https://api-ssl.bitly.com/oauth/access_token",
        content: {
            client_id: CLIENT_ID,
            client_secret: "ae7681afc40046871292e7dc285a5f175b1b76a8",
            code: vcode,
            redirect_uri: REDIRECT_URI
        },
        onComplete: (response) => {
            // Check if the response text contains the access token
            let match = response.text.match(/access_token=([^&]*)?/);

            if (match) {
                // If it matches, the token is stored in the preferences
                require("sdk/preferences/service").set("extensions.jid1-gqfeTXcouyVkpg@jetpack.bitlyOAuthAccessToken", match[1]);
                // and the tab reloads the REDIRECT_URI with a successfull parameter appended
                tabs.activeTab.url = REDIRECT_URI + "?success=true";
            } else {
                // else if something goes wrong...
                let rt = JSON.parse(response.text);
                console.warn("Error " + rt.status_code + " - " + rt.status_txt);

                // A script is attached to display the message of failure.
                tabs.activeTab.attach({
                    contentScript: "var e=document.getElementById('error');" +
                                   "var t=document.createTextNode('FAILURE! " +
                                   "Sorry, an error occurred while receiving the token.');" +
                                   "e.appendChild(t);"
                });
            }
        }
    });

    req.post();
}

exports.authorize = authorize;
