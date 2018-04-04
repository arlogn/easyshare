/*jshint esversion: 6*/

const $editor = $("#editor");

function onError(error) {
    $editor
        .val(error)
        .css("color", "red");

    console.log(error);
}

function onSuccess(message) {
    $editor
        .val(message)
        .data("markdown")
        .enableButtons("all");
}

function updateAspectsDropdown(aspects, notify = false) {
    $editor
        .data("markdown")
        .updateDropdown(aspects);

    if (notify) {
        onSuccess("Dropdown menu updated with your aspects.");
    }
}

function storeAspects(aspects) {
    try {
        let aspectsObj = JSON.parse(aspects);

        // Remove unnecessary items
        $.each(aspectsObj, (index, value) => {
            delete value.selected;
        });

        browser.storage.local.set({
            aspects: aspectsObj
        }).then(() => {
            updateAspectsDropdown(aspectsObj, true);
        });
    } catch (e) {
        onError("An error occurred while parsing the aspects list.");
    }
}

function init() {
    var diaspora = {},
        send = function (payload = null) {
            diaspora.retrieveToken()
                .then(response => {
                    if (response.error) {
                        throw response.error;
                    }
                    if (payload) {
                        return diaspora.postMessage(response.token, payload)
                            .then(response => {
                                if (response.error) {
                                    throw response.error;
                                }

                                onSuccess(response.success);
                            });
                    } else {
                        return diaspora.retrieveAspects()
                            .then(response => {
                                if (response.error) {
                                    throw response.error;
                                }

                                storeAspects(response.aspects);
                            });
                    }
                })
                .catch(onError);
        };

    $editor.markdown({
        fullscreen: [{
            enabled: false
        }],
        additionalButtons: [
            [{
                name: "groupCustom",
                data: [{
                        name: "getAspects",
                        toggle: false,
                        title: "Get your aspects",
                        icon: {
                            fa: "fa fa-arrow-down"
                        },
                        btnText: "Get aspects",
                        btnClass: "btn btn-primary",
                        btnType: "button",
                        callback: function (e) {
                            e.disableButtons("all");
                            e.setContent("Wait ...");
                            send();
                        }
                    },
                    {
                        name: "selectAspects",
                        toggle: true,
                        icon: "",
                        defaults: [{
                            button: [{
                                text: "All Aspects",
                                icon: "fa-lock"
                            }],
                            menu: [{
                                    id: "public",
                                    text: "Public",
                                    selected: false
                                },
                                {
                                    id: "all_aspects",
                                    text: "All aspects",
                                    selected: true
                            }]
                        }],
                        btnClass: "btn dropdown-toggle btn-dropdown",
                        btnType: "dropdown"
                    }
                ]
            }]
        ],
        addFooter: true,
        onSend: function (e) {
            var payload = e.getPostPayload();
            if (payload) {
                e.disableButtons("all");
                e.setContent("Wait ...");
                send(payload);
            }
        }
    });

    let storedData = browser.storage.local.get();

    storedData.then(data => {
        // Check if all required settings are entered
        if (!data.url || !data.username || !data.password) {
            $editor
                .data("markdown")
                .disableButtons("all");

            onError("Please enter all required settings before starting to share.");
        } else {
            if (data.aspects) {
                // Update the dropdown menu if the list of aspects is stored
                updateAspectsDropdown(data.aspects);
            }

            diaspora = new diasporaAjax(data.url, data.username, data.password);

            // Send a message to receive the content to be included in the editor
            browser.runtime.sendMessage("getContent")
                .then(response => {
                    if (response.content) {
                        $editor.val(response.content);
                    }
                }, onError);
        }
    });
}

init();
