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
const button = require("sdk/ui").ActionButton({
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
let items = [

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


/* Show the panel and pass received data to it.
   Called when user clicks the toolbar button or a context menu item */
function panelShow(data) {
    panel.show();
    panel.port.emit("show", data);
}


/* Send the post to diaspora */
function onPostMessage(data) {
    let show = require("./alert");

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

                require("./diaspora").post(data, (response) => {
                    switch(response) {
                        case 201:
                            show.alert(_("successTitle"), _("successPostSent"), 0);
                            break;
                        case 0:
                            show.alert(_("warningTitle"), _("warningUnknownAspect"), 1);
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


/* Show the dialog to enter/save the pod credentials */
function onCredentialsMessage() {
    require("./dialog").open({
        name: "credentials",
        title: _("credsDialogTitle"),
        url: data.url("credentials.html"),
        features: {
            dialog: true,
            width: 352,
            height: 262
        },
        contentScriptFile: data.url("credentials.js")
    }).then(worker => {
        require("sdk/passwords").search({
            realm: "Pod credentials for Easyshare",
            onComplete: (credentials) => {
                credentials.forEach((credential) => {
                    if (Object.keys(credential).length > 0) {
                        worker.port.emit("show", credential);
                    }
                });
            }
        });
        worker.port.on("save", (credential) => {
            require("sdk/passwords").search({
                realm: "Pod credentials for Easyshare",
                onComplete: (credentials) => {
                    credentials.forEach(require("sdk/passwords").remove);
                    require("sdk/passwords").store({
                        realm: "Pod credentials for Easyshare",
                        username: credential.username,
                        password: credential.password
                    });
                }
            });

            worker.tab.close();
        });
        worker.port.on("close", () => {
            worker.tab.close();
        });
    });
}


/* Call the function to shorten the longURL and pass the return value to the panel */
function onShortenMessage(lURL) {
    let token = sp.prefs.bitlyOAuthAccessToken;

    if (!token) { // show a warning if the addon is not authorized
        require("./alert").alert(_("warningTitle"), _("warningUnauthorized"), 1);
    } else {
        let promise = require("./bitlyOAuth").shorten(lURL, token);

        promise.then((value) => {
            panel.port.emit("shortUrl", value);
        });
    }
}


/* Listen to message emitted by panel to shorten a url */
panel.port.on("shorten", onShortenMessage);

/* Listen to message emitted by panel to publish a post */
panel.port.on("post", onPostMessage);

/* Listen to clicks on button in the preferences to start the OAuth authentication flow */
sp.on("bitlyOAuth", () => require("./bitlyOAuth").authorize());

/* Listen to clicks on button in the preferences to enter the pod credentials */
sp.on("podCredentials", onCredentialsMessage);


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
