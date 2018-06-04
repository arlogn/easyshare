/*jshint esversion: 6*/

var postContent = null;


function onInstalled(details) {
    if (details.reason === "update" || details.reason === "install") {
        browser.tabs.create({
            url: `http://arlogn.github.io/easyshare/index.html?q=${details.reason}`
        });
    }
}


function onCreated() {
    if (browser.runtime.lastError) {
        console.log(`Error: ${browser.runtime.lastError}`);
    } else {
        console.log("Easyshare menu created successfully");
    }
}


// Parse URLs of popular media sharing sites to make them suitable for oEmbed
function parseMediaUrl(url) {
    var match;

    // Youtube
    const youtubePattern = /https?:\/\/(www\.)?youtube\.com\/watch\?(\S+\&)?(v=[A-Za-z0-9._%-]*)(\&\S+)?/;
    match = url.match(youtubePattern);
    if (match)
        return `https://www.youtube.com/watch?${match[3]}`;

    // Vimeo
    const vimeoPattern = /https?:\/\/(player\.)?vimeo\.com\/(video\/)?([A-Za-z0-9._%-]*)(\&\S+)?/;
    match = url.match(vimeoPattern);
    if (match)
        return `https://vimeo.com/${match[3]}`;

    // SoundCloud
    const soundcloudPattern = /https?:\/\/soundcloud\.com\/([\w\-\.]+\/[\w\-\.]+)/;
    match = url.match(soundcloudPattern);
    if (match)
        return `https://soundcloud.com/${match[1]}`;

    // Twitter
    const twitterPattern = /https?:\/\/twitter\.com\/(.*)\/status(?:es)?\/([^\/\?]+)/;
    match = url.match(twitterPattern);
    if (match)
        return `https://twitter.com/${match[1]}/status/${match[2]}`;

    return null;
}


browser.contextMenus.create({
    id: "shareThisContent",
    title: browser.i18n.getMessage("menuItemShareThisContent"),
    contexts: ["selection", "image", "video", "audio", "link", "page"]
}, onCreated);


browser.contextMenus.onClicked.addListener((info, tab) => {

    // Default formatting the collected content
    if (info.hasOwnProperty("mediaType")) {
        if (info.mediaType === "image") {
            if (info.linkUrl) {
                postContent = `[![Image](${info.srcUrl}) ](${info.linkUrl})\n\n### ${tab.title}\n${info.pageUrl}`;
            } else {
                postContent = `![Image](${info.srcUrl})\n\n### ${tab.title}\n${info.pageUrl}`;
            }
        } else if (info.mediaType === "video" || info.mediaType === "audio") {
            postContent = `### ${tab.title}\n${info.srcUrl}`;
        }
    } else {
        if (info.linkUrl) {
            postContent = `[${info.linkText}](${info.linkUrl})`;
        } else {
            var mediaUrl = parseMediaUrl(info.pageUrl);
            if (mediaUrl) {
                postContent = `### ${tab.title} \n${mediaUrl}`;
            }
            else {
                if (!postContent) {
                    postContent = `### ${tab.title}\n${info.pageUrl}`;
                }
            }
        }
    }

    if (info.hasOwnProperty("selectionText")) {
        if (postContent) {
            postContent += `\n\n${info.selectionText}`;
        } else {
            postContent = `### ${tab.title}\n${info.pageUrl}\n\n${info.selectionText}`;
        }
    }

    browser.browserAction.openPopup();
});


browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Send the post content when requested
    if (request === "getContent") {
        sendResponse({ content: postContent });
        if (postContent) postContent = null;
    }
});


browser.runtime.onInstalled.addListener(onInstalled);
