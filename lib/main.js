"use strict";

const { data } = require("sdk/self");
const cm = require("sdk/context-menu");
const tabs = require("sdk/tabs");
const sp = require("sdk/simple-prefs");
const _ = require("sdk/l10n").get;

const CM_ITEM_ICON = data.url("cmenu.png");
const CM_ITEM_SCRIPT = data.url("data.js");


const panel = require("sdk/panel").Panel({
    width: 720,
    height: 500,
    contentURL: data.url("panel.html"),
    contentScriptFile: data.url("panel.js"),
    contentScriptWhen: "ready",
    onShow: () => {
        let msg = {
	          podUrl: prefs.podUrl,
		        publisherWidth: prefs.publisherWidth,
	          publisherHeight: prefs.publisherHeight,
	          bitlyLogin: prefs.bitlyLogin,
	          bitlyApikey: prefs.bitlyApikey
        };

        this.port.emit("prefs", msg);
    }
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


panel.port.on("warning", function () {
    const _ = require("sdk/l10n").get;
    require("sdk/notifications").notify({
        text: _("warning").replace(/\\n/g, "\n"),
        iconURL: data.url("warning.png")
    });
    panel.hide();
});


exports.main = function(options) {

    // Open an information page after install and a changelog notice after upgrades
    if (options.loadReason === "install" || options.loadReason === "upgrade") {
        tabs.open("http://arlogn.github.io/easyshare/index.html?q=" + options.loadReason);
    }

};
