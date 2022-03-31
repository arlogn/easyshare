/*jshint esversion: 6*/

const PUBLISHER = document.querySelector(".publisher");
const EDITOR = PUBLISHER.querySelector("#editor");

let isPreview = false;

function onError(error) {
    EDITOR.value = error;
    EDITOR.style.color = "#f00";

    console.log(error);
}

function onSuccess(message) {
    enableElements("all");
    EDITOR.value = message;
}

function onRun(message) {
    disableElements("all");
    EDITOR.value = message;
}

function enableElements(id) {
    if (id === "all") {
        Array.from(PUBLISHER.querySelectorAll(".btn"))
            .forEach(e => e.removeAttribute("disabled"));
        PUBLISHER.querySelector("#tags").removeAttribute("disabled");
    } else {
        PUBLISHER.querySelector(id).removeAttribute("disabled");
    }
}

function disableElements() {
    Array.from(PUBLISHER.querySelectorAll(".btn"))
        .forEach(e => e.setAttribute("disabled", "disabled"));
    PUBLISHER.querySelector("#tags").setAttribute("disabled", "disabled");
}

// Parse the content for preview
function parseContent() {
    const tags = getHashtags();
    const md = window.markdownit({
        breaks: true,
        linkify: true
    }).use(window.markdownitHashtag);
    let content = EDITOR.value;

    if (tags) {
        content += `\n\n${tags}\n`;
    }

    content = toMarkdown(content);

    return md.render(content);
}

function showPreview() {
    const footer = PUBLISHER.querySelector(".footer");
    const preview = document.createElement("div");
    let content;

    preview.classList.add("preview");

    if (isPreview === false) {
        isPreview = true;
        disableElements();
        enableElements("#postPreview");
        content = parseContent();
        preview.innerHTML = content;
        PUBLISHER.insertBefore(preview, footer);

        preview.style.width = `${EDITOR.offsetWidth}px`;
        preview.style.height = `${EDITOR.offsetHeight}px`;

        EDITOR.style.display = "none";
    }
}

function hidePreview() {
    isPreview = false;
    PUBLISHER.querySelector(".preview").remove();
    enableElements("all");
    EDITOR.style.display = "";
}

function getSelection() {
    const len = EDITOR.selectionEnd - EDITOR.selectionStart;

    return {
        start: EDITOR.selectionStart,
        end: EDITOR.selectionEnd,
        length: len,
        text: EDITOR.value.substr(EDITOR.selectionStart, len)
    };
}

function setSelection(start, end) {
    EDITOR.selectionStart = start;
    EDITOR.selectionEnd = end;
}

function replaceSelection(text) {
    EDITOR.value = EDITOR.value.substr(0, EDITOR.selectionStart) +
        text + EDITOR.value.substr(EDITOR.selectionEnd, EDITOR.value.length);
    EDITOR.selectionStart = EDITOR.value.length;
}

// Add the Bold syntax
function addMdBold() {
    const selected = getSelection();
    const content = EDITOR.value;
    const chunk = selected.length === 0 ? "strong text" : selected.text;
    let cursor;

    if (content.substr(selected.start - 2, 2) === "**" &&
        content.substr(selected.end, 2) === "**") {
        setSelection(selected.start - 2, selected.end + 2);
        replaceSelection(chunk);
        cursor = selected.start - 2;
    } else {
        replaceSelection(`**${chunk}**`);
        cursor = selected.start + 2;
    }

    setSelection(cursor, cursor + chunk.length);
}

// Add the Italic syntax
function addMdItalic() {
    const selected = getSelection();
    const content = EDITOR.value;
    const chunk = selected.length === 0 ? "emphasized text" : selected.text;
    let cursor;

    if (content.substr(selected.start - 1, 1) === "_" &&
        content.substr(selected.end, 1) === "_") {
        setSelection(selected.start - 1, selected.end + 1);
        replaceSelection(chunk);
        cursor = selected.start - 1;
    } else {
        replaceSelection(`_${chunk}_`);
        cursor = selected.start + 1;
    }

    setSelection(cursor, cursor + chunk.length);
}

