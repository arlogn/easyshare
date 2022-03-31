/*jshint esversion: 6 */

const url = document.querySelector("#podUrl");
const username = document.querySelector("#podUsername");
const password = document.querySelector("#podPassword");
const themes = document.querySelectorAll("input[name='theme']");

function onError(error) {
    console.log(error);
}

function storeSettings() {
    const theme = document.querySelector("input[name='theme']:checked");

    browser.storage.local.set({
        url: url.value,
        username: username.value,
        password: password.value,
        theme: theme.value
    });
}

function showSettings(stored) {
    url.value = stored.url || "";
    username.value = stored.username || "";
    password.value = stored.password || "";
    if (stored.theme === "dark") {
        themes[0].checked = false;
        themes[1].checked = true;
    }
}

const gettingStoredSettings = browser.storage.local.get();
gettingStoredSettings.then(showSettings, onError);

url.addEventListener("blur", storeSettings);
username.addEventListener("blur", storeSettings);
password.addEventListener("blur", storeSettings);
themes[0].addEventListener("click", storeSettings);
themes[1].addEventListener("click", storeSettings);