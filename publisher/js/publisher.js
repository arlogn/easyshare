/*jshint esversion: 6 */

function onStorageError(error) {
  console.log(`Storage: ${error}`);
}

function onDiasporaError(error, action) {
  notify(`(${action}) ${error}`, "error");
  $("#send").prop("disabled", true).text("Failure!");
  console.log(`${action}: ${error}`);
}

function notify(message, icon) {
  const iconUrl = "icons/" + icon + ".png";
  browser.notifications.create({
    "type": "basic",
    "iconUrl": browser.extension.getURL(iconUrl),
    "title": "Publisher Everywhere",
    "message": message
  });
}

function updateAspectsSelector(aspects) {
  $(".selectpicker option:gt(1)").remove();
  $.each(aspects, (key, value) => {
    $(".selectpicker").append($("<option>", {
      value: value.id,
      text: value.name
    }));
  });
  $(".selectpicker").selectpicker("refresh");
}

function diasporaSignIn(url, username, password) {
  const tokenPattern = /<input[^>]* name="authenticity_token"[^>]* value="(.*)"/,
    failPattern = /<body[^>]*page-sessions[^>]*>/i;

  let deferred = $.Deferred();

  $.get({
      url: url + "/users/sign_in"
    })
    .then(data => {
        let match = data.match(tokenPattern);
        if (match) {
          $.post({
              url: url + "/users/sign_in",
              data: {
                "user[username]": username,
                "user[password]": password,
                "user[remember_me]": 1,
                "utf8": "✓",
                "authenticity_token": match[1]
              }
            })
            .then(data => {
                // Try to catch a login error
                if (failPattern.test(data)) {
                  deferred.resolve({
                    error: "Invalid username or password"
                  });
                } else {
                  match = data.match(tokenPattern);
                  deferred.resolve({
                    token: match[1]
                  });
                }
              },
              error => {
                deferred.reject(error.statusText);
              });
        } else {
          deferred.resolve({
            error: "Authenticity token not found"
          });
        }
      },
      error => {
        deferred.reject(error.statusText);
      });

  return deferred;
}

function diasporaGetAspects(url) {
  $.get({
      url: url + "/bookmarklet"
    })
    .done(data => {
      let match = data.match(/"aspects":(\[{.*}\]),"services/);
      if (match) {
        let userAspects = JSON.parse(match[1]);
        $.each(userAspects, (index, value) => {
          delete value.selected;
        });
        browser.storage.local.set({
            aspects: userAspects
          })
          .then(() => {
            updateAspectsSelector(userAspects);
            notify("Aspects selector updated", "success");
          });
      } else {
        onDiasporaError("Aspects not found", "GetAspects");
      }
    })
    .fail(error => {
      onDiasporaError(error.statusText, "GetAspects");
    });
}

function diasporaPostStatusMessage(url, token, session) {
  let message = {},
    tags = $("#smtags").val();

  if (tags) {
    tags = tags.replace(/#|\s/g, "")
      .replace(/^(.*)/, "#$1")
      .split(",")
      .join(" #");
    message.status_message = {
      "text": $("#smtext").val() + "\n\n" + tags
    };
  } else {
    message.status_message = {
      "text": $("#smtext").val()
    };
  }

  message.aspect_ids = $(".selectpicker").val();

  $.ajax({
      url: url + "/status_messages",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "application/json, application/xhtml+xml",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-Token": token
      },
      data: message
    })
    .done((data, statusText, xhr) => {
      if (xhr.status === 201) {
        if (session === 2) {
          browser.storage.local.set({
            session: 0
          });
        }
        notify("Post successfully sent to diaspora*", "success");
        $("#send").prop("disabled", false).text("Send");
      } else {
        // On error try again for once
        if (session < 2) {
          browser.storage.local.set({
            token: null
          })
          .then(sendRequestsToDiaspora("post message"));
        } else {
          let err = xhr.statusText;
          if (xhr.status === 200) err = "Unauthorized";
          onDiasporaError(err, "PostStatusMessage");
        }
      }
    })
    .fail(error => {
      onDiasporaError(xhr.statusText, "PostStatusMessage");
    });
}

function sendRequestsToDiaspora(req) {
  browser.storage.local.get(["url", "username", "password", "token", "session"])
    .then(items => {
      if (!items.token) {
        diasporaSignIn(items.url, items.username, items.password)
          .then(response => {
            if (response.error) {
              onDiasporaError(response.error, "SignIn");
            } else {
              browser.storage.local.set({
                  token: response.token,
                  session: items.session + 1
                })
                .then(() => {
                  if (req === "post message") {
                    diasporaPostStatusMessage(items.url, response.token, items.session);
                  } else {
                    diasporaGetAspects(items.url);
                  }
                });
            }
          },
          error => {
            onDiasporaError(error, "SignIn");
          });
      } else {
        if (req === "post message") {
          diasporaPostStatusMessage(items.url, items.token, items.session);
        } else {
          diasporaGetAspects(items.url);
        }
      }
    }, onStorageError);
}

// Custom buttons
$("#smtext").markdown({
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
          btnClass: "btn btn-primary btn-sm",
          btnType: "button",
          callback: function(editor) {
            editor.disableButtons("getAspects");
            sendRequestsToDiaspora("get aspects");
          }
        },
        {
          name: "selectAspects",
          toggle: false,
          title: "Share with:",
          icon: "",
          btnText: "",
          btnClass: "selectpicker btn-select",
          btnType: "select"
        }
      ]
    }]
  ]
});

$(".selectpicker").selectpicker({
  style: "btn-default btn-sm",
  iconBase: "font-awesome",
  tickIcon: "caret-down",
  size: false
});

$("#send").click(function() {
  $(this).prop("disabled", true).text("wait...");
  sendRequestsToDiaspora("post message");
});

var port = browser.runtime.connect({
  name: "from-publisher"
});
port.onMessage.addListener(msg => {
  $("#smtext").val(msg);
});

browser.storage.local.get(["url", "username", "password", "aspects"])
  .then(items => {
    if (!items.url || !items.username || !items.password) {
      notify("Please enter and save all required preferences before starting to share.", "warning");
    } else {
      if (items.aspects) updateAspectsSelector(items.aspects);
    }
  }, onStorageError);
