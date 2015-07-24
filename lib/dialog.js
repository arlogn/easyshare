/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { open: openWindow } = require('sdk/window/helpers');
const { defer } = require('sdk/core/promise');
const { Worker } = require('sdk/content/worker');
const { getActiveTab, setTabURL } = require('sdk/tabs/utils');
const { when: unload } = require('sdk/system/unload');
const { on, off } = require('sdk/system/events');
const workers = new WeakMap();


function onWindowClose({subject: chromeWindow}) {
    let worker = workers.get(chromeWindow);

    if (worker) {
        worker.destroy();
        workers.delete(chromeWindow);
    }
}


function onUnload({target: {defaultView: window}}) {
    if (this !== window && !window.frameElement) {
        let worker = workers.get(this);

        if (worker)
            worker.detach();
    }
}


on('domwindowclosed', onWindowClose, true);
unload(() => off('domwindowclosed', onWindowClose));


function open(options={}) {
    let { promise, resolve } = defer();
    let { name, title, url, features, contentScriptFile } = options;

    openWindow("", {
        features: features || {}
    }).then(browser => {

        browser.addEventListener('unload', onUnload);

        browser.addEventListener('DOMContentLoaded', ({target}) => {
            let window = target.defaultView;

            if (browser !== window && !window.frameElement) {

                browser.document.title = title || target.title;

                if (contentScriptFile) {
                    let worker = Worker({
                        window: window,
                        contentScriptFile: contentScriptFile
                    });

                    workers.set(browser, worker);

                    resolve(worker);
                }
                else {
                    resolve(null);
                }
            }
        });

        setTabURL(getActiveTab(browser), url);

    }).then(null, console.error)

    return promise;
};

exports.open = open;
