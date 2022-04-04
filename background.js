/*jshint esversion: 6*/

let postContent = "";
let persistentContent = "";

const redirectURL = browser.identity.getRedirectURL();


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

// Set the theme (Original/Dark)
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

// Generate a randon string
function generateRandomString(length) {
    return Math.random().toString(20).substr(2, length);
}
    
// OpenID: register the client
function registerClient(podurl) {
    const url = `${podurl}/api/openid_connect/clients`;
    const params = {
        application_type: "web",
        client_name: "Diaspora Easyshare",
        redirect_uris: [
            redirectURL
        ]
    };

    const xhr = new XMLHttpRequest();

    xhr.open("POST", url);

    xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.response);
            browser.storage.local.set({
                    clientId: data.client_id
                })
                .then(() => {
                    authorizeClient(podurl, data.client_id, true)
                        .then(validateAndStoreToken);
                })
                .catch(onError);
        } else {
            console.log(`OpenID client registration: error ${xhr.status} (${xhr.statusText}).`);
        }
    };

    xhr.onerror = () => {
        console.log("OpenID client registration: network request failed!");
    };

    xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    xhr.setRequestHeader("Accept", "application/json");

    xhr.send(JSON.stringify(params));
}

// OpenID: run the authorization flow
function authorizeClient(podurl, clientID) {
    const scopes = ["openid", "contacts:read", "public:modify", "private:modify"];
    let authURL = `${podurl}/api/openid_connect/authorizations/new`;

    const state = generateRandomString(12);
    const nonce = generateRandomString(12);

    browser.storage.local.set({
        state,
        nonce
    });

    authURL += `?client_id=${clientID}`;
    authURL += `&response_type=id_token token`;
    authURL += `&redirect_uri=${encodeURIComponent(redirectURL)}`;
    authURL += `&scope=${encodeURIComponent(scopes.join(' '))}`;
    authURL += `&state=${state}`;
    authURL += `&nonce=${nonce}`;

    return browser.identity.launchWebAuthFlow({
        interactive: true,
        url: authURL
    });
}

// Decode the ID Token
function parseJWT(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

// Extract, validate and store the token
function validateAndStoreToken(redirectUri) {
    let match = redirectUri.match(/[#?](.*)/);
    let params = new URLSearchParams(match[1].split("#")[0]);

    if (params) {
        const gettingValues = browser.storage.local.get(["state", "nonce"]);
        gettingValues.then((items) => {
            let id_token = parseJWT(params.get("id_token"));
            if (params.get("state") === items.state && id_token.nonce === items.nonce) {
                browser.storage.local.set({
                    token: params.get("access_token"),
                    createdAt: Date.now()
                });
            } else {
                console.log("Token validation failed!");
            }
        }, onError);
    } else {
        console.log("Invalid redirect URI", redirectUri);
    }
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
    color: "#b0d8f5"
});
browser.browserAction.setBadgeTextColor({
    color: "black"
});

// Listen for click on the context menu items
browser.contextMenus.onClicked.addListener((info, tab) => {
    let header = true;
    if (info.menuItemId === "addContent") header = false;

    // Default formatting of the selected content
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
                setBadge("+");
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
    else if (request === "openOptions") {
        // Open options tab
        browser.runtime.openOptionsPage();
    }
});

// browser.runtime.onInstalled.addListener(onInstalled);
