"use strict";

const panel = require("./panel");
const cmenu = require("./contextmenu");
const { Cc, Ci } = require("chrome");
const appInfo = Cc["@mozilla.org/xre/app-info;1"]
                .getService(Ci.nsIXULAppInfo);

exports.main = function(options) {

  let pnl = panel.init();

  if (parseInt(appInfo.version.split(".")[0]) >= 29) {
    // New SDK Australis UI action button
    const button = require("./button");
    button.init(pnl);
  } else {
    // Widget for Firefox <29
    const widget = require("./widget");
    widget.init(pnl);
  }

  cmenu.init(pnl);

  if (options.loadReason === "install" || options.loadReason === "upgrade") {
    require("sdk/tabs").open("http://arlogn.github.io/easyshare/index.html?q=" + options.loadReason);
  }
};