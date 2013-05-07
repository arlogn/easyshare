var data = require('self').data,
    contextMenu = require('context-menu'),
    prefsModule = require('simple-prefs');

/* New panel */
var panel = require('panel').Panel({
  width: 620,
  height: 400,
  contentURL: data.url('panel.html'),
  contentScriptFile: data.url('panel.js'),
});
  
/* New context menu item */
var menuItem = contextMenu.Item({
  label: 'Share on Diaspora*',
  image: data.url('diaspora.png'),
  context: contextMenu.SelectorContext('img'),
  contentScriptFile: data.url('getdata.js'),
  onMessage: function handleMessage(message) {
    panel.show();
    panel.port.emit('show', message);
  }
});
  
var onPrefChange = function () {
  panel.port.emit('prefs', prefsModule.prefs);
}

prefsModule.on('', onPrefChange);

exports.main = function (options, callbacks) {
  panel.port.emit('prefs', prefsModule.prefs);
  if (options.loadReason == 'install' || options.loadReason == 'upgrade') {
    var tabs = require("tabs");
    tabs.open("http://arlogn.github.io/easyshare/index.html?q=" + options.loadReason);
    console.log('Easyshare: ' + options.loadReason);
  }
};
