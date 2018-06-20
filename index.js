const app = require('express')();
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const server = http.createServer(app);
const jwt = require('jwt-simple');
const jwtSecret = require('./utils/utils').jwtSecret;
app.use(require('express').static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
const io = require('socket.io').listen(server);
let userCount = 0;
io.on('connection',function(socket) {
    userCount++;
    io.sockets.emit('setUser', userCount);
    socket.on('disconnect', function(){
        userCount--;
        console.log('USERLEAVE')
        io.sockets.emit('userLeave',userCount);
    })
    socket.on('sendMsg',function(data){
        io.sockets.emit('backMsg',data) // 发送信息给所有客户端 包括自己
    })
})
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type,Authorization");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
    // if (req.headers.authorization) {
    //     let Authorization = req.headers.authorization;
    //     let decodeJwt = jwt.decode(Authorization, jwtSecret)
    //     if (decodeJwt.expires <= Date.now()) {
    //         res.status(403).send({code: '1001', message: '登录已失效'}).end();
    //     } else {
    //         next();
    //     }
    // } else {
    //     if (req.url !=='/admin/login' && req.url !=='/web/login'&& req.url !=='/web/register') {
    //         res.status(403).send({code: '1001', message: '无效的请求'}).end();
    //     } else {
    //         next()
    //     }
    // }
});
app.use('/admin', require('./admin/index.js'));
app.use('/web', require('./web/index.js'));
server.listen(9999,() => {
    console.log('connet success')
})