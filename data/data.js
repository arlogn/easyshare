/* Get schema microdata of youtube video */
var videoData = function() {
    try {
        var c = document.getElementById("content");
        
        var md = {
            url: c.querySelector("[itemprop=\"url\"]").getAttribute("href"),
            title: c.querySelector("[itemprop=\"name\"]").getAttribute("content"),
            desc: c.querySelector("[itemprop=\"description\"]").getAttribute("content"),
            thumb: c.querySelector("[itemprop=\"thumbnailUrl\"]").getAttribute("href")
        };

    } catch (e) {
        console.warn("youtube microdata not found.");
        return false;
    }

    return md;
};

/* Handle clicks to context-menu items */
self.on("click", function(node, data) {
    var payload = {
        url: document.URL,
        title: document.title,
        thumb: "<img id=\"thumb\" class=\"thumb-placeholder\" src=\"placeholder.png\">"
    };

    if (data === "video") {
        var vd = videoData();
        
        if (vd) {
            payload.thumb = "<img id=\"thumb\" src=\"" + vd.thumb + "\">";
            payload.title = vd.title;
            payload.text = vd.desc;
            payload.vurl = vd.url;
        } else {
            payload.text = "";
            payload.vurl = data.url;
        }

        payload.video = true;
    
    } else {
        
        if (data === "image") {
            payload.thumb = "<img id=\"thumb\" width=\"" + node.clientWidth +
                        "\" height=\"" + node.clientHeight + "\" src=\"" + 
                        node.src + "\">";
        }

        payload.text = window.getSelection().toString();
        payload.video = false;
        payload.vurl = "";
    }

    // Post a message and pass collected data
    self.postMessage(payload);
});