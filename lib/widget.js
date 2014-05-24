"use strict";

const { data } = require("sdk/self");
const tabs = require("sdk/tabs");
const widget = require("sdk/widget");

function init(pnl) {
  let wdg = widget.Widget({
	id: "easyshare",
	label: "Easyshare",
	tooltip: "Easyshare",
	contentURL: data.url("button.png"),
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

  return wdg;
}

exports.init = init;