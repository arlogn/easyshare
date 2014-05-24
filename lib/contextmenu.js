"use strict";

const { data } = require("sdk/self");
const cmenu = require("sdk/context-menu");
const _ = require("sdk/l10n").get;

const IMAGE = data.url("cmenu.png");
const SCRIPT = data.url("data.js");

function showPanel(panel, data) {
  panel.show();
  panel.port.emit("show", data);
}

function init(pnl) {
  cmenu.Item({
    label: _("cmenuShareImage"),
    image: IMAGE,
    data: "image",
    context: cmenu.SelectorContext("img"),
    contentScriptFile: SCRIPT,
    onMessage: function(d) {
      showPanel(pnl, d);
    }
  });

  cmenu.Item({
    label: _("cmenuShareVideo"),
    image: IMAGE,
    data: "video",
    context: [cmenu.PageContext(),
              cmenu.URLContext(/^\b(https?):\/\/www\.youtube\.com\/watch\?.*/)
    ],
    contentScriptFile: SCRIPT,
    onMessage: function(d) {
      showPanel(pnl, d);
    }
  });

  cmenu.Item({
    label: _("cmenuShareSelection"),
    image: IMAGE,
    data: "selection",
    context: cmenu.SelectionContext(),
    contentScriptFile: SCRIPT,
    onMessage: function(d) {
      showPanel(pnl, d);
    }
  });
}

exports.init = init;