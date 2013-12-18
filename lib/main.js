const data = require('sdk/self').data;
const contextMenu = require('sdk/context-menu');
const prefsModule = require('sdk/simple-prefs');
const tabs = require('sdk/tabs');
const _ = require("sdk/l10n").get;

var widget;

var panel = require('sdk/panel').Panel({
  width: 620,
  height: 400,
  contentURL: data.url('easyshare.html'),
  contentScriptFile: data.url('easyshare.js'),
  contentScriptOptions: {warning: _('warning_nourl')},
  onShow: function () {
    if (widget) widget.contentURL = data.url('icons/widget.gif');
  },
  onHide: function () {
    if (widget) widget.contentURL = data.url('icons/widget.png');
  }
});

var showPanel = function (data) {
  panel.show();
  panel.port.emit('show', data); 
};

var showWidget = function () {
  widget = require('sdk/widget').Widget({
    id: 'e-share',
    label: 'Easyshare',
    tooltip: _('widget_tooltip'), 
    contentURL: data.url('icons/widget.png'),
    onClick: function () {
      let d = {
        thumb: '<img id="thumb" class="easyshare-placeholder" src="images/easyshare.png">',
        title: tabs.activeTab.title,
        url: tabs.activeTab.url,
        text: '',
        tags: ''
      }
      showPanel(d);
    }
  });
};

var removeWidget = function () {
  if (widget) {
    widget.destroy();
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
      if (!widget && activated) {
        showWidget();
      } else if (widget && !activated) {
        removeWidget();
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
