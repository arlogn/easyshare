/*jshint esversion: 6 */

const url = document.querySelector("#podUrl"),
      username = document.querySelector("#podUsername"),
      password = document.querySelector("#podPassword");

function onError(error) {
    console.log(error);
}

function storeSettings() {
    browser.storage.local.set({
        url: url.value,
        username: username.value,
        password: password.value
    });
}

function showSettings(stored) {
    url.value = stored.url || "";
    username.value = stored.username || "";
    password.value = stored.password || "";
}

var gettingStoredSettings = browser.storage.local.get();
gettingStoredSettings.then(showSettings, onError);

url.addEventListener("blur", storeSettings);
username.addEventListener("blur", storeSettings);
password.addEventListener("blur", storeSettings);
