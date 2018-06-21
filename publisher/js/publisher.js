/*jshint esversion: 6*/

const PUBLISHER = document.querySelector( ".publisher" ),
    EDITOR = PUBLISHER.querySelector( "#editor" );

var isPreview = false;

function onError( error ) {
    EDITOR.value = error;
    EDITOR.style.color = "#f00";

    console.log( error );
}

function onSuccess( message ) {
    enableElements( "all" );
    EDITOR.value = message;
}

function onSending( message ) {
    disableElements( "all" );
    EDITOR.value = message;
}

function enableElements( id ) {
    if ( id === "all" ) {
        Array.from( PUBLISHER.querySelectorAll( ".btn" ) )
            .forEach( e => e.removeAttribute( "disabled" ) );
        PUBLISHER.querySelector( "#tags" ).removeAttribute( "disabled" );
    } else {
        PUBLISHER.querySelector( id ).removeAttribute( "disabled" );
    }
}

function disableElements() {
    Array.from( PUBLISHER.querySelectorAll( ".btn" ) )
        .forEach( e => e.setAttribute( "disabled", "disabled" ) );
    PUBLISHER.querySelector( "#tags" ).setAttribute( "disabled", "disabled" );
}

function parseContent() {
    var content = EDITOR.value,
        tags = getHashtags(),
        md = window.markdownit( {
            breaks: true,
            linkify: true
        } ).use( window.markdownitHashtag );

    if ( tags ) {
        content += "\n\n" + tags + "\n";
    }

    content = toMarkdown(content);

    return md.render( content );
}

function showPreview() {
    var footer = PUBLISHER.querySelector( ".footer" ),
        preview = document.createElement( "div" ),
        content;

    preview.classList.add( "preview" );

    if ( isPreview === false ) {
        isPreview = true;
        disableElements();
        enableElements( "#mdPreview" );
        content = parseContent();
        preview.innerHTML = content;
        PUBLISHER.insertBefore( preview, footer );

        preview.style.width = EDITOR.offsetWidth + "px";
        preview.style.height = EDITOR.offsetHeight + "px";

        EDITOR.style.display = "none";
    }
}

function hidePreview() {
    isPreview = false;
    PUBLISHER.querySelector( ".preview" ).remove();
    enableElements( "all" );
    EDITOR.style.display = "";
}

function getSelection() {
    var len = EDITOR.selectionEnd - EDITOR.selectionStart;

    return {
        start: EDITOR.selectionStart,
        end: EDITOR.selectionEnd,
        length: len,
        text: EDITOR.value.substr( EDITOR.selectionStart, len )
    };
}

function setSelection( start, end ) {
    EDITOR.selectionStart = start;
    EDITOR.selectionEnd = end;
}

function replaceSelection( text ) {
    EDITOR.value = EDITOR.value.substr( 0, EDITOR.selectionStart ) +
        text + EDITOR.value.substr( EDITOR.selectionEnd, EDITOR.value.length );
    EDITOR.selectionStart = EDITOR.value.length;
}

function applyMdBold() {
    var chunk, cursor, selected = getSelection(),
        content = EDITOR.value;

    if ( selected.length === 0 ) {
        chunk = "strong text";
    } else {
        chunk = selected.text;
    }

    // Apply/remove Bold syntax (**)
    if ( content.substr( selected.start - 2, 2 ) === "**" &&
        content.substr( selected.end, 2 ) === "**" ) {
        setSelection( selected.start - 2, selected.end + 2 );
        replaceSelection( chunk );
        cursor = selected.start - 2;
    } else {
        replaceSelection( "**" + chunk + "**" );
        cursor = selected.start + 2;
    }

    setSelection( cursor, cursor + chunk.length );
}

function applyMdItalic() {
    var chunk, cursor, selected = getSelection(),
        content = EDITOR.value;

    if ( selected.length === 0 ) {
        chunk = "emphasized text";
    } else {
        chunk = selected.text;
    }

    // Apply/remove Italic syntax (_)
    if ( content.substr( selected.start - 1, 1 ) === "_" &&
        content.substr( selected.end, 1 ) === "_" ) {
        setSelection( selected.start - 1, selected.end + 1 );
        replaceSelection( chunk );
        cursor = selected.start - 1;
    } else {
        replaceSelection( "_" + chunk + "_" );
        cursor = selected.start + 1;
    }

    setSelection( cursor, cursor + chunk.length );
}

