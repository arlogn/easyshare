/*
  Diaspora* Easyshare
  Copyright (C) 2013 arlogn
  Licensed under the GNU General Public License, version 3 (GPL-3.0):
  http://opensource.org/licenses/GPL-3.0
*/

(function (doc) {
    var preferences = {},
        youtube = {};

    /*
     *
     * Populate the panel and youtube global object
     * @params {Object} data
     *
     */
    function init(data) {
        var range = doc.createRange(),
            fragment = range.createContextualFragment(data.thumb),
            wrapper = doc.getElementById("wrapper"),
            thumb = doc.getElementById("thumb");

        if (!thumb) {
            wrapper.appendChild(fragment);
        } else {
            wrapper.replaceChild(fragment, thumb);
        }

        doc.getElementById("title").value = data.title;
        doc.getElementById("url").value = data.url;
        doc.getElementById("text").value = data.text;
        doc.getElementById("tags").value = "";

        youtube = {
            video: data.video,
            url: data.vurl
        }

        doc.getElementById("undo").style.display = "none";
    }

    /*
     *
     * Bitly url shortener
     *
     */
    function shortenLongUrl() {
        var login = preferences.bitlyLogin || "diasporaeasyshare",
            apikey = preferences.bitlyApikey || "R_5ab4e2e8e9ad46c746079a9933596bec",
            url = doc.getElementById("url"),
            longurl = url.value,
            apicall = "http://api.bitly.com/v3/shorten?apiKey=" + apikey +
                "&login=" + login +
                "&longUrl=" + encodeURIComponent(longurl) +
                "&format=json",
            xhr = new XMLHttpRequest();

        xhr.open("GET", apicall, true);

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var jsonObj = JSON.parse(xhr.responseText);
                    if (jsonObj.status_txt == "OK") {
                        url.value = jsonObj.data.url;
                    } else {
                        url.value = "(" + jsonObj.status_code + ") " + jsonObj.status_txt;
                        setTimeout(function() {
                            url.value = longurl;
                        }, 2000);
                    }
                } else {
                    url.value = "Error " + xhr.status;
                    setTimeout(function() {
                        url.value = longurl;
                    }, 2000);
                }
            }
        };

        xhr.send(null);
    }

    /*
     *
     * Format post body with some html tags
     * @params {String} tagname
     *
     */
    function formatText(tagname) {
        var t = doc.getElementById("text"),
            text = t.value,
            sel = text.substring(t.selectionStart, t.selectionEnd);

        if (tagname) {
            if (text.length > 0 && !/^\s+$/.test(text)) {
                if (sel.length > 0) {
                    t.value = text.replace(sel, "<" + tagname + ">" + sel + "</" + tagname + ">");
                } else {
                    if (!/^<\w+>[\w\W]+<\/\w+>$/.test(text))
                        t.value = "<" + tagname + ">" + text + "</" + tagname + ">";
                }
                doc.getElementById("undo").style.display = "inline";
            }
        } else {
            t.value = t.value.replace(/(<\/?)(\w+)(>)/ig, "");
            doc.getElementById("undo").style.display = "none";
        }
    }

    /*
     *
     * Create the post content
     * @returns {String}
     *
     */
    function createPostContent() {
        var title = doc.getElementById("title").value,
            text = doc.getElementById("text").value,
            tags = doc.getElementById("tags").value,
            url = doc.getElementById("url").value,
            thumb = doc.getElementById("thumb"),
            content = "";

        if (title.length > 0 && /^\s+$/.test(title)) {
            title = "";
        }
        if (text.length > 0) {
            text = text.replace(/\n/g, "<br>");
        }
        if (tags.length > 0) {
            tags = tags.replace(/\s+/g, "")
                       .replace(/^([\w\W]+)$/g, "#$1")
                       .replace(/,/g, " #")
                       .replace(/##/g, "#");
        }

        if (youtube.video) {
            if (title) {
                content += "**" + title + "**";
            }
            if (text) {
                content += "<br>" + text;
            }
            if (tags) {
                content += "<p>" + tags;
            }
            content += "<p> " + youtube.url;
        } else {
            if (thumb.className != "thumb-placeholder") {
                content += "[![Image](" + thumb.getAttribute("src") +
                    ")](" + url + ")<br>";
            }
            if (title) {
                content += "**" + title + "**";
            }
            if (title && url) {
                content += "<br>";
            }
            if (url) {
                content += "[" + url + "](" + url + ")";
            }
            if ((title || url) && text) {
                content += "<p>";
            }
            if (text) {
                content += text;
            }
            if (tags) {
                content += "<p>" + tags;
            }
        }

        return encodeURIComponent(content);
    }

    /*
     *
     * Send the post content to the Diaspora publisher
     *
     */
    function sendToPublisher() {
        if (preferences.podUrl == "") {
            self.port.emit("warning");
        } else {
            var url = preferences.podUrl + "/bookmarklet?content=" + createPostContent(),
                width = preferences.publisherWidth,
                height = preferences.publisherHeight,
                left = (screen.width/2)-(width/2),
                top = (screen.height/2)-(height/2);

            if (!window.open(url + "&v=1&noui=1&jump=doclose", "diasporav1",
                "location=yes,links=no,scrollbars=no,toolbar=no,width=" + width +
                ",height=" + height + ",top=" + top + ",left=" + left)) {
                window.location.href = url + "jump=yes";
            }
        }
    }

    self.port.on("show", function(data) {
        init(data);
    });

    self.port.on("prefs", function(prefs) {
        preferences = prefs;
    });

    doc.getElementById("actionside").addEventListener("click", function(event) {
        switch (event.target.id) {
            case "send":
                sendToPublisher();
                break;
            case "shorturl":
                shortenLongUrl();
                break;
            case "blockquote":
                formatText("blockquote");
                break;
            case "strong":
                formatText("strong");
                break;
            case "emphasis":
                formatText("em");
                break;
            case "undo":
                formatText();
                break;
            default:
                return false;
        }
        event.preventDefault();
    }, false);

})(document);