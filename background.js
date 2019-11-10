/*jshint esversion: 6*/

var postContent = "",
    persistentContent = "",
    persistentCount = 0;


function onError( error ) {
    console.log( error );
}


function onInstalled( details ) {
    if ( details.reason === "update" || details.reason === "install" ) {
        browser.tabs.create( {
            url: `http://arlogn.github.io/easyshare/index.html?q=${details.reason}`
        } );
    }
}


function onCreated() {
    if ( browser.runtime.lastError ) {
        console.log( `Error: ${browser.runtime.lastError}` );
    }
}


// Set publisher theme (Original/Dark)
function setPopupTheme( name = null ) {
    const filePath = {
        original: "/publisher/publisher.html",
        dark: "/publisher/publisher-dark.html"
    };

    if ( name ) {
        browser.browserAction.setPopup( {
            popup: filePath[ name ]
        } );
    } else {
        const theme = browser.storage.local.get( "theme" );
        theme.then( data => {
            const themeName = data.theme || "original";
            browser.browserAction.setPopup( {
                popup: filePath[ themeName ]
            } );
        }, onError );
    }
}

// Set the text of browser action badge
function setBadge( count ) {
    if ( typeof count === "number" ) {
        count = count.toString();
    }
    browser.browserAction.setBadgeText( { text: count } );
}

// Parse URLs of popular media sharing sites
function parseMediaUrl( url ) {
    var match;

    // Youtube
    const youtubePattern = /https?:\/\/(www\.)?youtube\.com\/watch\?(\S+\&)?(v=[A-Za-z0-9._%-]*)(\&\S+)?/;
    match = url.match( youtubePattern );
    if ( match )
        return `https://www.youtube.com/watch?${match[3]}`;

    // Vimeo
    const vimeoPattern = /https?:\/\/(player\.)?vimeo\.com\/(video\/)?([A-Za-z0-9._%-]*)(\&\S+)?/;
    match = url.match( vimeoPattern );
    if ( match )
        return `https://vimeo.com/${match[3]}`;

    // SoundCloud
    const soundcloudPattern = /https?:\/\/soundcloud\.com\/([\w\-\.]+\/[\w\-\.]+)/;
    match = url.match( soundcloudPattern );
    if ( match )
        return `https://soundcloud.com/${match[1]}`;

    // Twitter
    const twitterPattern = /https?:\/\/twitter\.com\/(.*)\/status(?:es)?\/([^\/\?]+)/;
    match = url.match( twitterPattern );
    if ( match )
        return `https://twitter.com/${match[1]}/status/${match[2]}`;

    return null;
}


browser.contextMenus.create( {
    id: "addHeaderAndContent",
    title: browser.i18n.getMessage( "menuItemAddHeaderAndContent" ),
    contexts: [ "selection", "image", "video", "audio", "link", "page" ],
    icons: {
        "16": "icons/cmenu1.png"
    }
}, onCreated );

browser.contextMenus.create( {
    id: "addContent",
    title: browser.i18n.getMessage( "menuItemAddContent" ),
    contexts: [ "selection", "image", "video", "audio", "link", "page" ],
    icons: {
        "16": "icons/cmenu2.png"
    }
}, onCreated );

setPopupTheme();

browser.browserAction.setBadgeBackgroundColor( { color: "#337ab7" } );
browser.browserAction.setBadgeTextColor( { color: "white" } );


browser.contextMenus.onClicked.addListener( ( info, tab ) => {

    var header = true;
    if ( info.menuItemId === "addContent" ) header = false;

    // Default formatting the collected content
    if ( info.hasOwnProperty( "mediaType" ) ) {
        if ( info.mediaType === "image" ) {
            if ( info.linkUrl ) {
                postContent = `[![Image](${info.srcUrl}) ](${info.linkUrl})`;
            } else {
                postContent = `![Image](${info.srcUrl})`;
            }
        } else if ( info.mediaType === "video" || info.mediaType === "audio" ) {
            postContent = `${info.srcUrl}`;
        }
        if ( header ) {
            postContent += `\n\n### ${tab.title}\n${info.pageUrl}`;
        }
    } else {
        if ( info.linkUrl ) {
            postContent = `[${info.linkText}](${info.linkUrl})`;
            if ( header ) postContent = `### ${tab.title}\n${info.pageUrl}\n\n${postContent}`;
        } else {
            var mediaUrl = parseMediaUrl( info.pageUrl );
            if ( mediaUrl ) {
                postContent = `${mediaUrl}`;
                if ( header ) postContent = `### ${tab.title} \n${postContent}`;
            }
        }
    }

    if ( info.hasOwnProperty( "selectionText" ) ) {
        if ( postContent ) {
            postContent += `\n\n${info.selectionText}`;
        } else {
            postContent = `${info.selectionText}`;
            if ( header ) {
                postContent = `### ${tab.title}\n${info.pageUrl}\n\n${postContent}`;
            }
        }
    }

    if ( !postContent && header ) postContent = `### ${tab.title}\n${info.pageUrl}`;

    browser.browserAction.openPopup();
} );

browser.storage.onChanged.addListener( ( changes, area ) => {
    var changedItems = Object.keys( changes );

    for ( var item of changedItems ) {
        // Check to see if a different theme has been selected
        if ( item === "theme" && changes[ item ].oldValue !== changes[ item ].newValue ) {
            setPopupTheme( changes[ item ].newValue );
        }
        // Update persistent content
        if ( item === "persistent" ) {
            persistentContent = changes[ item ].newValue;
            if ( persistentContent ) {
                setBadge( ++persistentCount );
            } else {
                setBadge( "" );
                persistentCount = 0;
            }
        }
    }
} );

browser.commands.onCommand.addListener( function ( command ) {
    // Manually clean persistent content
    if ( command == "clean_persistent_content" ) {
        persistentContent = "";
        browser.storage.local.set( {
            persistent: persistentContent
        } );
    }
} );

browser.runtime.onMessage.addListener( ( request, sender, sendResponse ) => {
    // Send the post content when requested
    if ( request === "getContent" ) {
        if ( persistentContent ) postContent = `${persistentContent}\n\n${postContent}`;
        sendResponse( {
            content: postContent
        } );
        if ( postContent ) postContent = "";
    }
} );

browser.runtime.onInstalled.addListener( onInstalled );
