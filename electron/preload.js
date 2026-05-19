const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fallow', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  hermesChat: (prompt) => ipcRenderer.invoke('hermes:chat', prompt),

  // Store bridge
  storePath: () => ipcRenderer.invoke('store:path'),
  storeRead: () => ipcRenderer.invoke('store:read'),
  storeWrite: (data) => ipcRenderer.invoke('store:write', data),

  // Seeds
  listSeeds: () => ipcRenderer.invoke('store:listSeeds'),
  getSeed: (id) => ipcRenderer.invoke('store:getSeed', id),
  createSeed: (seed) => ipcRenderer.invoke('store:createSeed', seed),
  updateSeed: (id, patch) => ipcRenderer.invoke('store:updateSeed', id, patch),
  deleteSeed: (id) => ipcRenderer.invoke('store:deleteSeed', id),

  // Conditions
  listConditions: () => ipcRenderer.invoke('store:listConditions'),
  getCondition: (id) => ipcRenderer.invoke('store:getCondition', id),
  createCondition: (condition) => ipcRenderer.invoke('store:createCondition', condition),
  deleteCondition: (id) => ipcRenderer.invoke('store:deleteCondition', id),

  // Derived results
  getBranches: (seedId) => ipcRenderer.invoke('store:branches:get', seedId),
  setBranches: (seedId, results) => ipcRenderer.invoke('store:branches:set', seedId, results),
  getRoots: () => ipcRenderer.invoke('store:roots:get'),
  setRoots: (connections) => ipcRenderer.invoke('store:roots:set', connections),
  getConditionScan: (id) => ipcRenderer.invoke('store:conditionScan:get', id),
  setConditionScan: (id, results) => ipcRenderer.invoke('store:conditionScan:set', id, results),

  // File watcher event
  onStoreChanged: (callback) => ipcRenderer.on('store:changed', callback),
  offStoreChanged: (callback) => ipcRenderer.removeListener('store:changed', callback),
});