function applyMdHeading() {
    var chunk, cursor, selected = getSelection(),
        content = EDITOR.value,
        pointer, prevChar;

    if ( selected.length === 0 ) {
        chunk = "heading text";
    } else {
        chunk = selected.text + "\n";
    }

    // Apply/remove Heading 3 syntax (###)
    if ( ( pointer = 4, content.substr( selected.start - pointer, pointer ) === "### " ) ||
        ( pointer = 3, content.substr( selected.start - pointer, pointer ) === "###" ) ) {
        setSelection( selected.start - pointer, selected.end );
        replaceSelection( chunk );
        cursor = selected.start - pointer;
    } else if ( selected.start > 0 &&
        ( prevChar = content.substr( selected.start - 1, 1 ), !!prevChar && prevChar != "\n" ) ) {
        replaceSelection( "\n\n### " + chunk );
        cursor = selected.start + 6;
    } else {
        replaceSelection( "### " + chunk );
        cursor = selected.start + 4;
    }

    setSelection( cursor, cursor + chunk.length );
}

function applyMdLink() {
    var chunk, cursor, selected = getSelection(),
        content = EDITOR.value;

    if ( selected.length === 0 ) {
        chunk = "enter link description here";
    } else {
        chunk = selected.text;
    }

    // Apply Link syntax ([]())
    replaceSelection( "[" + chunk + "](enter hyperlink here)" );
    cursor = selected.start + 1;
    setSelection( cursor, cursor + chunk.length );
}

function applyMdImage() {
    var chunk, cursor, selected = getSelection(),
        content = EDITOR.value;

    if ( selected.length === 0 ) {
        chunk = "enter image description here";
    } else {
        chunk = selected.text;
    }

    // Apply Image syntax (![]())
    replaceSelection( "![" + chunk + '](enter image hyperlink here "enter image title here")' );
    cursor = selected.start + 2;
    setSelection( cursor, cursor + chunk.length );
}

function applyMdUnorderedList() {
    var chunk, cursor, selected = getSelection(),
        content = EDITOR.value;

    // Apply Unordered List syntax (- )
    if ( selected.length === 0 ) {
        chunk = "list text here";
        replaceSelection( "- " + chunk );
        cursor = selected.start + 2;
    } else {
        if ( selected.text.indexOf( "\n" ) < 0 ) {
            chunk = selected.text;
            replaceSelection( "- " + chunk );
            cursor = selected.start + 2;
        } else {
            var list = [];

            list = selected.text.split( "\n" );
            chunk = list[ 0 ];

            list.forEach( ( item, i ) => {
                list[ i ] = "- " + item;
            } );

            replaceSelection( "\n\n" + list.join( "\n" ) );
            cursor = selected.start + 4;
        }
    }

    setSelection( cursor, cursor + chunk.length );
}

function applyMdOrderedList() {
    var chunk, cursor, selected = getSelection(),
        content = EDITOR.value;

    // Apply Ordered List syntax (1. )
    if ( selected.length === 0 ) {
        chunk = "list text here";
        replaceSelection( "1. " + chunk );
        cursor = selected.start + 3;
    } else {
        if ( selected.text.indexOf( "\n" ) < 0 ) {
            chunk = selected.text;
            replaceSelection( "1. " + chunk );
            cursor = selected.start + 3;
        } else {
            var n = 1,
                list = [];

            list = selected.text.split( "\n" );
            chunk = list[ 0 ];

            list.forEach( ( item, i ) => {
                list[ i ] = n + ". " + item;
                n++;
            } );

            replaceSelection( "\n\n" + list.join( "\n" ) );
            cursor = selected.start + 5;
        }
    }

    setSelection( cursor, cursor + chunk.length );
}

function applyMdCode() {
    var chunk, cursor, selected = getSelection(),
        content = EDITOR.value;

    if ( selected.length === 0 ) {
        chunk = "code text here";
    } else {
        chunk = selected.text;
    }

    // Apply/remove Code syntax (`)
    if ( content.substr( selected.start - 4, 4 ) === "```\n" &&
        content.substr( selected.end, 4 ) === "\n```" ) {
        setSelection( selected.start - 4, selected.end + 4 );
        replaceSelection( chunk );
        cursor = selected.start - 4;
    } else if ( content.substr( selected.start - 1, 1 ) === "`" &&
        content.substr( selected.end, 1 ) === "`" ) {
        setSelection( selected.start - 1, selected.end + 1 );
        replaceSelection( chunk );
        cursor = selected.start - 1;
    } else if ( chunk.indexOf( "\n" ) > -1 ) {
        replaceSelection( "```\n" + chunk + "\n```" );
        cursor = selected.start + 4;
    } else {
        replaceSelection( "`" + chunk + "`" );
        cursor = selected.start + 1;
    }

    setSelection( cursor, cursor + chunk.length );
}