// Add the Heading syntax
function addMdHeading() {
    const selected = getSelection();
    const chunk = selected.length === 0 ? "heading text" : `${selected.text}\n`;
    const content = EDITOR.value;
    let cursor;
    let pointer;
    let prevChar;

    if ((pointer = 4, content.substr(selected.start - pointer, pointer) === "### ") ||
        (pointer = 3, content.substr(selected.start - pointer, pointer) === "###")) {
        setSelection(selected.start - pointer, selected.end);
        replaceSelection(chunk);
        cursor = selected.start - pointer;
    } else if (selected.start > 0 &&
        (prevChar = content.substr(selected.start - 1, 1), !!prevChar && prevChar != "\n")) {
        replaceSelection(`\n\n### ${chunk}`);
        cursor = selected.start + 6;
    } else {
        replaceSelection(`### ${chunk}`);
        cursor = selected.start + 4;
    }

    setSelection(cursor, cursor + chunk.length);
}

// Add the Link syntax
function addMdLink() {
    const selected = getSelection();
    const chunk = selected.length === 0 ? "enter link description here" : selected.text;
    let cursor;

    replaceSelection(`[${chunk}](enter hyperlink here)`);
    cursor = selected.start + 1;
    setSelection(cursor, cursor + chunk.length);
}

// Add the Image syntax
function addMdImage() {
    const selected = getSelection();
    const chunk = selected.length === 0 ? "enter image description here" : selected.text;
    let cursor;

    replaceSelection(`![${chunk}](enter image hyperlink here "enter image title here")`);
    cursor = selected.start + 2;
    setSelection(cursor, cursor + chunk.length);
}

// Add the Unordered List syntax
function addMdUnorderedList() {
    const selected = getSelection();
    let chunk;
    let cursor;

    if (selected.length === 0) {
        chunk = "list text here";
        replaceSelection(`- ${chunk}`);
        cursor = selected.start + 2;
    } else if (selected.text.indexOf("\n") < 0) {
        chunk = selected.text;
        replaceSelection(`- ${chunk}`);
        cursor = selected.start + 2;
    } else {
        let list = [];

        list = selected.text.split("\n");
        chunk = list[0];

        list.forEach((item, i) => {
            list[i] = `- ${item}`;
        });

        replaceSelection(`\n\n${list.join("\n")}`);
        cursor = selected.start + 4;
    }

    setSelection(cursor, cursor + chunk.length);
}

// Add the Ordered List syntax
function addMdOrderedList() {
    const selected = getSelection();
    let chunk;
    let cursor;

    if (selected.length === 0) {
        chunk = "list text here";
        replaceSelection(`1. ${chunk}`);
        cursor = selected.start + 3;
    } else if (selected.text.indexOf("\n") < 0) {
        chunk = selected.text;
        replaceSelection(`1. ${chunk}`);
        cursor = selected.start + 3;
    } else {
        let n = 1;
        let list = [];

        list = selected.text.split("\n");
        chunk = list[0];

        list.forEach((item, i) => {
            list[i] = `${n}. ${item}`;
            n++;
        });

        replaceSelection(`\n\n${list.join("\n")}`);
        cursor = selected.start + 5;
    }

    setSelection(cursor, cursor + chunk.length);
}

// Add the Code syntax
function addMdCode() {
    const selected = getSelection();
    const content = EDITOR.value;
    const chunk = selected.length === 0 ? "code text here" : selected.text;
    let cursor;

    if (content.substr(selected.start - 4, 4) === "```\n" &&
        content.substr(selected.end, 4) === "\n```") {
        setSelection(selected.start - 4, selected.end + 4);
        replaceSelection(chunk);
        cursor = selected.start - 4;
    } else if (content.substr(selected.start - 1, 1) === "`" &&
        content.substr(selected.end, 1) === "`") {
        setSelection(selected.start - 1, selected.end + 1);
        replaceSelection(chunk);
        cursor = selected.start - 1;
    } else if (chunk.includes("\n")) {
        replaceSelection(`\`\`\`\n${chunk}\n\`\`\``);
        cursor = selected.start + 4;
    } else {
        replaceSelection(`\`${chunk}\``);
        cursor = selected.start + 1;
    }

    setSelection(cursor, cursor + chunk.length);
}

