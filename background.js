/*jshint esversion: 6 */

var toPublisher,
    firefoxQuantum = false,
    gettingInfo = browser.runtime.getBrowserInfo();

gettingInfo.then(data => {
  if (parseInt(data.version) > 56) {
    firefoxQuantum = true;
  }
});

function onInstalled(details) {
  if (details.reason === "update" || details.reason === "install") {
    browser.tabs.create({
      url: `http://arlogn.github.io/easyshare/index.html?q=${details.reason}`
    });
  }
}

function onCreated() {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  } else {
    console.log("Item created successfully");
  }
}

function escapeUnderscores(url) {
  return url.replace(/_/g, "\\_");
}

browser.contextMenus.create({
  id: "toPublisher",
  title: browser.i18n.getMessage("contextMenuItemOpenPublisher"),
  contexts: ["selection", "image", "video"]
}, onCreated);

browser.contextMenus.onClicked.addListener((info, tab) => {
  var url = escapeUnderscores(tab.url);
  if (info.hasOwnProperty("mediaType")) {
    if (info.mediaType === "image") {
      toPublisher = `![Image](${info.srcUrl})\n\n**${tab.title}**  \n[${url}](${url})`;
    } else {
      toPublisher = `${info.pageUrl}  \n**${tab.title}**`;
    }
  }
  if (info.hasOwnProperty("selectionText")) {
    browser.tabs.executeScript({
      code: "window.getSelection().toString()"
    }, results => {
      if (toPublisher) {
        toPublisher += `\n\n${results[0]}`;
      } else {
        toPublisher = `**${tab.title}**  \n[${url}](${url})\n\n${results[0]}`;
      }
    });
  }

  if (firefoxQuantum) {
    browser.browserAction.openPopup();
  } else {
    browser.browserAction.setIcon({
      path: "icons/btn_ready.png"
    });
  }

});

browser.runtime.onConnect.addListener(port => {
  if (toPublisher) {
    port.postMessage(toPublisher);
    toPublisher = null;
    if (!firefoxQuantum) {
      browser.browserAction.setIcon({
        path: "icons/btn_default.png"
      });
    }
  }
});

browser.runtime.onInstalled.addListener(onInstalled);
