/*jshint esversion: 6 */

const url = document.querySelector("#podUrl");
const username = document.querySelector("#podUsername");
const password = document.querySelector("#podPassword");
const themes = document.querySelectorAll("input[name='theme']");
const setPublic = document.querySelector("#setPublic");

function onError(error) {
    console.log(error);
}

function storeSettings() {
    const theme = document.querySelector("input[name='theme']:checked");

    browser.storage.local.set({
        url: url.value,
        username: username.value,
        password: password.value,
        theme: theme.value,
        defaultPublic: setPublic.checked
    });
}

function showSettings(data) {
    url.value = data.url || "";
    username.value = data.username || "";
    password.value = data.password || "";
    if (data.theme === "dark") {
        themes[0].checked = false;
        themes[1].checked = true;
    }
    if (data.defaultPublic) {
        setPublic.checked = true;
    }
}

const gettingStoredSettings = browser.storage.local.get();
gettingStoredSettings.then(showSettings, onError);

url.addEventListener("blur", storeSettings);
username.addEventListener("blur", storeSettings);
password.addEventListener("blur", storeSettings);
themes[0].addEventListener("click", storeSettings);
themes[1].addEventListener("click", storeSettings);
setPublic.addEventListener("click", storeSettings);