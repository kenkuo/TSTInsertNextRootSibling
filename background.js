/*
 This is a boilerplate to implement a helper addon for Tree Style Tab
 based on its API.
 https://github.com/piroor/treestyletab/wiki/API-for-other-addons
 license: The MIT License, Copyright (c) 2020 YUKI "Piro" Hiroshi
 original:
   http://github.com/piroor/treestyletab/blob/trunk/doc/boilerplate-helper-background.js
*/

'use strict';

const TST_ID = 'treestyletab@piro.sakura.ne.jp';
var oldTabId;

async function registerToTST() {
  try {
    const result = await browser.runtime.sendMessage(TST_ID, {
      type: 'register-self',

      // Basic information of your addon.
      name: browser.i18n.getMessage('TST insert as next sibling'),
      icons: browser.runtime.getManifest().icons,

      // The list of listening message types. (optional)
      // Available message types are listed at:
      // https://github.com/piroor/treestyletab/wiki/API-for-other-addons#notified-message-types
      listeningTypes: [
        'wait-for-shutdown',
        'try-handle-newtab',
        'tab-clicked',
        'new-tab-processed' // This is required to trigger teardown process for this addon on TST side.
        // ...
      ],

      // Extra style rules applied in the sidebar. (optional)
      style: `
      `,

      // Extra permissions to receive tab information via TST's API. (optional)
      // Available permissions are listed at:
      // https://github.com/piroor/treestyletab/wiki/API-for-other-addons#extra-permissions
      permissions: [
        'tabs'
      ],

      /*
      // Subpanel (optional)
      // https://github.com/piroor/treestyletab/wiki/SubPanel-API
      subPanel: {
        title: browser.i18n.getMessage('extensionName'),
        url:   `moz-extension://${location.host}/path/to/panel.html`
      },
      */
    });
    console.log("registered to TST")
  }
  catch (_error) {
    // TST is not available
  }
}
registerToTST();

async function uninitFeaturesForTST() {
  // Put codes to deactivate special features for TST here.
}
async function waitForTSTShutdown() {
  try {
    // https://github.com/piroor/treestyletab/wiki/API-for-other-addons#wait-for-shutdown-type-message
    await browser.runtime.sendMessage(TST_ID, { type: 'wait-for-shutdown' });
  } catch (error) {
    // Extension was disabled before message was sent:
    if (error.message.startsWith('Could not establish connection. Receiving end does not exist.'))
      return true;
    // Extension was disabled while we waited:
    if (error.message.startsWith('Message manager disconnected'))
      return true;
    // Probably an internal Tree Style Tab error:
    throw error;
  }
}

async function getTab(id) {
  let tab = await browser.runtime.sendMessage(TST_ID, {
    type: 'get-tree',
    tab: id
  });
}

waitForTSTShutdown().then(uninitFeaturesForTST);

browser.runtime.onMessageExternal.addListener(async (message, sender) => {
  switch (sender.id) {
    case TST_ID:
      console.log("rcv TST_ID message", message.type)
      switch (message.type) {
        case 'ready':
          registerToTST();
          break;
        case 'new-tab-processed':
          if ((message.restored == undefined || message.restored == false)
            && message.tab.ancestorTabIds.length == 0) {
            console.log("get-tree-oldTabId " + oldTabId)
            let rootTab = await browser.runtime.sendMessage(TST_ID, {
              type: 'get-tree',
              tab: 'root-of-' + oldTabId
            });
            console.log("rootTab: " + rootTab.id)
            let siblingTab = await browser.runtime.sendMessage(TST_ID, {
              type: 'get-tree',
              tab: 'nextSibling-of-' + rootTab.id
            });
            console.log("siblingtab: " + siblingTab.id)
            let success = await browser.runtime.sendMessage(TST_ID, {
              type: 'move-before',
              tab: message.tab.id,
              referenceTabId: siblingTab.id,
              followChildren: false
            });
            return;
          }
          return;
          break;
      }
      break;
  }
});


browser.tabs.onActivated.addListener(handleActivated);
function handleActivated(activeInfo) {
  oldTabId = activeInfo.previousTabId
}