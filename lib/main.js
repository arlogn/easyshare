const data = require('sdk/self').data;
const contextMenu = require('sdk/context-menu');
const prefsModule = require('sdk/simple-prefs');
const tabs = require('sdk/tabs');

var panel = require('sdk/panel').Panel({
  width: 620,
  height: 400,
  contentURL: data.url('easyshare.html'),
  contentScriptFile: data.url('easyshare.js'),
});

var showPanel = function (data) {
  panel.show();
  panel.port.emit('show', data);  
};

var widget = null, widgetDestroyed = false;

var showWidget = function () {
  let wpanel = require('sdk/panel').Panel({
    width: 300,
    height: 300,
    contentURL: data.url('fastpost.html'),
    contentScriptFile: data.url('fastpost.js')
  });
  
  widget = require('sdk/widget').Widget({
    id: 'e-share',
    label: 'Easyshare',
    tooltip: 'Easyshare - Fast Post', 
    contentURL: data.url('icons/icon.png'),
    panel: wpanel,
    onClick: function () {
      let d = {
        title: tabs.activeTab.title,
        url: tabs.activeTab.url
      }
      this.panel.port.emit('show', d);
    },
    onAttach: function () {
      this.panel.port.emit('prefs', prefsModule.prefs);
    }
  });
};

var removeWidget = function () {
  if (widget) {
    widget.destroy();
    widgetDestroyed = true;
    widget = null;
  }
};

var contextMenuSetItems = function () {
  contextMenu.Item({
    label: 'Share image on Diaspora*',
    image: data.url('icons/icon.png'),
    data: 'image',
    context: contextMenu.SelectorContext('img'),
    contentScriptFile: data.url('data.js'),
    onMessage: function (message) {
      showPanel(message);
    }
  });
  contextMenu.Item({
    label: 'Share video on Diaspora*',
    image: data.url('icons/icon.png'),
    data: 'video',
    context: [contextMenu.PageContext(),
              contextMenu.URLContext(/^\b(https?):\/\/www\.youtube\.com\/watch\?.*/)],
    contentScriptFile: data.url('data.js'),
    onMessage: function (message) {
      showPanel(message);
    }
  });
  contextMenu.Item({
    label: 'Share selection on Diaspora*',
    image: data.url('icons/icon.png'),
    data: 'selection',
    context: contextMenu.SelectionContext(),
    contentScriptFile: data.url('data.js'),
    onMessage: function (message) {
      showPanel(message);
    }
  });
};

var handlePreferences = function (e) {
  panel.port.emit('prefs', prefsModule.prefs);
  let checked = prefsModule.prefs['showWidget'];
  switch (e) {
    case 'onLoad':
      prefsModule.on('', function () { handlePreferences('onChange') });
      if (checked) {
        showWidget();
      }
      break;
    case 'onChange':
      if (!widgetDestroyed) {
        if (!widget && checked) {
          showWidget();
        } else if (widget && !checked) {
          removeWidget();
        } else {
          widget.panel.port.emit('prefs', prefsModule.prefs);
        }
      }
      break;
  }
};

exports.main = function (options, callbacks) {
  handlePreferences('onLoad');
  contextMenuSetItems();
  if (options.loadReason == 'install' || options.loadReason == 'upgrade') {
    tabs.open('http://arlogn.github.io/easyshare/index.html?q=' + options.loadReason);
    console.log('Easyshare: ' + options.loadReason);
  }
};
