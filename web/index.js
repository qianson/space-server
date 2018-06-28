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
// 个人推荐
router.get('/recommand',function (req,res,next) {
    let recommand = [1]
    db.query(`select id,title,summary,content,pubTime,recommand,thumbnailUrl,creater from pubArticle where recommand = ? order by pubTime desc limit 0,6;;`,[recommand],function (err,rows) {
        if (err) {
            console.log(err)
            res.status(500).send({code: -1,message: '数据库操作异常'}).end();
        } else {
            res.status(200).send({code: 0,message: 'success',data: rows}).end();
        }
    })
});
// 最新文章
router.get('/newestArticles',function (req,res,next) {
    db.query(`select * from pubArticle order by pubTime desc limit 0,10;`,function (err,rows) {
        if (err) {
            console.log(err)
            res.status(500).send({code: -1,message: '数据库操作异常'}).end();
        } else {
            if (rows.length > 0){
              let selPromise =  rows.map((item) => {
                   return  new Promise(function(resolve,reject){
                       db.query(`SELECT COUNT(1) as likeNum FROM operate_table WHERE isLiked = ? and articleId = ? union all SELECT COUNT(1) as collectNum FROM operate_table WHERE isCollected = ? and articleId = ?;`,[1,item.id,1,item.id],function (err,rowsItem) {
                           if (err) {
                               reject(err)
                               res.status(500).send({code:-1,message:'数据库操作异常'}).end();
                           } else {
                               item.isLikedNum = rowsItem[0].likeNum;
                               item.isCollectedNum = rowsItem[1].likeNum;
                               console.log(rowsItem[1],'rowsItem')
                               resolve(item)
                           }
                       })
                   })
                })
                Promise.all(selPromise).then(response => {
                    res.status(200).send({code: 0,message: 'success',data: response}).end();
                })
            } else {
                res.status(200).send({code: 0,message: 'success',data: rows}).end();
            }
        }
    })
});
// 详情
router.get('/articleDetail',function (req,res,next) {
    let ip = req.connection.remoteAddress;
    console.log(ip)
    let id = req.query.id;
    let userId = req.query.userId;
    db.query(`select * from pubArticle where id = ?;`,[[id]],function (err,rows) {
        if (err) {
            res.status(500).send({code:-1,message:'数据库操作异常'}).end();
        } else {
            let result = null;
            let num_func =  rows.map((item) => {
                return  new Promise(function(resolve,reject){
                    db.query(`SELECT COUNT(1) as likeNum FROM operate_table WHERE isLiked = ? and articleId = ? union all SELECT COUNT(1) as collectNum FROM operate_table WHERE isCollected = ? and articleId = ?;`,[1,item.id,1,item.id],function (err,rowsItemPro) {
                        if (err) {
                            reject(err)
                            res.status(500).send({code:-1,message:'数据库操作异常'}).end();
                        } else {
                            item.isLikedNum = rowsItemPro[0].likeNum?rowsItemPro[0].likeNum:0;
                            item.isCollectedNum = rowsItemPro[1].likeNum?rowsItemPro[1].likeNum:0;
                            console.log(rowsItemPro[1],'rowsItemPro')
                            resolve(item)
                        }
                    })
                })
            })
            db.query(`select isCollected,isLiked from operate_table where userId =? and articleId=?;`,[userId,rows[0].id],function (err,rowsItem) {
                if (err) {
                    res.status(500).send({code:-1,message:'数据库操作异常'}).end();
                } else {
                    if (!rowsItem[0]) {
                        rows[0].isLiked = 0;
                        rows[0].isCollected = 0;
                    } else {
                        rows[0].isLiked = rowsItem[0].isLiked;
                        rows[0].isCollected = rowsItem[0].isCollected;
                    }
                    Promise.all(num_func).then(response => {
                        res.status(200).send({code:0,message:'success',data:response[0]}).end();
                    })
                }
            })
        }
    })
});
// 喜欢
router.get('/articleLike',function (req,res,next) {
    let isLiked = req.query.isLiked;
    let userId = req.query.userId;
    let articleId = req.query.articleId;
    let _value = [[isLiked,userId,articleId]];
    db.query(`select userId,articleId from operate_table where userId =? and articleId=?;`,[userId,articleId],function (err,rows) {
        if (err) {
            console.log(err,'1')
            res.status(500).send({code:-1,message:'数据库操作异常'}).end();
        } else {
            if (rows.length > 0) {
                db.query(`update operate_table set isLiked = ? where userId =? and articleId=?;`,[isLiked,userId,articleId],function (err,rows) {
                    if (err) {
                        console.log(err,'2')
                        res.status(500).send({code:-1,message:'数据库操作异常'}).end();
                    } else {
                        res.status(200).send({code:0,message:'success'}).end();
                    }
                })
            } else {
                db.query("insert into operate_table (`isLiked`,`userId`,`articleId`) values ?;",[_value],function (err,rows) {
                    if (err) {
                        console.log(err,'3')
                        res.status(500).send({code:-1,message:'数据库操作异常'}).end();
                    } else{
                        res.status(200).send({code:0,message:'success'}).end();
                    }
                })
            }
        }
    })
});
// 收藏
router.get('/articleCollect',function (req,res,next) {
    let isCollected = req.query.isCollected;
    let userId = req.query.userId;
    let articleId = req.query.articleId;
    let _value = [[isCollected,userId,articleId]];
    db.query(`select userId,articleId from operate_table where userId =? and articleId=?;`,[userId,articleId],function (err,rows) {
        if (err) {
            console.log(err,'1')
            res.status(500).send({code:-1,message:'数据库操作异常'}).end();
        } else {
            if (rows.length > 0) {
                db.query(`update operate_table set isCollected = ? where userId =? and articleId=?;`,[isCollected,userId,articleId],function (err,rows) {
                    if (err) {
                        console.log(err,'2')
                        res.status(500).send({code:-1,message:'数据库操作异常'}).end();
                    } else {
                        res.status(200).send({code:0,message:'success'}).end();
                    }
                })
            } else {
                db.query("insert into operate_table (`isCollected`,`userId`,`articleId`) values ?;",[_value],function (err,rows) {
                    if (err) {
                        console.log(err,'3')
                        res.status(500).send({code:-1,message:'数据库操作异常'}).end();
                    } else{
                        res.status(200).send({code:0,message:'success'}).end();
                    }
                })
            }
        }
    })
});
module.exports = router

