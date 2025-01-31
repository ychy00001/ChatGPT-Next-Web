const express = require('express')
const next = require('next')
// const proxyMiddleware = require('http-proxy-middleware')
const { createProxyMiddleware } = require('http-proxy-middleware');


console.log("Server proxy url:" + process.env.API_URL)
const devProxy = {
  '/api': {
    target: process.env.API_URL, // 端口自己配置合适的
    pathRewrite: {
      '^/api': '/'
    },
    changeOrigin: true
  }
}
const port = parseInt(process.env.PORT, 10) || 3000
console.log("Server start with port :" + port)
const dev = process.env.NODE_ENV !== 'production'
const app = next({
  dev
})
const handle = app.getRequestHandler()

app.prepare()
  .then(() => {
    const server = express()

    if (devProxy) {
      Object.keys(devProxy).forEach(function (context) {
        server.use(createProxyMiddleware(context, devProxy[context]))
      })
    }

    server.all('*', (req, res) => {
      handle(req, res)
    })

    server.listen(port, err => {
      if (err) {
        throw err
      }
      console.log(`> Ready on http://localhost:${port}`)
    })
  })
  .catch(err => {
    console.log('An error occurred, unable to start the server')
    console.log(err)
  })