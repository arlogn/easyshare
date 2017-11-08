/*jshint node: true, esversion: 6 */

"use strict";

const { defer } = require('sdk/core/promise');
const request = require("sdk/request").Request;
const tabs = require("sdk/tabs");

const CLIENT_ID = "8d4d19ba6f6287bd528d7c351eb8d272f87f0afc";
const REDIRECT_URI = "http://arlogn.github.io/easyshare/";


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
            }
            else {
                resolve(rt.status_txt);
            }
        }
    });

    req.get();

    return promise;
}

exports.shorten = shorten;



/*** Bitly OAuth authorization flow ***/

function authorize() {
    let bitlyOAuthURL = "https://bit.ly/oauth/authorize?",
        params = "client_id=" + CLIENT_ID + "&redirect_uri=" + encodeURIComponent(REDIRECT_URI);

    tabs.open({
        url: bitlyOAuthURL + params,
        onReady: (tab) => {
            // When the addon is authorized and the tab loads the REDIRECT_URI with
            // the verification code as parameter, the page displays a message about
            // the authorization.
            if (tab.url.indexOf(REDIRECT_URI + "?code=") === 0) {
                tab.attach({
                    contentScript: "var c=document.getElementById('callback');" +
                                   "var t=document.createTextNode('Bitly OAuth: " +
                                   "addon authorized, please wait to receive your access token... ');" +
                                   "c.appendChild(t);"
                });

                // Extract the verification code from URL
                let vcode = tab.url.substring(40);

                // Call the API endpoint passing the code
                getAccessToken(vcode);
            }

            // When the token is received and the tab reloads the REDIRECT_URI with
            // the success confirmation as parameter, the page displays a
            // successfull message.
            if (tab.url.indexOf(REDIRECT_URI + "?success=true") === 0) {
                tab.attach({
                    contentScript: "var c=document.getElementById('callback');" +
                                   "var t=document.createTextNode('Bitly OAuth: SUCCESS! Your access token has been saved. " +
                                   "Now you can shorten long URLs with Bitly.');" +
                                   "c.appendChild(t);"
                });
            }
        }
    });
}

function getAccessToken(vcode) {
    const ss = require("sdk/simple-storage");

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
                // If it matches, the token is stored
                ss.storage.bitlyAccessToken = match[1];

                // and the tab reloads the REDIRECT_URI with a success confirmation as parameter
                tabs.activeTab.url = REDIRECT_URI + "?success=true";
            }
            else {
                // else, if something went wrong, outputs an error message to the web console
                let rt = JSON.parse(response.text);
                console.error("Error " + rt.status_code + " - " + rt.status_txt);

                // and the page displays a message of failure.
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
