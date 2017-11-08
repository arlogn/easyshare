/*jshint node: true, browser: true, esversion: 6 */
/*globals self: false*/

"use strict";

self.on("click", function(node, data) {
    var content = {
        url: document.URL,
        title: document.title,
        image: "images/diaspora.png"
    };

    if (data === "video") {

        content.image = "images/youtube.png";

    }
    else {

        if (data === "image") {
            // Discard base64-encoded data URIs
            if (node.src.substring(0, 10) === "data:image") {
                content.image = "data URIs";
            }
            else {
                content.image = node.src;
            }
        }
    }

    content.text = window.getSelection().toString() || "";

    self.postMessage(content);
});
