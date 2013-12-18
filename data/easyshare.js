/*
  Diaspora* Easyshare
  Copyright (C) 2013 arlo gn

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  he Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var easyshare = {
  prefs: {},
  youtube: {},

  $: function (id) {
    return document.getElementById(id);
  },
  
  /* 
    Populate the panel
  */
  populate: function (data) {
    var range = document.createRange(),
        documentFragment = range.createContextualFragment(data.thumb),
        thumb = this.$('thumb');
        
    if (!thumb)
      this.$('wrapper').appendChild(documentFragment);
    else
      this.$('wrapper').replaceChild(documentFragment, thumb);
    
    this.$('title').value = data.title;
    this.$('url').value = data.url;
    this.$('text').value = data.text;
    this.$('tags').value = '';
    this.youtube = { video: data.video, videoUrl: data.videoUrl };
  },

  /* 
    Shorten URL via bit.ly api
  */
  shorten: function () {
    var LOGIN = this.prefs.pref_bitlylogin || "diasporaeasyshare";
    var APIKEY = this.prefs.pref_bitlyapikey || "R_5ab4e2e8e9ad46c746079a9933596bec";
    
    var url = this.$('url'),
        longURL = url.value,
        bitlyURL = "http://api.bitly.com/v3/shorten?apiKey=" + APIKEY +
                   "&login=" + LOGIN +
                   "&longUrl=" + encodeURIComponent(longURL) + 
                   "&format=json";

    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var jsObj = JSON.parse(xhr.responseText);
          if (jsObj.status_txt == "OK") {
            url.value = jsObj.data.url;
          } else {
            url.value = "(" + jsObj.status_code + ") " + jsObj.status_txt;
            setTimeout(function () {
              url.value = longURL;
            }, 2000);
          }
        } else {
          url.value = "ERROR " + xhr.status;
          setTimeout(function () {
            url.value = longURL;
          }, 2000);
        }
      }
    }

    xhr.open('GET', bitlyURL, true);
    xhr.send(null);
  },
  
  /*
    Formatting entered text with html.
  */
  html: function (tagname) {
    var t = this.$('text'),
        v = t.value,
        s = t.value.substring(t.selectionStart, t.selectionEnd);
    
    if (v.length > 0 && !/^\s+$/.test(v)) {
      if (s.length > 0) {
        t.value = v.replace(s, '<' + tagname + '>' + s + '</' + tagname + '>');
      } else {
        if (!/^<\w+>.+<\/\w+>$/.test(v))
          t.value = '<' + tagname + '>' + v + '</' + tagname + '>';
      }
      this.$('undo').style.display = "block";
    }
  },
  
  /*
    Undo text formatting 
  */
  undo: function () {
    var t = this.$('text'),
        v = t.value;
        
    t.value = v.replace(/(<\/?)(\w+)(>)/ig, '');
    this.$('undo').style.display = "none";
  },
  
  /*
    Params (@title,@url) to share images as image/title/text/tags
                                  or text-only as title/text/tags
  */
  _params: function (title, text, tags) {
    var thumb = this.$('thumb'),
        url = encodeURIComponent(this.$('url').value),
        params = { title: "?title=", url: "" };
    
    if (thumb.className != "easyshare-placeholder")
            params.title += "[![Image](" + encodeURIComponent(thumb.getAttribute('src')) + 
                            ")](" + url + ")<br>";
    if (title) params.title += "**" + encodeURIComponent(title) + "**";
    if (title && url)  params.title += "<br>";
    if (url) params.title += "[" + url + "](" + url + ")"; 
    if ((title || url) && text) params.title += "<br>";
    if (text) params.title += "<br>" + encodeURIComponent(text);
    if (tags) params.title += "<br><br>" + encodeURIComponent(tags); 
                
    this.prefs && this.prefs.pref_adveasyshare ?
             params.url += "<br><sub>&url=[via Easyshare](http://j.mp/XmyxIA)</sub><br><br>" :
             params.url += "&url=";
  	 
    return params;
  },
  
  /*
    Params (@title,@url) to share youtube videos as title/text/tags/video
  */
  _vparams: function (title, text, tags) {
    var params = { title: "?title=", url: "&url=" };
    if (title) params.title += "**" + encodeURIComponent(title) + "**";
    if (text) params.title += "<br>" + encodeURIComponent(text);
    if (tags) params.title += "<br><br>" + encodeURIComponent(tags);
    this.prefs && this.prefs.pref_adveasyshare ?
            params.title += "<br><sub>[via Easyshare](http://j.mp/XmyxIA)</sub><br><br>" :
            params.title += "<br><br>";
    params.url += this.youtube.videoUrl;
   	         
    return params;
  },

  /* 
    Send to Diaspora via the publisher bookmarklet
  */
  send: function () {
    if (this.prefs.pref_podurl == "") {
      var w = self.options.warning.replace(/\\n/g, '\n');
      return alert(w);
    }
    
    var title  = this.$('title').value,
        text   = this.$('text').value,
        tags   = this.$('tags').value,
        params = {}; 
    
    if (title.length > 0 && /^\s+$/.test(title)) title = null;
    
    if (text.length > 0) text = text.replace(/\n/g, '<br>');
    
    if (tags.length > 0) tags = tags.replace(/\s+/g, '') 	 
                                    .replace(/^(.+)$/g, '#$1')
                                    .replace(/,/g, ' #')
                                    .replace(/##/g, '#');
  	     
    this.youtube && this.youtube.video ? params = this._vparams(title, text, tags) :
                                         params = this._params(title, text, tags);                        
    
    var URL = this.prefs.pref_podurl + "/bookmarklet" + params.title + "" + params.url;

    if (!window.open(URL + "&v=1&noui=1&jump=doclose", "diasporav1",
      "location=yes,links=no,scrollbars=no,toolbar=no,width=600,height=" +
      this.prefs.pref_publisherheight.toString()))
      location.href = URL + "jump=yes";
  },
  
  /* 
    Initialize
  */
  init: function () {
    self.port.on('show', function (data) {
      easyshare.populate(data);
      document.getElementById('undo').style.display = "none";
    });
    
    self.port.on('prefs', function (prefs) {
      easyshare.prefs = prefs;
    });
    
    this.$('send').addEventListener('click', function () { easyshare.send() }, false);
    this.$('shorturl').addEventListener('click', function (e) {
      easyshare.shorten();
      e.preventDefault();
    }, false);
    this.$('quotation').addEventListener('click', function (e) {
      easyshare.html('blockquote');
      e.preventDefault();
    }, false);
    this.$('important').addEventListener('click', function (e) {
      easyshare.html('strong');
      e.preventDefault();
    }, false);
    this.$('emphasis').addEventListener('click', function (e) {
      easyshare.html('em');
      e.preventDefault();
    }, false);
    this.$('undo').addEventListener('click', function (e) {
      easyshare.undo();
      e.preventDefault();
    }, false);
  }
};

window.addEventListener('load', function () { easyshare.init() }, false);
