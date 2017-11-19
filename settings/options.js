/*jshint esversion: 6 */

function onError(error) {
  console.log(`Error: ${error}`);
}

function saveOptions(e) {
  e.preventDefault();
  browser.storage.local.set({
    url: document.querySelector("#podUrl").value,
    username: document.querySelector("#podUsername").value,
    password: document.querySelector("#podPassword").value,
    token: null,
    session: 0
  })
  .then(null, onError);
}

function restoreOptions() {
  function restoreUrl(result) {
    document.querySelector("#podUrl").value = result.url || "";
  }

  function restoreUsername(result) {
    document.querySelector("#podUsername").value = result.username || "";
  }

  function restorePassword(result) {
    document.querySelector("#podPassword").value = result.password || "";
  }

  var url = browser.storage.local.get("url");
  url.then(restoreUrl, onError);

  var username = browser.storage.local.get("username");
  username.then(restoreUsername, onError);

  var password = browser.storage.local.get("password");
  password.then(restorePassword, onError);

}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
