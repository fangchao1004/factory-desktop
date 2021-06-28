const { app, ipcMain, screen, Menu, BrowserWindow } = require('electron')
const path = require('path')
const { unlink, writeFile } = require('fs')
const os = require('os')
const { execFile, exec } = require('child_process')
const { randomBytes } = require('crypto')
let mainWindow, printWindow, printSender

function createWindow() {
  Menu.setApplicationMenu(null)
  mainWindow = new BrowserWindow({
    width: screen.getPrimaryDisplay().workAreaSize.width,
    height: screen.getPrimaryDisplay().workAreaSize.height,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'render.js'),
    }
  })
  let randomStr = new Date().getTime()
  let url = `http://60.174.196.158:12345?&str=${randomStr}`
  // mainWindow.loadURL('http://localhost:3000')///壳加载本地工厂项目
  // mainWindow.loadURL(url)///壳加载远程工厂项目
  // mainWindow.loadFile('index.html')
  // mainWindow.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.on('message', (event, arg) => {
  // console.log('arg壳:', arg);
  if (arg.content === 'printStart') { ///pc前端发送printStart 开始打印
    printSender = event.sender
    if (printSender) printSender.send('message', 'printStart')///反馈给pc前端 接下来第一次打印 直接请求print项目
    printWindow = new BrowserWindow({
      width: screen.getPrimaryDisplay().workAreaSize.width,
      height: screen.getPrimaryDisplay().workAreaSize.height,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: path.join(__dirname, 'render.js'),
        icon: './icon.ico'
      }
    })
    printWindow.on('closed', () => {
      printWindow = null
    })
    printWindow.webContents.openDevTools()
    let randomStr = new Date().getTime()
    let url = `http://60.174.196.158:12345/print/index.html?id=${arg.id}&print_num=${arg.print_num}&print_card=${arg.print_card}&str=${randomStr}`
    // let url = `http://localhost:3000?id=${arg.id}&print_num=${arg.print_num}&print_card=${arg.print_card}&str=${randomStr}`///结合ticket_print项目本地测试
    printWindow.loadURL(url) ///请求print项目触发pirnt项目的init
    console.log('请求地址：', url)
    // printWindow.hide()
  } else {
    if (arg.content === 'print') { ///接受到print返还的参数【经过一定程度的加工】 这些参数是如： { content: 'print', landscape: true, copies: 1, pageSize: 'A3' }
      console.log('print 参数:', arg)
      if (printWindow) {
        printWindow.webContents.print(
          {
            silent: true,
            printBackground: true,
            color: false,
            landscape: arg.landscape,
            copies: arg.copies,
            pageSize: arg.pageSize
          },
          (success, failureReason) => {
            console.log('callback:', { success, failureReason });
            if (success) {
              event.sender.send('message', 'printSuccess') ///向print 项目发送 printSuccess 事件
            } else {
              // 打印失败
              // printWindow.destroy()
              if (printSender) printSender.send('message', 'printError')
            }
          }
        )
      }
    } else if (arg.content === 'printEnd') {
      // 打印成功
      if (printWindow) printWindow.destroy()

      if (printSender) printSender.send('message', 'printSuccess')
    }
  }
})