// Add the Quote syntax
function addMdQuote() {
    const selected = getSelection();
    let chunk;
    let cursor;

    if (selected.length === 0) {
        chunk = "quote here";
        replaceSelection(`> ${chunk}`);
        cursor = selected.start + 2;
    } else if (selected.text.indexOf("\n") < 0) {
        chunk = selected.text;
        replaceSelection(`> ${chunk}`);
        cursor = selected.start + 2;
    } else {
        let list = [];

        list = selected.text.split("\n");
        chunk = list[0];

        list.forEach((item, i) => {
            list[i] = `> ${item}`;
        });

        replaceSelection(`\n\n${list.join("\n")}`);
        cursor = selected.start + 4;
    }

    setSelection(cursor, cursor + chunk.length);
}

// Add markdown syntax
function addMarkdown(event) {
    EDITOR.focus();
    const addMd = {
        "mdBold": addMdBold,
        "mdItalic": addMdItalic,
        "mdHeading": addMdHeading,
        "mdLink": addMdLink,
        "mdImage": addMdImage,
        "mdUlist": addMdUnorderedList,
        "mdOlist": addMdOrderedList,
        "mdCode": addMdCode,
        "mdQuote": addMdQuote,
        "error": function () {
            console.log("Markdown button error!");
        }
    };

    (addMd[event.target.id] || addMd.error)();
}

