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

    async getAspects(token) {
        const url = `${this.url}/api/v1/aspects`;

        try {
            const aspects = await this.request({
                method: "GET",
                url,
                headers: {
                    "Content-Type": "application/json; charset=UTF-8",
                    "Accept": "application/json, application/xhtml+xml",
                    "Authorization": `Bearer ${token}`
                }
            });
            return {
                aspects
            };
        } catch (error) {
            return {
                error
            };
        }
    }

    async postMessage(token, data) {
        const url = `${this.url}/api/v1/posts`;
        let isPublic = false;

        if (data.aspect_ids.includes("public")) {
            data.aspect_ids = [];
            isPublic = true;
        }

        try {
            const response = await this.request({
                method: "POST",
                url,
                params: {
                    body: data.status_message,
                    public: isPublic,
                    aspects: data.aspect_ids
                },
                json: true,
                headers: {
                    "Content-Type": "application/json; charset=UTF-8",
                    "Accept": "application/json, application/xhtml+xml",
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.status !== 200) {
                return {
                    error: `Something went wrong, response status is ${response.status}`
                };
            }

            return {
                success: "Post successfully sent to your diaspora pod."
            };
        } catch (error) {
            return {
                error
            };
        }
    }
}