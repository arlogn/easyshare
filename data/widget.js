/*
 *  Widget - Quickly send text-only posts
 * 
 */

var send = function (prefs) {
  if (prefs.pref_podurl == "" || prefs.pref_podurl == null) {
    var w = self.options.warning.replace(/\\n/g, '\n');
    return alert(w);
  }
  var title  = document.getElementById('title').value,
      text   = document.getElementById('text').value,
      url    = document.getElementById('url').value,
      tags   = document.getElementById('tags').value,
      params = { title: "?title=", url: "" };
        
  if (title.length > 0) params.title += "**" + encodeURIComponent(title) + "**";    
  
  if (url.length > 0) {
    url = encodeURIComponent(url);
    params.title += "<br>[" + url + "](" + url + ")<br>";
  }
  
  if (text.length > 0) {
    text = text.replace(/\n/g, '<br>');
    params.title += "<br>" + encodeURIComponent(text);
  }
  if (tags.length > 0) {
    tags = tags.replace(/\s+/g, '') 	 
               .replace(/^(.+)$/g, '#$1')
               .replace(/,/g, ' #')
               .replace(/##/g, '#');
    params.title += "<br><br>" + encodeURIComponent(tags); 
  }                  
  prefs && prefs.pref_adveasyshare ?
            params.url += "<br><sub>&url=[via Easyshare](http://j.mp/XmyxIA)</sub><br><br>" :
            params.url += "&url=<br><br>";
  var URL = prefs.pref_podurl + "/bookmarklet" + params.title + "" + params.url;

  if (!window.open(URL + "&v=1&noui=1&jump=doclose", "diasporav1",
    "location=yes,links=no,scrollbars=no,toolbar=no,width=600,height=" +
    prefs.pref_publisherheight.toString()))
    location.href = URL + "jump=yes";
};

var init = function () {
  self.port.on('show', function (d) {
    document.getElementById('title').value = d.title;
    document.getElementById('url').value = d.url;
    document.getElementById('text').value = "";
    document.getElementById('tags').value = "";
  });
  var prefs = {};
  self.port.on('prefs', function (p) {
    prefs = p;
  });
  document.getElementById('send').addEventListener('click', function () { 
    send(prefs); 
  }, false);
};

window.addEventListener('load', init, false);
