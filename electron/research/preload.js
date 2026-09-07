const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('research', {
  list: () => ipcRenderer.invoke('research:list'),
  get: id => ipcRenderer.invoke('research:get', id),
  save: project => ipcRenderer.invoke('research:save', project),
  importRis: payload => ipcRenderer.invoke('research:importRis', payload),
  files: payload => ipcRenderer.invoke('research:files', payload),
});
