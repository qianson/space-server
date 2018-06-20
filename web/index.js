const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const mysql = require('mysql');
const app = express();
const jwt = require('jwt-simple');
const jwtSecret = require('../utils/utils').jwtSecret;
const randowId = require('../utils/utils').randomId;
app.set('jwtTokenSecret', jwtSecret);
let db = mysql.createPool({
    host: '47.94.104.7',
    user: 'root',
    password: 'Hyq!123456',
    database: 'articles',
    port: '3306'
});
// 注册
router.post('/register', function(req, res, next) {
    let password = req.body.password;
    let md5 = crypto.createHash('md5');
    let newPsd = md5.update(password).digest("hex");
    let userName = req.body.userName;
    let id = randowId();
    let _value = [[id,userName,newPsd,0]];
    db.query(`select * from userInfo where userName = ?`,[userName],function (err,rows) {
        if (err) {
            res.status(500).send({code:-1,message:'数据库操作异常'}).end();
        } else {
            if (rows.length > 0) {
                res.status(500).send({code:-1,message:'该用户名已被注册'}).end();
            } else {
                db.query("insert into userInfo (`userId`,`userName`,`password`,`auth`) values ?",[_value],function (err,rows) {
                    if (err) {
                        res.status(500).send({code:-1,message:'数据库操作异常'}).end();
                    } else {
                        res.status(200).send({code:0,message:'success'}).end();
                    }
                });
            }
        }
    });
});
// 留言
router.post('/leaveMessage',function (req,res,next) {
    let id = randowId();
    let userId = req.body.userId;
    let message = req.body.message;
    let messageTime = Date.now();
    let userName = req.body.userName;
    let _value = [[id,userId,message,messageTime,userName]];
    console.log(_value)
    db.query("insert into leaveMessage (`id`,`userId`,`leaveMessage`,`messageTime`,`userName`) values ?",[_value],function(err,row){
        if (err) {
            console.log(err)
            res.status(500).send({code: -1, message: '数据库操作异常'}).end();
        } else {
            res.status(200).send({code: 0, message: 'success'}).end();
        }
    })
});
// 留言列表
router.post('/leaveMessageList',function (req,res,next) {
    console.log(req.body);
    db.query(`select * from leaveMessage order by messageTime desc`,function(err,rows) {
        if (err) {
            res.status(500).send({code: -1, message: '数据库操作异常'}).end();
        } else {
            db.query(`select * from leaveMessage left join reply_table on(leaveMessage.id = reply_table.messageId)`,function (err1,rows1) {
                if(err1){
                    console.log(err1)
                } else {
                    console.log(rows1)
                }
            })
            res.status(200).send({code: 0, message: 'success',data:rows}).end();
        }
    })
});
// 回复
router.post('/replyMessage',function (req,res,next) {
    let id = randowId();
    let messageId = req.body.messageId;
    let leaveMessage = req.body.leaveMessage;
    let messageTime = Date.now();
    let userName = req.body.userName;
    let _value = [[id,messageId,leaveMessage,messageTime,userName]];
    db.query("insert into reply_table (`id`,`messageId`,`leaveMessage`,`messageTime`,`userName`) values ?",[_value],function(err,rows) {
        if (err) {
            console.log(err)
            res.status(500).send({code: -1, message: '数据库操作异常'}).end();
        } else {
            res.status(200).send({code: 0, message: 'success'}).end();
        }
    })
});
// 查看回复
module.exports = router

