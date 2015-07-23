self.port.on("show", function (c) {
    document.getElementById("username").value = c.username;
    document.getElementById("password").value = c.password;
});

document.getElementById("save").addEventListener("click", function () {
    self.port.emit("save", { username: document.getElementById("username").value, password: document.getElementById("password").value });
});

document.getElementById("close").addEventListener("click", function () {
    self.port.emit("close");
});
