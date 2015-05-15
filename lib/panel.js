"use strict";

const { data } = require("sdk/self");
const panel = require("sdk/panel");
const { prefs } = require("sdk/simple-prefs");

function init() {
  let pnl = panel.Panel({
    width: 720,
    height: 500,
    contentURL: data.url("panel.html"),
    contentScriptFile: data.url("panel.js"),
    contentScriptWhen: "ready",
    onShow: function () {
      let p = {
	    podUrl: prefs.podUrl,
		publisherWidth: prefs.publisherWidth,
	    publisherHeight: prefs.publisherHeight,
	    bitlyLogin: prefs.bitlyLogin,
	    bitlyApikey: prefs.bitlyApikey
      };

      this.port.emit("prefs", p);
    }
  });

  pnl.port.on("warning", function () {
    const _ = require("sdk/l10n").get;
    require("sdk/notifications").notify({
      text: _("warning").replace(/\\n/g, "\n"),
      iconURL: data.url("warning.png")
    });
    pnl.hide();
  });

  return pnl;
}

exports.init = init;
