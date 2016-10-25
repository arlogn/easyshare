"use strict";

const { data } = require("sdk/self");
const cm = require("sdk/context-menu");
const sp = require("sdk/simple-prefs");
const _ = require("sdk/l10n").get;

const CM_ITEM_ICON = data.url("cmenu.png");
const CM_ITEM_SCRIPT = data.url("data.js");


/* Create the main panel */
const panel = require("sdk/panel").Panel({
    width: 720,
    height: 500,
    contentURL: data.url("panel.html"),
    contentScriptFile: data.url("panel.js"),
    contentScriptWhen: "ready"
});


/* Create the toolbar button */
const button = require("sdk/ui/button/action").ActionButton({
    id: "easyshare_button",
    label: "Easyshare",
    icon: {
        "16": data.url("button.png"),
        "32": data.url("button32.png")
    },
    onClick: () => {
        let tab = require("sdk/tabs").activeTab;
        let data = {
            thumb: "<img id=\"thumb\" class=\"thumb-placeholder\" src=\"placeholder.png\">",
            title: tab.title,
            url: tab.url,
            text: ""
        };

        panelShow(data);
    }
});


/* Create the context-menu items */
var items = [

    cm.Item({
        label: _("cmenuShareImage"),
        image: CM_ITEM_ICON,
        data: "image",
        context: cm.SelectorContext("img"),
        contentScriptFile: CM_ITEM_SCRIPT,
        onMessage: panelShow
    }),

    cm.Item({
        label: _("cmenuShareVideo"),
        image: CM_ITEM_ICON,
        data: "video",
        context: [cm.PageContext(),
            cm.URLContext(/^\b(https?):\/\/www\.youtube\.com\/watch\?.*/)
        ],
        contentScriptFile: CM_ITEM_SCRIPT,
        onMessage: panelShow
    }),

    cm.Item({
        label: _("cmenuShareSelection"),
        image: CM_ITEM_ICON,
        data: "selection",
        context: cm.SelectionContext(),
        contentScriptFile: CM_ITEM_SCRIPT,
        onMessage: panelShow
    })

];


/* Show the panel and pass data to it */
function panelShow(data) {
    panel.show();
    panel.port.emit("show", data);
}


/* Send the post to diaspora */
function onPostMessage(data) {
    let show = require("lib/alert");

    require("sdk/passwords").search({
        realm: "Pod credentials for Easyshare",
        onComplete: (credentials) => {
            credentials.forEach((credential) => {
                if (Object.keys(credential).length > 0) {
                    data.username = credential.username;
                    data.password = credential.password;
                }
            });
            data.url = sp.prefs.podUrl;

            if (!data.url || !data.username || !data.password) {
                show.alert(_("warningTitle"), _("warningRequiredPrefsEmpty"), 1);
            } else {
                panel.port.emit("wait", _("panelButtonSendWait"), "sending");

                require("lib/diaspora").post(data, (response) => {
                    switch(response) {
                        case 201:
                            show.alert(_("successTitle"), _("successPostSent"), 0);
                            break;
                        case 0:
                            show.alert(_("warningTitle"), _("warningUnknownAspect"), 1);
                            break;
                        case -1:
                            show.alert(_("warningTitle"), _("warningNoUserAspects"), 1);
                            break;
                        default:
                            show.alert(_("warningTitle"), _("warningPostNotSent", response), 1);
                    }

                    panel.port.emit("wait", _("panelButtonSend"), "default");
                    require("sdk/timers").setTimeout(() => panel.hide(), 2000);
                });
            }
        }
    });
}


/* Shorten the long URL and pass returned value to the panel */
function onShortenMessage(lURL) {
    let token = sp.prefs.bitlyOAuthAccessToken;

    if (!token) { // show a warning if the addon is not authorized
        require("lib/alert").alert(_("warningTitle"), _("warningUnauthorized"), 1);
    } else {
        let promise = require("lib/bitlyOAuth").shorten(lURL, token);

        promise.then((value) => {
            panel.port.emit("shortUrl", value);
        });
    }
}


/* Listen to messages */

/* to shorten a long url */
panel.port.on("shorten", onShortenMessage);
/* to send the post */
panel.port.on("post", onPostMessage);
/* to start the OAuth authentication flow */
sp.on("bitlyOAuth", () => require("lib/bitlyOAuth").authorize());
/* to open the credentials dialog */
sp.on("podCredentials", () => require("lib/dialog").open("chrome://d_easyshare/content/credentials.xul"));


exports.main = function(options) {

    // Open an information page after install or a changes list after upgrades
    if (options.loadReason === "install" || options.loadReason === "upgrade") {
        require("sdk/tabs").open("http://arlogn.github.io/easyshare/index.html?q=" + options.loadReason);
    }

};


exports.onUnload = function(reason) {

    // free up resources when disabled
    if ("disable" === reason) {
        panel.destroy();
        for (let i in items) {
            items[i].destroy();
        }
    }

};
