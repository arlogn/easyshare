/*jshint esversion: 8*/

class diasporaAjax {

    constructor(url, username, password) {
        this.url = url;
        this.username = username;
        this.password = password;
    }

    request(options) {
        return new Promise((resolve, reject) => {

            const xhr = new XMLHttpRequest();

            xhr.open(options.method, options.url);

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve({
                        status: xhr.status,
                        data: xhr.response,
                        url: xhr.responseURL
                    });
                } else {
                    reject(`Error. The server responded with a status of ${xhr.status} (${xhr.statusText}).`);
                }
            };

            xhr.onerror = () => {
                reject("Network request failed.");
            };

            if (options.credentials) {
                xhr.withCredentials = true;
            }

            if (options.headers) {
                Object.keys(options.headers).forEach((key) => {
                    xhr.setRequestHeader(key, options.headers[key]);
                });
            }

            let params = options.params || null;

            if (params && typeof params === "object") {
                params = options.json ? JSON.stringify(params) : Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
            }

            xhr.send(params);
        });
    }

    signIn(url, token) {
        console.log(`Sign in to: ${this.url}`);

        return this.request({
            method: "POST",
            url,
            params: {
                "user[username]": this.username,
                "user[password]": this.password,
                "user[remember_me]": 1,
                "utf8": "✓",
                "authenticity_token": token,
                "commit": "Sign in"
            },
            headers: {
                // "Content-type": "application/x-www-form-urlencoded; charset=UTF-8"
                "Content-type": "application/json; charset=UTF-8"
            }
        });
    }

    async retrieveToken() {
        const url = `${this.url}/bookmarklet`;
        const siUrl = `${this.url}/users/sign_in`;
        const pattern = /<meta name="csrf-token" content="(.*)"/;

        try {
            let match = await (await this.request({
                method: "GET",
                url,
                credentials: true
            })).data.match(pattern);

            if (!match) {
                return {
                    error: "Fatal error, CSRF token not found."
                };
            }

            if (match.url !== url) {
                const signin = await this.signIn(siUrl, match[1]);

                if (signin.url === siUrl) {
                    return {
                        error: "Authentication error."
                    };
                }

                match = signin.data.match(pattern);
                return {
                    token: match[1]
                };
            }

            return {
                token: match[1]
            };
        } catch (error) {
            return {
                error
            };
        }
    }

    async retrieveAspects() {
        const url = `${this.url}/bookmarklet`;
        const pattern = /"aspects":(\[[^\]]+\])/;

        try {
            const match = await (await this.request({
                method: "GET",
                url
            })).data.match(pattern);

            return match ? {
                aspects: match[1]
            } : {
                error: "Something went wrong, aspects list not found."
            };
        } catch (error) {
            return {
                error
            };
        }
    }

    async postMessage(token, message) {
        const url = `${this.url}/status_messages`;

        try {
            const response = await (await this.request({
                method: "POST",
                url,
                params: message,
                json: true,
                headers: {
                    "Content-Type": "application/json; charset=UTF-8",
                    "Accept": "application/json, application/xhtml+xml",
                    "X-CSRF-Token": token
                }
            })).response;
            
            return response.status !== 201 ? {
                error: "Unauthorized access. Probably incorrect or missing CSRF token."
            } : {
                success: "Post successfully sent to your diaspora pod."
            };
        } catch (error) {
            return {
                error
            };
        }
    }
}