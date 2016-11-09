"use strict";

const {Cc,Ci} = require("chrome");

function open(xul) {
	let ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
                    .getService(Ci.nsIWindowWatcher);

    ww.openWindow(null, xul, "_blank", "chrome,centerscreen,dialog=yes,modal=yes,titlebar=yes", null);
}

exports.open = open;
