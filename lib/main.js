"use strict";

const self = require("sdk/self");
const ss = require("sdk/simple-storage");
const contextMenu = require("sdk/context-menu");
const preferences = require("sdk/simple-prefs");
const notifications = require("sdk/notifications");
const _ = require("sdk/l10n").get;
const diaspora = require("lib/diaspora");

const CM_ITEM_ICON = self.data.url("images/cmenu.png");
const CM_ITEM_SCRIPT = self.data.url("scripts/data.js");
const ICON_WARNING = self.data.url("images/warning.png");
const ICON_SUCCESS = self.data.url("images/success.png");
const ICON_ERROR = self.data.url("images/error.png");


const panel = require("sdk/panel").Panel({
    width: 720,
    height: 500,
    contentURL: self.data.url("panel.html"),
    contentScriptFile: self.data.url("scripts/panel.js"),
    contentScriptWhen: "ready"
});


const button = require("sdk/ui/button/action").ActionButton({
    id: "easyshare_button",
    label: "Easyshare",
    icon: {
        "16": self.data.url("images/button.png"),
        "32": self.data.url("images/button32.png")
    },
    onClick: () => {
        let tab = require("sdk/tabs").activeTab;
        let data = {
            image: "images/diaspora.png",
            title: tab.title,
            url: tab.url,
            text: ""
        };

        panelShow(data);
    }
});


let contextMenuItems = [

    contextMenu.Item({
        label: _("cmenuShareImage"),
        image: CM_ITEM_ICON,
        data: "image",
        context: contextMenu.SelectorContext("img"),
        contentScriptFile: CM_ITEM_SCRIPT,
        onMessage: panelShow
    }),

    contextMenu.Item({
        label: _("cmenuShareVideo"),
        image: CM_ITEM_ICON,
        data: "video",
        context: [contextMenu.PageContext(),
            contextMenu.URLContext(/^\b(https?):\/\/www\.youtube\.com\/watch\?.*/)
        ],
        contentScriptFile: CM_ITEM_SCRIPT,
        onMessage: panelShow
    }),

    contextMenu.Item({
        label: _("cmenuShareSelection"),
        image: CM_ITEM_ICON,
        data: "selection",
        context: contextMenu.SelectionContext(),
        contentScriptFile: CM_ITEM_SCRIPT,
        onMessage: panelShow
    })

];


function panelShow(data) {
    panel.port.emit("show", data);
    panel.show();
}


function notify(title, text, icon) {
    notifications.notify({
        title: title,
        text: text,
        iconURL: icon
    });
}


function onPostMessage(data) {
    require("sdk/passwords").search({
        realm: "Pod credentials for Easyshare",
        onComplete: (credentials) => {
            credentials.forEach((credential) => {
                if (Object.keys(credential).length > 0) {
                    data.username = credential.username;
                    data.password = credential.password;
                }
            });

            data.url = preferences.prefs.podUrl;

            if (!data.url || !data.username || !data.password) {
                notify(_("warningTitle"), _("warningRequiredPrefs"), ICON_WARNING);
            }
            else if (!/^https?:\/\//.test(data.url)) {
                    data.url = "https://" + data.url;
                    preferences.prefs.podUrl = data.url;
            }
            else {
                panel.port.emit("wait", _("panelButtonSendWait"), "sending");

                diaspora.post(data, (response) => {
                    switch(response) {
                        case 201:
                            notify(_("successTitle"), _("successPostSent"), ICON_SUCCESS);
                            break;
                        case "no token":
                            notify(_("errorTitle"), _("errorNoToken"), ICON_ERROR);
                            break;
                        case "login failed":
                            notify(_("errorTitle"), _("errorLoginFailed"), ICON_ERROR);
                            break;
                        case "unknown aspect":
                            notify(_("errorTitle"), _("errorUnknownAspect"), ICON_ERROR);
                            break;
                        default:
                            notify(_("errorTitle"), _("errorXhrStatusError", response), ICON_ERROR);
                    }

                    panel.port.emit("wait", _("panelButtonSend"), "default");
                    require("sdk/timers").setTimeout(() => panel.hide(), 2000);
                });
            }
        }
    });
}


function onShortenMessage(longUrl) {
    let token = ss.storage.bitlyAccessToken;

    if (!token) {
        notify(_("warningTitle"), _("warningBitlyUnauthorized"), ICON_WARNING);
    }
    else {
        let promise = require("lib/bitlyOAuth").shorten(longUrl, token);

        promise.then((value) => {
            panel.port.emit("shortUrl", value);
        });
    }
}


panel.port.on("shorten", onShortenMessage);
panel.port.on("post", onPostMessage);
preferences.on("bitlyOAuth", () => require("lib/bitlyOAuth").authorize());
preferences.on("podCredentials", () => require("lib/dialog").
                                  open("chrome://credentials/content/credentials.xul"));


exports.main = function(options) {

    ss.storage.diasporaLogin = 0;
    ss.storage.diasporaSession = false;
    ss.storage.diasporaToken = null;

    if (options.loadReason === "install" || options.loadReason === "upgrade") {
        require("sdk/tabs").
            open("http://arlogn.github.io/easyshare/index.html?q=" + options.loadReason);
    }

};


exports.onUnload = function(reason) {

    panel.destroy();

    for (let i in contextMenuItems) {
        contextMenuItems[i].destroy();
    }

};
