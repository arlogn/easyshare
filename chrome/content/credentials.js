"use strict";

const loginManager = Components.classes["@mozilla.org/login-manager;1"]
                           .getService(Components.interfaces.nsILoginManager);

var realm = "Pod credentials for Easyshare";
var host = "addon:jid1-gqfeTXcouyVkpg@jetpack";

function $ (id) {
    return document.getElementById(id);
}

var credentials = {

    init: function () {
        let credentials = loginManager.findLogins({}, host, null, realm);
        credentials.forEach((credential) => {
            if (Object.keys(credential).length > 0) {
                $("username").value = credential.username;
                $("password").value = credential.password;
            }
        });
    },

    save: function () {
        let username = $("username").value,
            password = $("password").value;

        var nsLoginInfo = new Components.Constructor(
            "@mozilla.org/login-manager/loginInfo;1",
            Components.interfaces.nsILoginInfo, "init");

        let new_credentials = new nsLoginInfo(host, null, realm, username, password, "", "");
        let old_credentials = loginManager.findLogins({}, host, null, realm);

        if (old_credentials.length > 0)
            loginManager.modifyLogin(old_credentials[0], new_credentials);
        else
            loginManager.addLogin(new_credentials);

        window.close();
    }

};