function applyMdQuote() {
    var chunk, cursor, selected = getSelection(),
        content = EDITOR.value;

    // Apply Quote syntax (> )
    if ( selected.length === 0 ) {
        chunk = "quote here";
        replaceSelection( "> " + chunk );
        cursor = selected.start + 2;
    } else {
        if ( selected.text.indexOf( "\n" ) < 0 ) {
            chunk = selected.text;
            replaceSelection( "> " + chunk );
            cursor = selected.start + 2;
        } else {
            var list = [];

            list = selected.text.split( "\n" );
            chunk = list[ 0 ];

            list.forEach( ( item, i ) => {
                list[ i ] = "> " + item;
            } );

            replaceSelection( "\n\n" + list.join( "\n" ) );
            cursor = selected.start + 4;
        }
    }

    setSelection( cursor, cursor + chunk.length );
}

function handleMarkdownButtons( event ) {
    // Handle click events on buttons to apply md syntax
    EDITOR.focus();
    switch ( event.target.id ) {
        case "mdBold":
            applyMdBold();
            break;
        case "mdItalic":
            applyMdItalic();
            break;
        case "mdHeading":
            applyMdHeading();
            break;
        case "mdLink":
            applyMdLink();
            break;
        case "mdImage":
            applyMdImage();
            break;
        case "mdUlist":
            applyMdUnorderedList();
            break;
        case "mdOlist":
            applyMdOrderedList();
            break;
        case "mdCode":
            applyMdCode();
            break;
        case "mdQuote":
            applyMdQuote();
            break;
        case "mdPreview":
            if ( isPreview === false ) {
                showPreview();
            } else {
                hidePreview();
            }
            break;
        default:
            console.log( "Something went wrong clicking a markdown button!" );
    }
}

