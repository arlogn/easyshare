// Get Youtube video data
var videoData = function() {
    try {
        var c = document.getElementById("content");
        var data = {
            url: c.querySelector("[itemprop=\"url\"]").getAttribute("href"),
            title: c.querySelector("[itemprop=\"name\"]").getAttribute("content"),
            desc: c.querySelector("[itemprop=\"description\"]").getAttribute("content"),
            thumb: c.querySelector("[itemprop=\"thumbnailUrl\"]").getAttribute("href")
        };
    } catch (e) {
        console.log("Easyshare: Youtube video data not found.");
        return false;
    }

    return data;
};

// Handling context-menu items click
self.on("click", function(node, data) {
    var d = {
        url: document.URL,
        title: document.title,
        thumb: "<img id=\"thumb\" class=\"thumb-placeholder\" src=\"placeholder.png\">"
    };

    if (data == "video") {
        var vd = videoData();
        if (vd) {
            d.thumb = "<img id=\"thumb\" src=\"" + vd.thumb + "\">";
            d.title = vd.title;
            d.text = vd.desc;
            d.vurl = vd.url;
        } else {
            d.text = "";
            d.vurl = data.url;
        }
        d.video = true;
    } else {
        if (data == "image") {
            d.thumb = "<img id=\"thumb\" width=\"" + node.clientWidth +
                "\" height=\"" + node.clientHeight + "\" src=\"" + node.src + "\">";
        }
        d.text = window.getSelection().toString();
        d.video = false;
        d.vurl = "";
    }

    self.postMessage(d);
});