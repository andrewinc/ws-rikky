const config = require('./config.json') //{DB:{host:'localhost', user:'root', password:'root', database:'ws_rikky'}, WS:{ssl_use:false, ssl:{key:'../ssl-cert/privkey.pem', cert:'../ssl-cert/fullchain.pem'}, host:'ws-rikky', port:1234}, BACKEND:{host:'ws-rikky', port:3210}}
const http = require('http')
const https = require('https')
const fs = require('fs')
const WebSocket = require('ws')
const mysql = require('mysql')
const con = mysql.createConnection(config.DB)
console.log(config)
const token = Symbol('token')
const user_id = Symbol('id')
//установка соединения с БД
con.connect(err=>{
    if (err) throw err
    console.log("Database connected")

    /** Поиск токена в таблице БД и возврат его ID через Promise
     * ```
     * getId('token2').then(id=>console.log('ID:',id), e=>console.error('Error', e)) // печать 'ID: 2'
     * ```
     * @param {string} token Ex.: 'token1'
     * @return {Promise} */
    const getId= async token => new Promise((resolve, reject) => {
        con.query("SELECT id FROM users WHERE token = ?", [token],(err, rows)=>{
            if (err) reject(err)
            if (1 != rows.length) reject(new Error('Not found token or have dublicate'))
            try {
                const row = rows[0]
                if (('id' in row) && row.id) resolve(row.id); else reject(new Error('Not found field or value is empty'))
            }catch (e) {
                reject(e)
            }
        })
    })

    /** Разобрать search строку в объект
     * ```
     * getUrlParams('') //{}
     * getUrlParams('/') //{}
     * getUrlParams('/?') //{}
     * getUrlParams('/?a') //{}
     * getUrlParams('/?a=') //{a:''}
     * getUrlParams('?a=') //{a:''}
     * getUrlParams('/?a=Hi') //{a:'Hi'}
     * getUrlParams('?a=Hi') //{a:'Hi'}
     * getUrlParams('/?a=Hi&b=12') //{a:"Hi", b:"12"}
     * getUrlParams("?title=VUE&action=edit&section=18") //{title:"VUE", action:"edit", section:"18"}
     * ```
     * @param {string} search строка типа location.search Ex.: '?title=VUE&action=edit&section=18'
     * @return {Object} Ex.: {title:"VUE", action:"edit", section:"18"} */
    const getUrlParams = search => {
        const params = {}
        const hashes = search.slice(search.indexOf('?') + 1).split('&')
        hashes.filter(hash=>hash.includes('=')).map(hash => {
            const [key, val] = hash.split('=')
            if ('' != key) {
                params[key] = decodeURIComponent(val)
            }
        })
        return params
    }

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

        //token
        let urlParams = getUrlParams(req.url) //'/' => {} '/?token=token1'=>{token:'token1'}
        wsBrowser[token] = urlParams.token
        getId(wsBrowser[token]).then(id=>wsBrowser[user_id] = id,e=>wsBrowser[user_id]=undefined)// вычислить по токену ID

        //приветсвие при коннекте
        if (wsBrowser[token]) wsBrowser.send(`Hi browser "${wsBrowser[token]}"!`); else wsBrowser.send(`Hi browser! Your not have token => not have messages`)
    })





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
                wss.clients.forEach(wsBrowser =>{

                    if (json.id == wsBrowser[user_id]){
                        wsBrowser.send(body) // отправляем сообщение только тому клиенту что найден по token\ID
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


})
