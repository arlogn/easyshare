/*jshint esversion: 6 */

const url = document.querySelector("#podUrl");
const username = document.querySelector("#podUsername");
const password = document.querySelector("#podPassword");
const register = document.querySelector("#register");
const authorize = document.querySelector("#authorize");
const themes = document.querySelectorAll("input[name='theme']");
const setPublic = document.querySelector("#setPublic");
const isRegistered = document.querySelector(".isRegistered");
const tokenValidity = document.querySelector(".isTokenValid");
const refresh = document.querySelector("#refreshStatus");

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

function checkTokenValidity(createdAt) {
    if (!createdAt) {
        return "addon unregistered";
    }
    // p42:ignore-next-statement
    const validity = 86400000;
    const now = Date.now();
    if ((now - createdAt) > validity) {
        return "token expired";
    }
    const diff = validity - (now - createdAt);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    return `token expires in: ${hours} hour(s) and ${minutes} minute(s)`;
}

function refreshStatus(status) {
    if (status.clientId) {
        isRegistered.textContent = "true";
    } else {
        isRegistered.textContent = "false";
    }
    tokenValidity.textContent = checkTokenValidity(status.createdAt);
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
    const status = ({clientId, createdAt} = data, {clientId, createdAt});
    refreshStatus(status);
}

const gettingStoredSettings = browser.storage.local.get();
gettingStoredSettings.then(showSettings, onError);

url.addEventListener("blur", storeSettings);
username.addEventListener("blur", storeSettings);
password.addEventListener("blur", storeSettings);
themes[0].addEventListener("click", storeSettings);
themes[1].addEventListener("click", storeSettings);
setPublic.addEventListener("click", storeSettings);

register.addEventListener("click", () => {
    let backgroundPage = browser.extension.getBackgroundPage();
    backgroundPage.registerClient(url.value);
});

authorize.addEventListener("click", () => {
    let backgroundPage = browser.extension.getBackgroundPage();
    browser.storage.local.get("clientId")
        .then(response => {
            backgroundPage.authorizeClient(url.value, response.clientId);
        })
        .catch(onError);
});

refresh.addEventListener("click", () => {
    const gettingStatus = browser.storage.local.get(["clientId", "createdAt"]);
    gettingStatus.then(refreshStatus, onError);
});
