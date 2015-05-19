"use strict";

const { data } = require("sdk/self");
const cm = require("sdk/context-menu");
const tabs = require("sdk/tabs");
const sp = require("sdk/simple-prefs");
const _ = require("sdk/l10n").get;
const { setTimeout } = require("sdk/timers");
const { shorten } = require("./bitlyOAuth");
const publisher = require("./dialog");

const CM_ITEM_ICON = data.url("cmenu.png");
const CM_ITEM_SCRIPT = data.url("data.js");

var wscreen = wscreen || {};


const panel = require("sdk/panel").Panel({
    width: 720,
    height: 500,
    contentURL: data.url("panel.html"),
    contentScriptFile: data.url("panel.js"),
    contentScriptWhen: "ready"
});


const button = require("sdk/ui").ActionButton({
    id: "easyshare_button",
    label: "Easyshare",
    icon: data.url("button.png"),
    onClick: () => {
        let data = {
            thumb: "<img id=\"thumb\" class=\"thumb-placeholder\" src=\"placeholder.png\">",
            title: tabs.activeTab.title,
            url: tabs.activeTab.url,
            text: ""
        };

        panelShow(data);
    }
});


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


/* Show the panel and pass received data to it when the user
   clicks the toolbar button or one of the context menu items */
function panelShow(data) {
    panel.show();
    panel.port.emit("show", data);
}


/* Open a dialog window and load the Diaspora publisher to share 
   the received post */
function onPublishMessage(data) {
    let podURL = sp.prefs.podUrl,
        URL = podURL + "/bookmarklet?",
        re = new RegExp("^" + URL);

    // Iterate through tabs to check if is already open
    for (let tab of tabs) {
        if (re.test(tab.url)) {
           tab.window.close(); // If it matches, close it
           break;
        }
    }

    if (!podURL) { // show a warning if the url of pod was not saved in prefs
        require("./alert").alert(_("warningTitle"), _("warningPodUrlEmpty"));
    } 
    else {
        let params = "content=" + data.post + "&v=1&noui=1",
            width = sp.prefs.publisherWidth,
            height = sp.prefs.publisherHeight,
            left = (wscreen.width -  width) /2,
            top = (wscreen.height - height) /2;

        URL += params;

        /* Note:
           the contentScript attached to the dialog includes a temporary css fix for the
           textarea element to avoid the overflow when the inserted content exceeds its size.
           It can be removed when the issue is fixed in the diaspora codebase. */

        publisher.open({
            name: "diasporav1",
            title: "Easyshare - diaspora* publisher",
            url: URL,
            features: {
                toolbar: false,
                resizable: false,
                scrollbars: false,
                width: width,
                height: height,
                left: left,
                top: top
            },
            contentScript: "var sbm=document.getElementById('submit'); sbm && " +
                           "sbm.addEventListener('click',function(){" +
                           "self.port.emit('datasent')}); var ptw=" +
                           "document.getElementById('publisher_textarea_wrapper');" +
                           "ptw && (ptw.style.overflow='hidden');"
        }).then(worker => {
            worker.port.on("datasent", () => {
              // when the data are sent close the window after 2 seconds
              setTimeout(() => worker.tab.close(), 2000);
            });
        });
    }
}


/* Call the function to shorten the URL and pass the return value to the panel */
function onShortenMessage(lURL) {
    let token = sp.prefs.bitlyAccessToken;

    if (!token) { // show a warning if the addon is not authorized
        require("./alert").alert(_("warningTitle"), _("warningUnauthorized"));
    } 
    else {
        let promise = shorten(lURL, token);

        promise.then((value) => {
            panel.port.emit("shortUrl", value);
        });
    }
}


/* Listen to message emitted by panel to shorten a url */
panel.port.on("shorten", onShortenMessage);

/* Listen to message emitted by panel to publish a post */
panel.port.on("publish", onPublishMessage);

/* Listen to clicks on button to start the OAuth authentication flow */
sp.on("bitlyOAuth", () => require("./bitlyOAuth").authorize());


exports.main = function(options) {

    // Store the screen size (required to center the publisher window)
    let window = require('sdk/window/utils').getMostRecentBrowserWindow();
    wscreen.width = window.screen.width;
    wscreen.height = window.screen.height;

    // Open an information page after install and a changelog notice after upgrades
    if (options.loadReason === "install" || options.loadReason === "upgrade") {
        tabs.open("http://arlogn.github.io/easyshare/index.html?q=" + options.loadReason);
    }

};


exports.onUnload = function(reason) {
    
    if ("disable" === reason) {
        panel.destroy();
        for (let i in items) {
            items[i].destroy();
        }
    }

};
