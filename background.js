/*jshint esversion: 6*/

let postContent = "";
let persistentContent = "";

function onError(error) {
    console.log(error);
}

// function onInstalled(details) {
//     if (details.reason === "update" || details.reason === "install") {
//         browser.tabs.create({
//             url: `http://arlogn.github.io/easyshare/index.html?q=${details.reason}`
//         });
//     }
// }

function onCreated() {
    if (browser.runtime.lastError) {
        console.log(`Error: ${browser.runtime.lastError}`);
    }
}

// Set theme (Original/Dark)
function setTheme(name = null) {
    const filePath = {
        original: "/publisher/publisher.html",
        dark: "/publisher/publisher-dark.html"
    };

    if (name) {
        browser.browserAction.setPopup({
            popup: filePath[name]
        });
    } else {
        const theme = browser.storage.local.get("theme");
        theme.then(data => {
            const themeName = data.theme || "original";
            browser.browserAction.setPopup({
                popup: filePath[themeName]
            });
        }, onError);
    }
}

// Set the badge text
function setBadge(str) {
    browser.browserAction.setBadgeText({
        text: str
    });
}

// Parse URLs of popular media sharing sites
function parseMediaUrl(url) {
    let match = null;

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

// Create the context menu items
browser.contextMenus.create({
    id: "addHeaderAndContent",
    title: browser.i18n.getMessage("menuItemAddHeaderAndContent"),
    contexts: ["selection", "image", "video", "audio", "link", "page"],
    icons: {
        "16": "icons/cmenu1.png"
    }
}, onCreated);
browser.contextMenus.create({
    id: "addContent",
    title: browser.i18n.getMessage("menuItemAddContent"),
    contexts: ["selection", "image", "video", "audio", "link", "page"],
    icons: {
        "16": "icons/cmenu2.png"
    }
}, onCreated);

setTheme();

// Set the badge colors
browser.browserAction.setBadgeBackgroundColor({
    color: "#222222"
});
browser.browserAction.setBadgeTextColor({
    color: "#ffffff"
});

// Listen for click on the context menu items
browser.contextMenus.onClicked.addListener((info, tab) => {
    let header = true;
    if (info.menuItemId === "addContent") header = false;

    // Default formatting the content
    if (info.hasOwnProperty("mediaType")) {
        if (info.mediaType === "image") {
            postContent = info.linkUrl ? `[![Image](${info.srcUrl}) ](${info.linkUrl})` : `![Image](${info.srcUrl})`;
        } else if (info.mediaType === "video" || info.mediaType === "audio") {
            postContent = `${info.srcUrl}`;
        }
        if (header) {
            postContent += `\n\n### ${tab.title}\n${info.pageUrl}`;
        }
    } else if (info.linkUrl) {
        postContent = `[${info.linkText}](${info.linkUrl})`;
        if (header) postContent = `### ${tab.title}\n${info.pageUrl}\n\n${postContent}`;
    } else {
        const mediaUrl = parseMediaUrl(info.pageUrl);
        if (mediaUrl) {
            postContent = mediaUrl;
            if (header) postContent = `### ${tab.title} \n${postContent}`;
        }
    }

    if (info.hasOwnProperty("selectionText")) {
        if (postContent) {
            postContent += `\n\n${info.selectionText}`;
        } else {
            postContent = `${info.selectionText}`;
            if (header) {
                postContent = `### ${tab.title}\n${info.pageUrl}\n\n${postContent}`;
            }
        }
    }

    // If nothing is selected, the content will be the title and url of the page 
    if (!postContent) {
        postContent = header ? `### ${tab.title}\n${info.pageUrl}` : info.pageUrl;
    }

    browser.browserAction.openPopup();
});

// Listen for changes in storage area
browser.storage.onChanged.addListener((changes, area) => {
    const changedItems = Object.keys(changes);

    for (let item of changedItems) {
        // Check to see if a different theme is selected
        if (item === "theme" && changes[item].oldValue !== changes[item].newValue) {
            setTheme(changes[item].newValue);
        }
        // Update badge and persistent content
        if (item === "persistent") {
            persistentContent = changes[item].newValue;
            if (persistentContent) {
                setBadge("🡫");
            } else {
                setBadge("");
            }
        }
    }
});

// Listen for commands
browser.commands.onCommand.addListener((command) => {
    // Manually clean the persistent content
    if (command == "clean_persistent_content") {
        persistentContent = "";
        browser.storage.local.set({
            persistent: ""
        });
    }
});

// Listen for messages
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Send the post content to the publisher
    if (request === "getContent") {
        if (persistentContent) postContent = `${persistentContent}\n\n${postContent}`;
        sendResponse({
            content: postContent
        });
        if (postContent) postContent = "";
    }
});

// browser.runtime.onInstalled.addListener(onInstalled);
