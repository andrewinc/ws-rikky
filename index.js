const config = require('./config.json') //{DB:{host:'localhost', user:'root', password:'root', database:'ws_rikky'}, WS:{ssl_use:false, ssl:{key:'../ssl-cert/privkey.pem', cert:'../ssl-cert/fullchain.pem'}, host:'ws-rikky', port:1234}, BACKEND:{host:'ws-rikky', port:3210}}
const http = require('http')
const https = require('https')
const fs = require('fs')
const WebSocket = require('ws')
console.log(config)
const token = Symbol('token')

    //создание WebSocket-сервера поверх SSL или нет
    const wss = new WebSocket.Server(
        !config.WS.ssl_use ? {port: config.WS.port}
        : (()=>{
            const httpsServer = https.createServer({
                key: fs.readFileSync(config.WS.ssl.key, 'utf8'),
                cert: fs.readFileSync(config.WS.ssl.cert, 'utf8')
            })
            httpsServer.listen(config.WS.port)
            return {server: httpsServer}
        })()
    )
    console.log(`WebSocket listen ws${config.WS.ssl_use ?'s':''}://${config.WS.host}:${config.WS.port}`)


    wss.on('connection', (wsBrowser, req) => {
        wsBrowser.sendObj= obj =>{ try{wsBrowser.send(JSON.stringify(obj))}catch(e){ try{wsBrowser.close()}catch(e){}} }

        //приветсвие при коннекте
        wsBrowser.send(`Hi browser!`)
        wsBrowser.on('message', message=>{
            try{
              let msg = JSON.parse(message) // received JSON
              if (('setToken' == msg.cmd) && msg.data) {
                  wsBrowser[token] = msg.data
                  wsBrowser.send(`Accept token `+JSON.stringify(msg.data))
              }
            } catch (e) { //received TEXT

            }
        })
        wsBrowser.on('close', ()=>{console.log('client disconnected')})

    })

    wss.on('error', function(){
        console.log('Error:', arguments)
    })




    //Backend-server на которй отправляет запрос api
    const server = http.createServer((req, res) => {
        let body = ''
        req.on('data', data=>{
            body += data

            // Too much POST data, kill the connection!
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            if (body.length > 1e6)
                req.connection.destroy()
        })

        req.on('end', ()=>{
            //body = `{"id":2,"type":"t1","text":"Hi","link":"https://ya.ru"}`
            try{
                let json = JSON.parse(body) //получили POST запрос с ID клиента
                // console.log('POST HTTP request', json)
                wss.clients.forEach(wsBrowser =>{
                    if (wsBrowser[token] && (wsBrowser[token] == json.to)) {
                        wsBrowser.send(body) // отправляем сообщение только тому клиенту (или клентам) что найден по token
                    }
                })
            res.statusCode = 200

            res.setHeader('Content-Type', 'text/plain')
            res.end('Ok\n')
            }catch (e) {
                res.statusCode = 500
                res.end(e.message)
            }
        })


    })

    server.listen(config.BACKEND.port, config.BACKEND.host, () => {
        console.log(`BACKEND Server running at http://${config.BACKEND.host}:${config.BACKEND.port}/`)
    })


