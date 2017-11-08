/*jshint node: true, browser: true, esversion: 6 */
/*globals self: false*/

"use strict";

// Update the panel content
function onPanelShow(data) {
    var doc = document;

    var thumb = doc.querySelector(".thumb-container > img");

    if (thumb.getAttribute("src") !== data.image) {
        if (data.image === "data URIs") {
            thumb.setAttribute("src", "images/error.png");
            data.text = "Sorry, images embedded as base64 encoded data URI are skipped!";
        }
        else {
            thumb.setAttribute("src", data.image);
        }
    }

    doc.getElementById("sm-title").value = data.title;
    doc.getElementById("sm-url").value = data.url;
    doc.getElementById("sm-text").value = data.text;
    doc.getElementById("sm-tags").value = "";

    setUndoButtonState("disabled");
}

// Set the state of the undo button
function setUndoButtonState(state) {
    var undo = document.getElementById("undo");

    if (state === "enabled" && !undo.classList.contains("enabled"))
        undo.classList.add("enabled");
    else if (state === "disabled" && undo.classList.contains("enabled"))
        undo.classList.remove("enabled");
}

// Simple text formatting.
// Add markdown syntax for text emphasis or quotation
function addMarkdown(option) {
    var smText = document.getElementById("sm-text"),
        text = smText.value,
        sel = text.substring(smText.selectionStart, smText.selectionEnd);

    var isEmpty = function (t) {
        return /^\s*$/.test(t);
    };

    var isSplitted = function (t) {
        return /\n/.test(t);
    };

    var isFormatted = function (t) {
        return /^(?:\*|_|\n\n>[\s\S]*)(.*)(?:\*|_|\n\n)$/.test(t);
    };

    var removeSyntax = function (t) {
        setUndoButtonState("disabled");

        return t.replace(/(_|\*\*)([\s\S]*?)(_|\*\*)/g, "$2").
                 replace(/\n\n>\s([\s\S]*?)\n\n/g, "$1").
                 replace(/>\s([\s\S]*?)/g, "$1");
    };

    var addSyntax = function (s, t) {
        var syntaxFor = {
            "italic": function() {
                return "_" + t + "_";
            },
            "bold": function() {
                return "**" + t + "**";
            },
            "quote": function() {
                t = t.trim().replace(/\n{3,}/g, "\n\n").replace(/^/gm, "> ");
                return "\n\n" + t + "\n\n";
            }
        };

        setUndoButtonState("enabled");

        return syntaxFor[s]();
    };

    if (!isEmpty(text)) {
        if (option) {
            if (!isEmpty(sel)) {
                smText.value = text.replace(new RegExp("([\\s\\S]{" + smText.selectionStart +
                    "})([\\s\\S]{" + (smText.selectionEnd-smText.selectionStart) + "})"), "$1" +
                    addSyntax(option, "$2"));
            }
            else {
                // skip if text is already wrapped by markdown syntax
                if (!isFormatted(text)) {
                    // do not add syntax for italic and bold if text contains newline, to avoid formatting error
                    if (isSplitted(text)) {
                        if (option === "quote") smText.value = addSyntax(option, text);
                    }
                    else {
                        if (option !== "quote") text = text.trim();
                        smText.value = addSyntax(option, text);
                    }
                }
            }
        }
        else {
            smText.value = removeSyntax(smText.value);
        }
    }
}

// Get the panel content and build the status message
function buildStatusMessage() {
    var doc = document;

    var title = doc.getElementById("sm-title").value,
        url   = doc.getElementById("sm-url").value,
        text  = doc.getElementById("sm-text").value,
        tags  = doc.getElementById("sm-tags").value,
        image = doc.querySelector("img[src*=http]"),
        isVideo = /^\b(https?):\/\/www\.youtube\.com\/watch\?.*/.test(url),
        message = [];

    if (title.length > 0 && !/^\s+$/.test(title)) title = "**" + title + "**";

    //sanitize tags
    if (tags.length > 0) tags = tags.replace(/#|\s/g, "")
                                    .replace(/^(.*)/, "#$1")
                                    .split(",").join(" #");

    if (image && !isVideo)
        message.push("[![Image](" + image.src + ")](" + url + ")\n");

    if (title) message.push(title);

    if (url) {
        if (isVideo) message.push(url);
        else message.push("[" + url + "](" + url + ")");
    }

    if (text) message.push("\n" + text);

    if (tags) message.push("\n" + tags);

    return message.join("\n");
}

// Send to main.js
function send(req) {
    var aspect = document.getElementById("aspects").value,
        data = {};

    if (req === "send_post") {
        data.message = buildStatusMessage();
        data.aspect = aspect;
    }

    data.request = req;

    self.port.emit("send", data);
}


// Listening to messages

self.port.on("show", onPanelShow);

self.port.on("shortUrl", function(shortened) {
    var url = document.getElementById("sm-url"),
        longUrl = url.value;

    url.value = shortened;

    // put back the long url if value isn't a short url
    if (!/^http/.test(shortened)) {
        setTimeout(function () {
            url.value = longUrl;
        }, 3000);
    }

});

self.port.on("wait", function(text, options) {
    var button = document.getElementById(options.req);

    button.textContent = text;

    if (options.wait) {
        button.style.pointerEvents = "none";
        button.classList.add("wait");
    }
    else {
        button.style.pointerEvents = "auto";
        button.classList.remove("wait");
    }
});

self.port.on("aspects_update", function(aspects) {
    if (aspects) {
        var selector = document.getElementById("aspects"),
            len = selector.options.length,
            option;

        if (len > 2) {
            for (var i = len-1; i > 1; i--) {
                selector.remove(i);
            }
        }

        aspects.forEach(function(element) {
            option = document.createElement('option');
            option.value = element.id;
            option.text = element.name;
            selector.add(option);
        });
    }
});

// Handling click events

document.getElementById("shorturl").addEventListener("click", function () {
    var url = document.getElementById("sm-url").value;
    self.port.emit("shorten", url);
}, false);

document.querySelector(".sidebar").addEventListener("click", function(event) {
    if (event.target.nodeName === "BUTTON") {
        switch (event.target.id) {
            case "send_post":
            case "get_aspects":
                send(event.target.id);
            break;
            case "quote":
            case "bold":
            case "italic":
                addMarkdown(event.target.id);
            break;
            case "undo":
                addMarkdown(null);
            break;
            default:
                return false;
        }
    }
}, false);
