/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Preferences.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "ShellService", "resource:///modules/ShellService.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "AddonManager", "resource://gre/modules/AddonManager.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "TelemetryArchive", "resource://gre/modules/TelemetryArchive.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "NormandyApi", "resource://shield-recipe-client/lib/NormandyApi.jsm");

const {generateUUID} = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator);

this.EXPORTED_SYMBOLS = ["ClientEnvironment"];

// Cached API request for client attributes that are determined by the Normandy
// service.
let _classifyRequest = null;

this.ClientEnvironment = {
  /**
   * Fetches information about the client that is calculated on the server,
   * like geolocation and the current time.
   *
   * The server request is made lazily and is cached for the entire browser
   * session.
   */
  getClientClassification: Task.async(function *() {
    if (!_classifyRequest) {
      _classifyRequest = NormandyApi.classifyClient();
    }
    return yield _classifyRequest;
  }),

  /**
   * Test wrapper that mocks the server request for classifying the client.
   * @param  {Object}   data          Fake server data to use
   * @param  {Function} testGenerator Test generator to execute while mock data is in effect.
   */
  withMockClassify(data, testGenerator) {
    return function* inner() {
      const oldRequest = _classifyRequest;
      _classifyRequest = Promise.resolve(data);
      yield testGenerator();
      _classifyRequest = oldRequest;
    };
  },

  /**
   * Create an object that provides general information about the client application.
   *
   * RecipeRunner.jsm uses this as part of the context for filter expressions,
   * so avoid adding non-getter functions as attributes, as filter expressions
   * cannot execute functions.
   *
   * Also note that, because filter expressions implicitly resolve promises, you
   * can add getter functions that return promises for async data.
   * @return {Object}
   */
  getEnvironment() {
    const environment = {};

    XPCOMUtils.defineLazyGetter(environment, "userId", () => {
      let id = Preferences.get("extensions.shield-recipe-client.user_id", "");
      if (!id) {
        // generateUUID adds leading and trailing "{" and "}". strip them off.
        id = generateUUID().toString().slice(1, -1);
        Preferences.set("extensions.shield-recipe-client.user_id", id);
      }
      return id;
    });

    XPCOMUtils.defineLazyGetter(environment, "country", () => {
      return ClientEnvironment.getClientClassification()
        .then(classification => classification.country);
    });

    XPCOMUtils.defineLazyGetter(environment, "request_time", () => {
      return ClientEnvironment.getClientClassification()
        .then(classification => classification.request_time);
    });

    XPCOMUtils.defineLazyGetter(environment, "distribution", () => {
      return Preferences.get("distribution.id", "default");
    });

    XPCOMUtils.defineLazyGetter(environment, "telemetry", Task.async(function *() {
      const pings = yield TelemetryArchive.promiseArchivedPingList();

      // get most recent ping per type
      const mostRecentPings = {};
      for (const ping of pings) {
        if (ping.type in mostRecentPings) {
          if (mostRecentPings[ping.type].timeStampCreated < ping.timeStampCreated) {
            mostRecentPings[ping.type] = ping;
          }
        } else {
          mostRecentPings[ping.type] = ping;
        }
      }

      const telemetry = {};
      for (const key in mostRecentPings) {
        const ping = mostRecentPings[key];
        telemetry[ping.type] = yield TelemetryArchive.promiseArchivedPingById(ping.id);
      }
      return telemetry;
    }));

    XPCOMUtils.defineLazyGetter(environment, "version", () => {
      return Services.appinfo.version;
    });

    XPCOMUtils.defineLazyGetter(environment, "channel", () => {
      return Services.appinfo.defaultUpdateChannel;
    });

    XPCOMUtils.defineLazyGetter(environment, "isDefaultBrowser", () => {
      return ShellService.isDefaultBrowser();
    });

    XPCOMUtils.defineLazyGetter(environment, "searchEngine", Task.async(function* () {
      const searchInitialized = yield new Promise(resolve => Services.search.init(resolve));
      if (Components.isSuccessCode(searchInitialized)) {
        return Services.search.defaultEngine.identifier;
      }
      return null;
    }));

    XPCOMUtils.defineLazyGetter(environment, "syncSetup", () => {
      return Preferences.isSet("services.sync.username");
    });

    XPCOMUtils.defineLazyGetter(environment, "syncDesktopDevices", () => {
      return Preferences.get("services.sync.clients.devices.desktop", 0);
    });

    XPCOMUtils.defineLazyGetter(environment, "syncMobileDevices", () => {
      return Preferences.get("services.sync.clients.devices.mobile", 0);
    });

    XPCOMUtils.defineLazyGetter(environment, "syncTotalDevices", () => {
      return Preferences.get("services.sync.numClients", 0);
    });

    XPCOMUtils.defineLazyGetter(environment, "plugins", Task.async(function* () {
      const plugins = yield AddonManager.getAddonsByTypes(["plugin"]);
      return plugins.reduce((pluginMap, plugin) => {
        pluginMap[plugin.name] = {
          name: plugin.name,
          description: plugin.description,
          version: plugin.version,
        };
        return pluginMap;
      }, {});
    }));

    XPCOMUtils.defineLazyGetter(environment, "locale", () => {
      return Cc["@mozilla.org/chrome/chrome-registry;1"]
        .getService(Ci.nsIXULChromeRegistry)
        .getSelectedLocale("browser");
    });

    XPCOMUtils.defineLazyGetter(environment, "doNotTrack", () => {
      return Preferences.get("privacy.donottrackheader.enabled", false);
    });

    return environment;
  },
};
