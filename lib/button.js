"use strict";

const ui = require("sdk/ui");
const tabs = require("sdk/tabs");

function init(pnl) {
  let button = ui.ActionButton({
    id: "easyshare",
    label: "Easyshare",
    icon: "./button.png",
    onClick: function () {
      let d = {
	    thumb: "<img id=\"thumb\" class=\"thumb-placeholder\" src=\"placeholder.png\">",
	    title: tabs.activeTab.title,
	    url: tabs.activeTab.url,
	    text: "",
	    tags: ""
      }
      pnl.show();
	  pnl.port.emit("show", d);
    }
  });

  return button;
}

exports.init = init;