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
    let newestCode = req.body.newestCode;
    let queryStr = newestCode !==1 ? `select * from leaveMessage order by messageTime desc` : `select * from leaveMessage order by messageTime desc limit 0,5`;
    db.query(queryStr,function(err,rows) {
        if (err) {
            res.status(500).send({code: -1, message: '数据库操作异常'}).end();
        } else {
            if (rows.length > 0) {
                if (newestCode !== 1) {
                    let func = rows.map((item) => {
                        return new Promise(function(resolve,reject){
                            db.query(`select * from reply_table where messageId = ?;`,[item.id],function (err1,rowsItem) {
                                if (err1) {
                                    reject(err1);
                                    res.status(500).send({code: -1, message: '数据库操作异常'}).end();
                                } else {
                                    item.replyList = rowsItem;
                                    resolve(item);
                                }
                            })
                        })
                    })
                    Promise.all(func).then((response) => {
                        res.status(200).send({code:0,message:'success',data:response}).end();
                    })
                } else{
                    res.status(200).send({code: 0, message: 'success',data:rows}).end();
                }
            } else {
                res.status(200).send({code: 0, message: 'success',data:rows}).end();
            }
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
router.get('/getArticles',function (req,res,next) {
    let queryStr = req.query.typeCode ===1 ? `select * from pubArticle order by pubTime desc limit 0,10;`:`select * from pubArticle order by likeNum desc limit 0,5;`
    db.query(queryStr,function (err,rows) {
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
                        db.query(`select likeNum from pubArticle where id = ?;`,[articleId],function (err6,rows6) {
                            if (err6) {
                                console.log(err6,'6')
                                res.status(500).send({code:-1,message:'数据库操作异常'}).end();
                            } else {
                                let getLikeNum = rows6[0].likeNum ? rows6[0].likeNum + 1: 1;
                                db.query(`update pubArticle set likeNum = ? where id = ?;`,[getLikeNum,articleId],function (err5,rows) {
                                    if (err5) {
                                        console.log(err5,'5')
                                        res.status(500).send({code:-1,message:'数据库操作异常'}).end();
                                    } else {
                                        console.log('更新成功')
                                        res.status(200).send({code:0,message:'success'}).end();
                                    }
                                })
                            }
                        })
                    }
                })
            } else {
                db.query("insert into operate_table (`isLiked`,`userId`,`articleId`) values ?;",[_value],function (err,rows) {
                    if (err) {
                        console.log(err,'3')
                        res.status(500).send({code:-1,message:'数据库操作异常'}).end();
                    } else{
                        db.query(`update pubArticle set likeNum = likeNum +1  where id = ?;`,[articleId],function (err4,rows) {
                            if (err4) {
                                console.log(err4,'4')
                            } else {
                                res.status(200).send({code:0,message:'success'}).end();
                            }
                        })
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
// 获取基本数据
router.get('/basicData',function (req,res,next) {
    db.query(`select count(*) as likeNum from operate_table where isLiked =? union all select count(*) as collectNum from operate_table where isCollected =? union all select count(*) as userNum from userInfo union all select count(*) as messageNum from leaveMessage;`,[1,1],function(err,rows){
        if (err) {
            res.status(500).send({code: -1,message: '数据库操作异常'}).end();
        } else {
            let data = {};
            console.log(rows,'rows')
            data.likeNum = rows[0].likeNum;
            data.collectNum = rows[1].likeNum;
            data.userNum = rows[2].likeNum;
            data.messageNum = rows[3].likeNum;
            res.status(200).send({code: 0,message: 'success',data: data}).end();
        }
    })
});
// 获取收藏
router.get('/collectList',function (req,res,next) {
   let userId = req.query.userId;
   let isCollected = req.query.isCollected;
   console.log(userId,isCollected)
   db.query(`select articleId from operate_table where userId = ? and isCollected = ?;`,[userId,isCollected],function (err,rows) {
       if (err) {
           res.status(500).send({code: -1,message: '数据库操作异常'}).end();
       } else {
           if (rows.length > 0) {
               let func = rows.map((item) => {
                   return new Promise(function(resolve,reject){
                       db.query(`select * from pubArticle where id = ?;`,[item.articleId],function (err1,rowsItem) {
                           if (err1) {
                               reject(err1);
                               res.status(500).send({code: -1, message: '数据库操作异常'}).end();
                           } else {
                               resolve(rowsItem[0]);
                           }
                       })
                   })
               })
               Promise.all(func).then((response) => {
                   res.status(200).send({code:0,message:'success',data:response}).end();
               })
           } else {
               res.status(200).send({code:0,message:'success',data:response}).end();
           }
       }
    })
});
module.exports = router;