function getHashtags( clean = false ) {
    // Get hashtags from the input box
    var tagsInput = PUBLISHER.querySelector( "#tags" ),
        tags = tagsInput.value;

    // Make sure they are correct
    if ( tags ) {
        tags = tags.replace( /#|\s/g, "" )
            .replace( /^(.*)/, "#$1" )
            .split( "," )
            .join( " #" );

        // Clean up the box if requested
        if ( clean ) tagsInput.value = "";

        return tags;
    }

    return null;
}

function getPayload() {
    var content = EDITOR.value;

    // Create the payload object to send to the pod
    if ( content.trim().length > 0 ) {
        var aspectIds = [],
            payload = {},
            tags = getHashtags( true );

        if ( tags ) {
            content += "\n\n" + tags;
        }

        payload.status_message = {
            "text": content
        };

        Array.from( PUBLISHER.querySelectorAll( ".dropdown-menu > li.selected" ) )
            .forEach( e => aspectIds.push( e.getAttribute( "data-aspect_id" ) ) );

        payload.aspect_ids = aspectIds;

        return payload;
    }

    return null;
}

function updateDropdown( aspects, notify = false ) {
    var dropdownMenu = PUBLISHER.querySelector( ".dropdown-menu" ),
        divider,
        item;

    // Remove old items
    Array.from( dropdownMenu.querySelectorAll( "li" ) )
        .forEach( e => {
            if ( e.matches( ".selector" ) || e.matches( ".divider" ) ) {
                e.remove();
            }
        } );

    // Append divider and user aspects list
    divider = document.createElement( "li" );
    divider.classList.add( "divider" );
    dropdownMenu.appendChild( divider );
    aspects.forEach( ( item, i ) => {
        dropdownMenu.insertAdjacentHTML( "beforeend", '<li class="selector" data-aspect_id="' +
            item.id + '"><a><span class="fa fa-check"></span><span class="text">' +
            item.name + "</span></a></li>" );
    } );

    // Notify if update after downloading
    if ( notify ) {
        onSuccess( "Dropdown menu updated with your aspects." );
    }
}

function getClosest( element, selector ) {
    // Get the closest parent element
    // source: http://gomakethings.com/climbing-up-and-down-the-dom-tree-with-vanilla-javascript/
    for ( ; element && element !== document; element = element.parentNode ) {
        if ( element.matches( selector ) ) return element;
    }

    return null;
}

function toggleDropdown( event ) {
    var target = getClosest( event.target, "li" );

    // Toggle aspects dropdown & manage multiple selections
    if ( target && !target.matches( ".divider" ) ) {
        var dropdownMenu = event.currentTarget,
            button = dropdownMenu.previousElementSibling,
            icon = button.firstChild,
            text,
            selected;

        if ( target.matches( "li.radio" ) ) {
            Array.from( target.parentNode.querySelectorAll( "li" ) )
                .forEach( e => e.classList.remove( "selected" ) );
        } else if ( target.matches( "li.selector" ) ) {
            event.stopPropagation();
            Array.from( target.parentNode.querySelectorAll( "li.radio" ) )
                .forEach( e => e.classList.remove( "selected" ) );
        }

        target.classList.toggle( "selected" );

        selected = dropdownMenu.querySelectorAll( "li.selected" ).length;

        if ( selected === 0 ) {
            dropdownMenu.firstElementChild.classList.add( "selected" );
            text = "Public";
        } else {
            if ( selected === 1 ) {
                text = dropdownMenu.querySelector( "li.selected .text" ).textContent;
            } else {
                text = "in " + selected.toString() + " aspects";
            }
        }

        icon.nextElementSibling.textContent = text;

        if ( text === "Public" ) {
            icon.classList.remove( "fa-lock" );
            icon.classList.add( "fa-unlock" );
        } else {
            icon.classList.remove( "fa-unlock" );
            icon.classList.add( "fa-lock" );
        }
    }
}

function storeAspects( aspects ) {
    try {
        var aspectsObj = JSON.parse( aspects );

        // Remove useless items
        aspectsObj.forEach( ( item, i ) => {
            delete item.selected;
        } );

        // Store then update
        browser.storage.local.set( {
            aspects: aspectsObj
        } ).then( () => {
            updateDropdown( aspectsObj, true );
        } );
    } catch ( e ) {
        onError( "An error occurred while parsing the aspects list." );
    }
}

function send( diaspora, payload = null ) {
    // Send requests to the pod
    diaspora.retrieveToken()
        .then( response => {
            if ( response.error ) {
                throw response.error;
            }
            if ( payload ) {
                return diaspora.postMessage( response.token, payload )
                    .then( response => {
                        if ( response.error ) {
                            throw response.error;
                        }

                        onSuccess( response.success );
                    } );
            } else {
                return diaspora.retrieveAspects()
                    .then( response => {
                        if ( response.error ) {
                            throw response.error;
                        }

                        storeAspects( response.aspects );
                    } );
            }
        } )
        .catch( onError );
}

function init() {
    // Get all stored data
    var storedData = browser.storage.local.get();

    storedData.then( data => {
        // Check if all required settings are entered
        if ( !data.url || !data.username || !data.password ) {
            disableElements();

            onError( "Please enter all required settings before starting to share." );
        } else {
            // Initialize all publisher components

            // Instantiate the diaspora communication class
            var diaspora = new diasporaAjax( data.url, data.username, data.password );

            // Add click event listeners to buttons
            PUBLISHER.querySelector( ".md-buttons" ).addEventListener( "click", handleMarkdownButtons );
            PUBLISHER.querySelector( "#getAspects" ).addEventListener( "click", () => {
                onSending( "Getting aspects ..." );
                send( diaspora );
            } );
            PUBLISHER.querySelector( ".dropdown-menu" ).addEventListener( "click", toggleDropdown );
            PUBLISHER.querySelector( "#sendPost" ).addEventListener( "click", () => {
                var payload = getPayload();
                if ( payload && typeof payload === "object" ) {
                    onSending( "Sending the post ..." );
                    send( diaspora, payload );
                }
            } );

            // If storage contains the user aspects, update the dropdown
            if ( data.aspects ) {
                updateDropdown( data.aspects );
            }

            // Send a message to receive the content to include in the editor
            browser.runtime.sendMessage( "getContent" )
                .then( response => {
                    if ( response.content ) {
                        EDITOR.value = response.content;
                    }
                }, onError );
        }
    } );
}

init();
