var videoData = function() {
    try {
        var itemscope = document.getElementById("watch7-content");

        var items = {
            title: itemscope.querySelector("[itemprop='name']").getAttribute("content"),
            desc: itemscope.querySelector("[itemprop='description']").getAttribute("content"),
            thumb: itemscope.querySelector("[itemprop='thumbnailUrl']").getAttribute("href")
        };

    } catch (e) {
        console.warn("video microdata not found.");
        return null;
    }

    return items;
};

self.on("click", function(node, data) {
    var content = {
        url: document.URL,
        title: document.title,
        image: "images/diaspora.png"
    };

    if (data === "video") {
        var video_data = videoData();

        if (typeof(video_data) === "object") {
            content.title = video_data.title;
            content.text = video_data.desc;
            content.image = video_data.thumb;
        } else {
            content.text = "";
        }
    }
    else {

        if (data === "image") {
            content.image = node.src;
        }

        content.text = window.getSelection().toString();
    }

    self.postMessage(content);
});
