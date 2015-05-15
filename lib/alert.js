"use strict";

const { data } = require("sdk/self");
const { Cc, Ci } = require("chrome");

function alert(title, msg) {
    let image = data.url("warning.png");

    let win = Cc['@mozilla.org/embedcomp/window-watcher;1'].
                      getService(Ci.nsIWindowWatcher).
                      openWindow(null, 'chrome://global/content/alerts/alert.xul',
                                  '_blank', 'chrome,titlebar=no,popup=yes,centerscreen', null);

    win.arguments = [image, title, msg, false, ''];
}

exports.alert = alert;