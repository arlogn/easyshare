var youtube = youtube || {};


/*
 * Update the panel content when displayed
 */
function onPanelShow(data) {
    var range = document.createRange(),
        fragment = range.createContextualFragment(data.thumb),
        wrapper = document.getElementById("thumbox"),
        thumb = document.getElementById("thumb"),
        undo = document.getElementById("undo");

    if (!thumb) {
        wrapper.appendChild(fragment);
    } else {
        wrapper.replaceChild(fragment, thumb);
    }

    document.getElementById("title").value = data.title;
    document.getElementById("url").value = data.url;
    document.getElementById("text").value = data.text;
    document.getElementById("tags").value = "";

    youtube = {
        video: data.video || false,
        url: data.vurl || ""
    };

    if (undo.style.visibility != "hidden") undo.style.visibility = "hidden";
}


/*
 * Handle clicks to markdown buttons.
 * Add syntax for emphasis, strong emphasis or to define an indented quoted section.
 */
function makeText(str) {
    var t = document.getElementById("text"),
        text = t.value,
        sel = text.substring(t.selectionStart, t.selectionEnd),
        undo = document.getElementById("undo");

    var onlySpaces = function(text) {
        return /^\s+$/.test(text);
    };

    var syntaxRemove = function(text) {
        undo.style.visibility = "hidden";
        return text.replace(/_([\s\S]*?)_/g, '$1').
                    replace(/\*\*([\s\S]*?)\*\*/g, '$1').
                    replace(/\n\n>\s([\s\S]*?)\n\n/g, '$1').
                    replace(/>\s([\s\S]*?)/g, '$1');
    };

    var markdownify = function (str, text) {
        var syntaxFor = {
            "emphasis": function() {
                return "_" + text + "_";
            },
            "strong": function() {
                return "**" + text + "**";
            },
            "blockquote": function() {
                text = text.trim();
                text = text.replace(/\n{3,}/g, '\n\n');
                text = text.replace(/^/gm, '> ');
                return "\n\n" + text + "\n\n";
            }
        };

        if (undo.style.visibility == "hidden") undo.style.visibility = "visible";

        return syntaxFor[str]();
    };

    if (text.length > 0 && !onlySpaces(text)) {
        if (str) {
            if (sel.length > 0 && !onlySpaces(sel)) {
                t.value = text.replace(new RegExp('([\\s\\S]{'+t.selectionStart+'})([\\s\\S]{'+(t.selectionEnd-t.selectionStart)+'})'), '$1' +
                markdownify(str, '$2'));
            } else {
                // skip if text is already wrapped by markdown syntax
                if (!/^\*(.*)\*$/.test(text) && !/^_(.*)_$/.test(text) && !/^\n\n>[\s\S]*\n\n$/.test(text)) {
                    // if text contains newline skip emphasis and strong to avoid markdown error
                    if (/\n/.test(text)) {
                        if (str == "blockquote") t.value = markdownify(str, text);
                    } else {
                        if (str != "blockquote") text = text.trim();
                        t.value = markdownify(str, text);
                    }
                }
            }
        } else {
            t.value = syntaxRemove(t.value);
        }
    }
}


/*
 * Return formatted and lined up content
 */
function getFormattedContent() {
    var title = document.getElementById("title").value,
        text = document.getElementById("text").value,
        tags = document.getElementById("tags").value,
        url = document.getElementById("url").value,
        thumb = document.getElementById("thumb"),
        content = "";

    if (title.length > 0 && /^\s+$/.test(title)) title = "";
    else content += "**" + title + "**";

    if (tags.length > 0) tags = tags.replace(/\s+/g, "")
                                .replace(/^([\w\W]+)$/g, "#$1")
                                .replace(/,/g, " #")
                                .replace(/##/g, "#");

    if (youtube.video) {
        if (title) content += "\n";

        if (text) content += text;

        content += "\n\n" + youtube.url;

    } else {
        if (thumb.className != "thumb-placeholder")
            content += content += "[![Image](" + thumb.getAttribute("src") + ")](" + url + ")\n";

        if (title && url) content += "\n";

        if (url) content += "[" + url + "](" + url + ")";

        if ((title || url) && text) content += "\n\n" + text;
        else content += text;
    }

    if (tags) content += "\n\n" + tags;

    return content;
}


/*
 * Send the post data to the main add-on code
 */
function send() {
    var aspect = document.getElementById("share").value;

    if (aspect == "") aspect = "public";

    var data = { post: getFormattedContent(), aspect: aspect };

    self.port.emit("post", data);
}


/* Listeners */

self.port.on("show", onPanelShow);

self.port.on("shortUrl", function(value) {
    var url = document.getElementById("url"),
        longUrl = url.value;

    url.value = value;

    // reset to longurl if returned value is an error warning
    if (!/^http/.test(value)) {
        setTimeout(function () {
            url.value = longUrl;
        }, 3000);
    }

});

self.port.on("wait", function(text, status) {
    var button = document.getElementById("send");
    button.text = text;

    // disable the button while sending the post
    if(status == 'sending') {
        button.style.pointerEvents = "none";
        button.className = "button sending";
    } else {
        button.style.pointerEvents = "auto";
        button.className = "button send";
    }
});

document.getElementById("shorturl").addEventListener("click", function () {
    var longUrl = document.getElementById("url").value;
    self.port.emit("shorten", longUrl);
});

document.getElementById("sidebar").addEventListener("click", function(event) {
    switch (event.target.id) {
        case "send":
            send();
            break;
        case "blockquote":
            makeText("blockquote");
            break;
        case "strong":
            makeText("strong");
            break;
        case "emphasis":
            makeText("emphasis");
            break;
        case "undo":
            makeText(null);
            break;
        default:
            return false;
    }
    event.preventDefault();
}, false);
