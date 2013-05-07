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

  $: function (id) {
  		
    return document.getElementById(id);
  		
  },
  
  /* 
    Populate the panel  
  */
  populate: function (data) {
    
    var range = document.createRange(),
        documentFragment = range.createContextualFragment(data.node),
        thumb = this.$('thumb');
        
    if (!thumb)
      this.$('thumbwrap').appendChild(documentFragment);
    else
      this.$('thumbwrap').replaceChild(documentFragment, thumb);
    
    this.$('title').value = data.title;
    this.$('url').value = data.url;
    this.$('text').value = data.sel;
    this.$('tags').value = '';
    
  },

  /* 
    Short URL via bit.ly api
  */
  shortify: function () {
    
    var LOGIN = this.prefs.bitlyLogin || "diasporaeasyshare";
    var APIKEY = this.prefs.bitlyApikey || "R_5ab4e2e8e9ad46c746079a9933596bec";
    
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
    Send to Diaspora via publisher bookmarklet
  */
  send: function () {
    
    var docURL = encodeURIComponent(this.$('url').value),
        image = "[![Image](" + encodeURIComponent(this.$('thumb')
          .getAttribute('src')) + ")](" + docURL + ")",
        title = this.$('title').value,
        text = this.$('text').value,
        tags = this.$('tags').value;

    /* shows a warning and exit if pod URL was not saved */
    if (this.prefs.podURL == "") {
      var w = "WARNING!\nYou have not entered the URL of your Diaspora* pod.\n" +
              "Go to Firefox > Addons > Extensions > Diaspora* Easyshare > Options\n" +
              "and enter the URL (e.g. https://awesomepod.com).";
      return alert(w);
    }

    var URL = this.prefs.podURL + "/bookmarklet?title=" + image +
              "<br> **" + encodeURIComponent(title) + "** <br>[" +
              docURL + "](" + docURL + ")";

    if (text.length > 0) URL += "<br><br>" + encodeURIComponent(text);

    if (tags.length > 0) {
      /* Allows to enter hashtags with or without hash sign and spaces between them */
      /* Maybe there is a better way to do this */
      tags = tags.replace(/\s+/g, '').replace(/^(.+)$/g, '#$1')
                 .replace(/,/g, ' #').replace(/##/g, '#');
      URL += "<br><br>" + encodeURIComponent(tags);
    }

    if (this.prefs.viaEasyshare)
      URL += "<br><sub>&url=[via Easyshare](http://j.mp/XmyxIA)</sub><br><br>";
    else
      URL += "<br><sub>&url=</sub>";

    if (!window.open(URL + "&v=1&noui=1&jump=doclose", "diasporav1",
      "location=yes,links=no,scrollbars=no,toolbar=no,width=600,height=" +
      this.prefs.publisherHeight.toString()))
      location.href = URL + "jump=yes";
      
  },
  
  /* 
    Initializes 
  */
  init: function () {
    
    self.port.on('show', function (data) {
      easyshare.populate(data);
    });
    
    self.port.on('prefs', function (prefs) {
      easyshare.prefs = prefs;
    });
    
    this.$('send').addEventListener('click', function () { easyshare.send() }, false);
    this.$('shortify').addEventListener("click", function (e) {
      easyshare.shortify();
      e.preventDefault();
    }, false);
    
  }
  
};

window.addEventListener('load', function () { easyshare.init() }, false);

