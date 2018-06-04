/*jshint esversion: 6*/

class diasporaAjax {

    constructor( url, username, password ) {
        this.url = url;
        this.username = username;
        this.password = password;
    }

    request( options ) {
        return new Promise( ( resolve, reject ) => {

            var xhr = new XMLHttpRequest();

            xhr.open( options.method, options.url );

            xhr.onload = () => {
                if ( xhr.status >= 200 && xhr.status < 300 ) {
                    resolve( {
                        status: xhr.status,
                        data: xhr.response,
                        url: xhr.responseURL
                    } );
                } else {
                    reject( `Error. The server responded with a status of ${xhr.status} (${xhr.statusText}).` );
                }
            };

            xhr.onerror = () => {
                reject( "Network request failed." );
            };

            if ( options.credentials ) {
                xhr.withCredentials = true;
            }

            if ( options.headers ) {
                Object.keys( options.headers ).forEach( ( key ) => {
                    xhr.setRequestHeader( key, options.headers[ key ] );
                } );
            }

            var params = options.params || null;

            if ( params && typeof params === "object" ) {
                if ( options.json ) {
                    params = JSON.stringify( params );
                } else {
                    params = Object.keys( params ).map( ( key ) => {
                        return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
                    } ).join( "&" );
                }
            }

            xhr.send( params );
        } );
    }

    signIn( url, token ) {
        console.log( `Sign in to: ${this.url}` );

        return this.request( {
            method: "POST",
            url: url,
            params: {
                "user[username]": this.username,
                "user[password]": this.password,
                "user[remember_me]": 1,
                "utf8": "✓",
                "authenticity_token": token,
                "commit": "Sign in"
            },
            headers: {
                "Content-type": "application/x-www-form-urlencoded; charset=UTF-8"
            }
        } );
    }

    retrieveToken() {
        const url = `${this.url}/bookmarklet`,
            siUrl = `${this.url}/users/sign_in`,
            pattern = /<meta name="csrf-token" content="(.*)"/;

        return this.request( {
                method: "GET",
                url: url,
                credentials: true
            } )
            .then( response => {
                var match = response.data.match( pattern );

                if ( !match ) {
                    return {
                        error: "Fatal error, CSRF token not found."
                    };
                }

                // If we are redirected ...
                if ( response.url !== url ) {
                    return this.signIn( siUrl, match[ 1 ] )
                        .then( response => {
                            if ( response.url === siUrl ) {
                                return {
                                    error: "Authentication error."
                                };
                            }

                            match = response.data.match( pattern );

                            return {
                                token: match[ 1 ]
                            };
                        } );
                }

                return {
                    token: match[ 1 ]
                };
            } )
            .catch( error => {
                return {
                    error: error
                };
            } );
    }

    retrieveAspects() {
        const url = `${this.url}/bookmarklet`,
            pattern = /"aspects":(\[[^\]]+\])/;

        return this.request( {
                method: "GET",
                url: url
            } )
            .then( response => {
                var match = response.data.match( pattern );

                if ( !match ) {
                    return {
                        error: "Something went wrong, aspects list not found."
                    };
                }

                return {
                    aspects: match[ 1 ]
                };
            } )
            .catch( error => {
                return {
                    error: error
                };
            } );
    }

    postMessage( token, message ) {
        const url = `${this.url}/status_messages`;

        return this.request( {
                method: "POST",
                url: url,
                params: message,
                json: true,
                headers: {
                    "Content-Type": "application/json; charset=UTF-8",
                    "Accept": "application/json, application/xhtml+xml",
                    "X-CSRF-Token": token
                }
            } )
            .then( response => {
                if ( response.status !== 201 ) {
                    return {
                        error: "Unauthorized access. Probably incorrect or missing CSRF token."
                    };
                }

                return {
                    success: "Post successfully sent to your diaspora pod."
                };
            } )
            .catch( error => {
                return {
                    error: error
                };
            } );
    }

}