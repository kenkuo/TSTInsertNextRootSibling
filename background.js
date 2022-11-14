'use strict';

const TST_ID = 'treestyletab@piro.sakura.ne.jp';
var oldTabId;

async function registerToTST() {
  try {
    const result = await browser.runtime.sendMessage(TST_ID, {
      type: 'register-self',

      name: browser.i18n.getMessage('TST insert new tab as next sibling'),
      icons: browser.runtime.getManifest().icons,

      listeningTypes: [
        'wait-for-shutdown',
        'new-tab-processed' 
        // ...
      ],

      permissions: [
        'tabs'
      ],

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

// Keep track of the previously active tab before new tab activates
browser.tabs.onActivated.addListener(handleActivated);
function handleActivated(activeInfo) {
  oldTabId = activeInfo.previousTabId
}

// On new tab, find the next sibling of the root tab of the active tab. Then move the tab before this tab
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
      }
      break;
  }
});

