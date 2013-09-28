const data = require('sdk/self').data;
const contextMenu = require('sdk/context-menu');
const prefsModule = require('sdk/simple-prefs');
const tabs = require('sdk/tabs');
const _ = require("sdk/l10n").get;

var panel = require('sdk/panel').Panel({
  width: 620,
  height: 400,
  contentURL: data.url('easyshare.html'),
  contentScriptFile: data.url('easyshare.js'),
  contentScriptOptions: {warning: _('warning_nourl')}
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
    contentURL: data.url('widget.html'),
    contentScriptFile: data.url('widget.js'),
    contentScriptOptions: {warning: _('warning_nourl')}
  });
  
  widget = require('sdk/widget').Widget({
    id: 'e-share',
    label: 'Easyshare',
    tooltip: _('widget_tooltip'), 
    contentURL: data.url('icons/widget.png'),
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
    label: _('ctx_menu_shareimage'),
    image: data.url('icons/ctxmenu.png'),
    data: 'image',
    context: contextMenu.SelectorContext('img'),
    contentScriptFile: data.url('data.js'),
    onMessage: function (message) {
      showPanel(message);
    }
  });
  contextMenu.Item({
    label: _('ctx_menu_sharevideo'),
    image: data.url('icons/ctxmenu.png'),
    data: 'video',
    context: [contextMenu.PageContext(),
              contextMenu.URLContext(/^\b(https?):\/\/www\.youtube\.com\/watch\?.*/)],
    contentScriptFile: data.url('data.js'),
    onMessage: function (message) {
      showPanel(message);
    }
  });
  contextMenu.Item({
    label: _('ctx_menu_shareselection'),
    image: data.url('icons/ctxmenu.png'),
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
  let activated = prefsModule.prefs['pref_widget'];
  switch (e) {
    case 'onLoad':
      prefsModule.on('', function () { handlePreferences('onChange') });
      if (activated) {
        showWidget();
      }
      break;
    case 'onChange':
      if (!widgetDestroyed) {
        if (!widget && activated) {
          showWidget();
        } else if (widget && !activated) {
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