// Manage entered hashtags
function getHashtags(clean = false) {
    const tagsInput = PUBLISHER.querySelector("#tags");
    let tags = tagsInput.value;

    // Make sure they are correct
    if (tags) {
        tags = tags.replace(/#|\s/g, "")
            .replace(/^(.*)/, "#$1")
            .split(",")
            .join(" #");

        // Clean up if requested
        if (clean) tagsInput.value = "";

        return tags;
    }

    return null;
}

// Create the payload object
function getPayload() {
    let content = EDITOR.value;

    if (content.trim().length > 0) {
        const tags = getHashtags(true);
        const aspectIds = [];
        const payload = {};

        if (tags) {
            content += `\n\n${tags}`;
        }

        payload.status_message = content;

        Array.from(PUBLISHER.querySelectorAll(".dropdown-menu > li.selected"))
            .forEach(e => aspectIds.push(e.getAttribute("data-aspect_id")));

        // 'all_aspects' value isn't accepted, we have to push all aspects IDs
        if (aspectIds.includes("all_aspects")) {
            let aspectId;
            Array.from(PUBLISHER.querySelectorAll(".dropdown-menu > li"))
                .forEach(e => {
                    aspectId = e.getAttribute("data-aspect_id");
                    if (!isNaN(aspectId)) aspectIds.push(aspectId);
                });
            aspectIds.shift();
        }

        payload.aspect_ids = aspectIds;

        return payload;
    }

    return null;
}

// Set default aspect selector
function setDefaultSelector(option) {
    const def = PUBLISHER.querySelector(".dropdown-toggle > .btn-text");
    const pub = PUBLISHER.querySelector("li[data-aspect_id='public']");
    const all = PUBLISHER.querySelector("li[data-aspect_id='all_aspects']");

    if (option.defaultPublic) {
        all.classList.remove("selected");
        pub.classList.add("selected");
        def.textContent = "Public";
    } else {
        pub.classList.remove("selected");
        all.classList.add("selected");
        def.textContent = "All Aspects";
    }
}

// Update the dropdown items
function updateDropdown(aspects, notify = false) {
    const pub = browser.storage.local.get("defaultPublic");
    pub.then(data => {
        setDefaultSelector(data);
    }, onError);

    if (!aspects) return;

    const dropdownMenu = PUBLISHER.querySelector(".dropdown-menu");

    // Remove old items
    Array.from(dropdownMenu.querySelectorAll("li"))
        .forEach(e => {
            if (e.matches(".selector") || e.matches(".divider")) {
                e.remove();
            }
        });

    const divider = document.createElement("li");
    divider.classList.add("divider");
    dropdownMenu.appendChild(divider);
    aspects.forEach((item, i) => {
        dropdownMenu.insertAdjacentHTML("beforeend", '<li class="selector" data-aspect_id="' +
            item.id + '"><a><span class="fa fa-check"></span><span class="text">' +
            item.name + "</span></a></li>");
    });

    // Notify when manually update
    if (notify) {
        onSuccess("Dropdown menu updated with your aspects.");
    }
}

// Manage the aspects dropdown
function toggleDropdown(event) {
    const target = event.target.closest("li");

    if (target && !target.matches(".divider")) {
        const dropdownMenu = event.currentTarget;
        const button = dropdownMenu.previousElementSibling;
        const icon = button.firstChild;
        let text;
        let selected;

        if (target.matches("li.radio")) {
            Array.from(target.parentNode.querySelectorAll("li"))
                .forEach(e => e.classList.remove("selected"));
        } else if (target.matches("li.selector")) {
            event.stopPropagation();
            Array.from(target.parentNode.querySelectorAll("li.radio"))
                .forEach(e => e.classList.remove("selected"));
        }

        target.classList.toggle("selected");

        selected = dropdownMenu.querySelectorAll("li.selected").length;

        if (selected === 0) {
            dropdownMenu.firstElementChild.classList.add("selected");
            text = "Public";
        } else {
            text = selected === 1 ? dropdownMenu.querySelector("li.selected .text").textContent : `in ${selected.toString()} aspects`;
        }

        icon.nextElementSibling.textContent = text;

        if (text === "Public") {
            icon.classList.remove("fa-lock");
            icon.classList.add("fa-unlock");
        } else {
            icon.classList.remove("fa-unlock");
            icon.classList.add("fa-lock");
        }
    }
}

// Store aspects
function storeAspects(aspects) {
    try {
        const aspectsObj = JSON.parse(aspects);

        // Remove useless items
        aspectsObj.forEach((item, i) => {
            delete item.selected;
        });

        browser.storage.local.set({
            aspects: aspectsObj
        }).then(() => {
            updateDropdown(aspectsObj, true);
        });
    } catch (e) {
        onError("An error occurred while parsing the aspects list.");
    }
}

// Send requests to the pod
function send(request, payload = null) {
    request.retrieveToken()
        .then(response => {
            if (response.error) {
                throw response.error;
            }
            return payload ? request.postMessage(response.token, payload)
            .then(response => {
                if (response.error) {
                    throw response.error;
                }

                onSuccess(response.success);
            }) : request.retrieveAspects()
            .then(response => {
                if (response.error) {
                    throw response.error;
                }

                storeAspects(response.aspects);
            });
        })
        .catch(onError);
}

function init() {
    // Get all data
    const storedData = browser.storage.local.get();

    storedData.then(data => {
        // Check if all required data are entered
        if (!data.url || !data.username || !data.password) {
            disableElements();

            onError("Please enter all required settings before starting to share.");
            return;
        }
        // Instantiate the communication class
        const request = new diasporaAjax(data.url, data.username, data.password);

        // Register event handlers
        PUBLISHER.querySelector(".md-buttons").addEventListener("click", addMarkdown);
        PUBLISHER.querySelector("#postPreview").addEventListener("click", () => {
            if (isPreview === false) {
                showPreview();
            } else {
                hidePreview();
            }
        });
        PUBLISHER.querySelector("#getAspects").addEventListener("click", () => {
            onRun("Getting aspects ...");
            send(request);
        });
        PUBLISHER.querySelector(".dropdown-menu").addEventListener("click", toggleDropdown);
        PUBLISHER.querySelector("#saveData").addEventListener("click", () => {
            if (EDITOR.value) {
                browser.storage.local.set({
                    persistent: EDITOR.value
                }).then(() => {
                    EDITOR.value = "Content saved. Alt+Shift+D to delete it.";
                }, onError);
            } else {
                EDITOR.value = "Nothing to save!";
            }
        });
        PUBLISHER.querySelector("#sendPost").addEventListener("click", () => {
            const payload = getPayload();
            if (payload && typeof payload === "object") {
                if (payload.aspect_ids.length === 0) {
                    onError("Please get your aspects before sharing!");
                } else {
                    onRun("Sending the post ...");
                    send(request, payload);
                    browser.storage.local.set({
                        persistent: ""
                    });
                }
            } else {
                onError("Unexpected error. The payload is undefined or malformed!");
            }
        });

        // Update the aspects dropdown
        if (data.aspects) {
            updateDropdown(data.aspects);
        } else {
            updateDropdown(false);
        }

        // Get and show the content
        browser.runtime.sendMessage("getContent")
        .then(response => {
            if (response.content) {
                EDITOR.value = response.content;
            }
        }, onError);
    });
}

init();
