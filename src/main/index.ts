import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpcHandlers, setMainWindow } from './ipc-handlers'

// Debug: log what electron module resolved to
console.log('[OPAAL DEBUG] process.type:', process.type)
console.log('[OPAAL DEBUG] process.versions.electron:', process.versions.electron)

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f0f14',
      symbolColor: '#e4e4ed',
      height: 40
    },
    backgroundColor: '#0f0f14',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  setMainWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools()
    }
  })

  // Window close guard: let renderer decide if close is ok when dirty
  mainWindow.on('close', (event) => {
    event.preventDefault()
    mainWindow.webContents.send('app:before-close')
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
