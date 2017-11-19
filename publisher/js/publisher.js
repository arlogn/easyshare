/*jshint esversion: 6 */

function onError(error) {
  console.log(`Error: ${error}`);
}

function onAjaxFailure(statusCode, action) {
  notify(`An error occurred while attempting to ${action}.`, "error");
  $("#send").text("Failure!");
  console.log(`${action}: error ${statusCode}`);
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
  const signInUrl = url + "/users/sign_in",
    tokenPatt = /<input[^>]* name="authenticity_token"[^>]* value="(.*)"/;

  let deferred = $.Deferred();

  $.get({
      url: signInUrl
    })
    .then(data => {
        let match = data.match(tokenPatt);
        if (match) {
          $.post({
              url: signInUrl,
              data: {
                "user[username]": username,
                "user[password]": password,
                "user[remember_me]": 1,
                "utf8": "✓",
                "authenticity_token": match[1]
              }
            })
            .then(data => {
                // Try to catch a login error before to get a 401 for invalid token
                if (/<body[^>]*page-sessions[^>]*>/i.test(data)) {
                  deferred.resolve({
                    error: "SignIn: invalid username or password."
                  });
                } else {
                  let match2 = data.match(tokenPatt);
                  deferred.resolve({
                    token: match2[1]
                  });
                }
              },
              error => {
                deferred.reject(error.status);
              });
        } else {
          deferred.resolve({
            error: "SignIn: authenticity token not found."
          });
        }
      },
      error => {
        deferred.reject(error.status);
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
          }, onError);
      } else {
        notify("User aspects not found.", "error");
      }
    })
    .fail(error => {
      onAjaxFailure(error.status, "get aspects");
    });
}

function diasporaPostStatusMessage(url, token, session) {
  let message = {},
    tags = $("#smtags").val();

  tags = tags.replace(/#|\s/g, "")
    .replace(/^(.*)/, "#$1")
    .split(",")
    .join(" #");

  message.status_message = {
    "text": $("#smtext").val() + "\n\n" + tags
  };
  message.aspect_ids = $(".selectpicker").val();

  $.ajax({
      url: url + "/status_messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, application/xhtml+xml",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-Token": token
      },
      data: JSON.stringify(message),
      statusCode: {
        200: function() {
          console.log("Status code: 200. Expected: 201");
        }
      }
    })
    .done((data, statusText, xhr) => {
      if (xhr.status === 201) {
        notify("Post successfully sent to diaspora.", "success");
      } else {
        // On error try again for once
        if (session < 2) {
          browser.storage.local.get(null)
            .then(data => {
              data.token = null;
              sendHttpRequests("post", data);
            }, onError);
        } else {
          onAjaxFailure(xhr.status, "send message");
        }
      }
    })
    .fail(error => {
      onAjaxFailure(error.status, "send message");
    })
    .always(() => {
      $("#send").prop("disabled", false).text("Send");
    });
}

function sendHttpRequests(req, data) {
  if (!data.token) {
    diasporaSignIn(data.url, data.username, data.password)
      .then(response => {
        if (response.error) {
          if (typeof response.error === "number") {
            onAjaxFailure(response.error, "sign in");
          } else {
            notify(response.error, "error");
          }
        } else {
          browser.storage.local.set({
              token: response.token,
              session: data.session + 1
            })
            .then(() => {
              if (req === "post") {
                diasporaPostStatusMessage(data.url, response.token, data.session);
              } else {
                diasporaGetAspects(data.url);
              }
            }, onError);
        }
      })
      .catch(error => {
        onAjaxFailure(error, "sign in");
      });
  } else {
    if (req === "post") {
      diasporaPostStatusMessage(data.url, data.token, data.session);
    } else {
      diasporaGetAspects(data.url);
    }
  }
}

function getDataAndSend(req) {
  browser.storage.local.get(null)
    .then(data => {
      sendHttpRequests(req, data);
    }, onError);
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
            getDataAndSend("get");
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
  size: false,
  width: "70px"
});

$("#send").click(function() {
  $(this).prop("disabled", true).text("wait...");
  getDataAndSend("post");
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
      notify("Please enter and save all required preferences before starting to share.", "error");
    } else {
      if (items.aspects) updateAspectsSelector(items.aspects);
    }
  }, onError);
