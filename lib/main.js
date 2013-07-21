var data = require('self').data,
    contextMenu = require('context-menu'),
    prefsModule = require('simple-prefs');

var panel = require('panel').Panel({
  width: 620,
  height: 400,
  contentURL: data.url('panel.html'),
  contentScriptFile: data.url('panel.js'),
});
  
var shareMenuItem = contextMenu.Item({
  label: 'Share on Diaspora*',
  image: data.url('diaspora.png'),
  context: contextMenu.SelectorContext('img'),
  contentScriptFile: data.url('getdata.js'),
  onMessage: function handleMessage(message) {
    panel.show();
    panel.port.emit('show', message);
  }
});

var shareVideoMenuItem = contextMenu.Item({
  label: 'Share video on Diaspora*',
  image: data.url('diaspora.png'),
  context: [contextMenu.PageContext(),
            contextMenu.URLContext('http://www.youtube.com/watch?*')],
  contentScriptFile: data.url('getdata.js'),
  onMessage: function handleMessage(message) {
    panel.show();
    panel.port.emit('show', message);
  }
});
  
var onPrefChange = function () {
  panel.port.emit('prefs', prefsModule.prefs);
}

exports.main = function (options, callbacks) {
  panel.port.emit('prefs', prefsModule.prefs);
  prefsModule.on('', onPrefChange);
  if (options.loadReason == 'install' || options.loadReason == 'upgrade') {
    var tabs = require("tabs");
    tabs.open("http://arlogn.github.io/easyshare/index.html?q=" + options.loadReason);
    console.log('Easyshare: ' + options.loadReason);
  }
};
