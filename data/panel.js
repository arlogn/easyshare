var youtube = youtube || {};


/* Update the panel content when displayed */
function onPanelShow(data) {
    var range = document.createRange(),
        fragment = range.createContextualFragment(data.thumb),
        wrapper = document.getElementById("thumbox"),
        thumb = document.getElementById("thumb");

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

    document.getElementById("undo").style.visibility = "hidden";
}


/* Add a basic formatting to the text adding some html tags */
function makeText(tag) {
    var t = document.getElementById("text"),
        text = t.value,
        sel = text.substring(t.selectionStart, t.selectionEnd),
        undo = document.getElementById("undo");

    var whitespaceonly = function(str) { 
        return /^\s+$/.test(str); 
    };

    if (text.length > 0 && !whitespaceonly(text)) {
        if (tag) {
            if (sel.length > 0 && !whitespaceonly(sel)) {
                t.value = text.replace(new RegExp('([\\s\\S]{'+t.selectionStart+'})([\\s\\S]{'+(t.selectionEnd-t.selectionStart)+'})'), '$1<'+tag+'>$2</'+tag+'>');
            } else {
                if (!/^<[a-z][\s\S]*>$/.test(text))
                    t.value = "<" + tag + ">" + text + "</" + tag + ">";
            }

            if (undo.style.visibility === "hidden") undo.style.visibility = "visible";

        } else {
            t.value = text.replace(/(<\/?)(\w+)(>)/ig, "");
            if (undo.style.visibility === "visible") undo.style.visibility = "hidden";
        }
    }
}


/* Returns a formatted post content */
function getFormattedContent() {
    var title = document.getElementById("title").value,
        text = document.getElementById("text").value,
        tags = document.getElementById("tags").value,
        url = document.getElementById("url").value,
        thumb = document.getElementById("thumb"),
        content = "";

    if (title.length > 0) {
        if (/^\s+$/.test(title)) {
            title = "";
        } else {
            title = title.replace(/\*/g, "\\*");
        }
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
            title = title.replace(/\*/g, "\\*");
            content += "**" + title + "**";
        }
        
        if (text) {
            content += "<br>" + text;
        }

        //content += "<br><br>![thumb](" + thumb.getAttribute("src") + ")<br>";
        
        if (tags) {
            content += "<p>" + tags + "</p>";
        }

        if (!/<\/p>$/.test(content)) {
            content += "<br>";
        }
        
        content += " " + youtube.url;
    
    } else {
        if (thumb.className != "thumb-placeholder") {
            content += "[![thumb](" + thumb.getAttribute("src") +
                ")](" + url + ")<br><br>";
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
            content += "<p>" + text + "</p>";
        }
        else {
            content += text;
        }
    
        if (tags) {
            content += "<p>" + tags + "</p>";
        }
    
        if (!/<\/p>$/.test(content)) {
            content += "<br>";
        }
    }

    return encodeURIComponent(content);
}


/* Send the post content to the Diaspora Publisher */
function toPublisher() {
    var data = { post: getFormattedContent() };
                 
    self.port.emit("publish", data);
}


/* Listeners */

self.port.on("show", onPanelShow);

self.port.on("shortUrl", function(value) {
    var url = document.getElementById("url"),
        longUrl = url.value;

    url.value = value;

    if (!/^http/.test(value)) {
        // reset value to longUrl on error
        setTimeout(function () {
            url.value = longUrl;
        }, 3000);
    }

});

document.getElementById("shorturl").addEventListener("click", function () {
    var longUrl = document.getElementById("url").value;
    self.port.emit("shorten", longUrl);
});

document.getElementById("bar").addEventListener("click", function(event) {
    switch (event.target.id) {
        case "send":
            toPublisher();
            break;
        case "blockquote":
            makeText("blockquote");
            break;
        case "strong":
            makeText("strong");
            break;
        case "emphasis":
            makeText("em");
            break;
        case "undo":
            makeText();
            break;
        default:
            return false;
    }
    event.preventDefault();
}, false);
