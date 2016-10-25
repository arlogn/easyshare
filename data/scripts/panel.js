// Update the panel content
function onPanelShow(data) {
    var doc = document;

    var thumb = doc.querySelector(".thumb-container > img");

    if (thumb.getAttribute("src") !== data.image) {
        if (data.image.substring(0, 10) === "data:image") {
            thumb.setAttribute("src", "images/diaspora.png");
            warningNotAllowedImage();
        }
        else {
            thumb.setAttribute("src", data.image);
        }
    }

    doc.getElementById("post-title").value = data.title;
    doc.getElementById("post-url").value = data.url;
    doc.getElementById("post-text").value = data.text;
    doc.getElementById("post-tags").value = "";

    setUndoButtonState("disabled");
}

// Show a warning message over the thumbnail if the image is encoded as data URI
function warningNotAllowedImage() {
    var doc = document;

    var overlay = doc.createElement("div");
    overlay.classList.add("overlay");
    var text = doc.createTextNode("WARNING! You've selected an inline image, embedded using " +
                                  "the data URI scheme. It cannot be added to the content " +
                                  "of the post.");
    overlay.appendChild(text);
    doc.querySelector(".thumb-container").appendChild(overlay);

    setTimeout(function() {
        overlay.parentNode.removeChild(overlay);
    }, 7000);
}

// Set the state of the button to remove all markdown syntax added
function setUndoButtonState(state) {
    var undo = document.getElementById("undo");

    if (state === "enabled" && !undo.classList.contains("enabled"))
        undo.classList.add("enabled");
    else if (state === "disabled" && undo.classList.contains("enabled"))
        undo.classList.remove("enabled");
}

// Simple text formatting. Add/remove markdown syntax for italic, bold and quotation
function addMarkdown(option) {
    var postText = document.getElementById("post-text"),
        text = postText.value,
        sel = text.substring(postText.selectionStart, postText.selectionEnd);

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
                postText.value = text.replace(new RegExp("([\\s\\S]{" + postText.selectionStart +
                    "})([\\s\\S]{" + (postText.selectionEnd-postText.selectionStart) + "})"), "$1" +
                    addSyntax(option, "$2"));
            }
            else {
                // skip if text is already wrapped by markdown syntax
                if (!isFormatted(text)) {
                    // skip italic and bold if text contains newline to avoid formatting error
                    if (isSplitted(text)) {
                        if (option === "quote") postText.value = addSyntax(option, text);
                    }
                    else {
                        if (option !== "quote") text = text.trim();
                        postText.value = addSyntax(option, text);
                    }
                }
            }
        }
        else {
            postText.value = removeSyntax(postText.value);
        }
    }
}

// Get the panel content and build a formatted status message
function buildStatusMessage() {
    var doc = document;

    var title = doc.getElementById("post-title").value,
        url   = doc.getElementById("post-url").value,
        text  = doc.getElementById("post-text").value,
        tags  = doc.getElementById("post-tags").value,
        image = doc.querySelector("img[src*=http]"),
        isVideo = /^\b(https?):\/\/www\.youtube\.com\/watch\?.*/.test(url),
        message = [];

    if (title.length > 0 && !/^\s+$/.test(title)) title = "**" + title + "**";

    //sanitize tags
    if (tags.length > 0) tags = tags.replace(/#|\s/g, "")
                                    .replace(/^(.*)/, "#$1")
                                    .split(",").join(" #");

    if (image)
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
function sendData() {
    var aspect = document.getElementById("share").value;

    if (!aspect) aspect = "public";

    var data = { message: buildStatusMessage(), aspect: aspect };

    self.port.emit("post", data);
}


// Listening to messages

self.port.on("show", onPanelShow);

self.port.on("shortUrl", function(short) {
    var url = document.getElementById("post-url"),
        longUrl = url.value;

    url.value = short;

    // put back the longurl if value isn't a url
    if (!/^http/.test(short)) {
        setTimeout(function () {
            url.value = longUrl;
        }, 3000);
    }

});

self.port.on("wait", function(text, status) {
    var send = document.getElementById("send");
    send.textContent = text;

    // disable the button while sending
    if(status === "sending") {
        send.style.pointerEvents = "none";
        send.classList.add("sending");
    }
    else {
        send.style.pointerEvents = "auto";
        send.classList.remove("sending");
    }
});


// Handling click events on buttons

document.getElementById("shorturl").addEventListener("click", function () {
    var url = document.getElementById("post-url").value;
    self.port.emit("shorten", url);
}, false);

document.querySelector(".sidebar").addEventListener("click", function(event) {
    if (event.target.nodeName === "BUTTON") {
        switch (event.target.id) {
            case "send":
                sendData();
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
