const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const mysql = require('mysql');
const app = express();
const jwt = require('jwt-simple');
const jwtSecret = require('../utils/utils').jwtSecret;
const upload = require('../utils/upload');
const randowId = require('../utils/utils').randomId;
app.set('jwtTokenSecret', jwtSecret);
let db = mysql.createPool({
    host: '47.94.104.7',
    user: 'root',
    password: 'Hyq!123456',
    database: 'articles',
    port: '3306'
});
// 登录
router.post('/login', function(req, res, next) {
    let userName = req.body.userName
    let password = req.body.password;
    // const hash = crypto.createHmac('sha256', password)
    //     .update('I love cupcakes')
    //     .digest('hex');
    // console.log(hash)
    let md5 = crypto.createHash('md5');
    let newPsd = md5.update(password).digest("hex");
    db.query(`select * from userInfo where userName = ?`,[userName], function (err, rows) {
        if (err) {
            res.send('数据库操作异常');
        } else {
            if (rows.length === 0) {
                res.status(500).send({code: -1,message:'用户名不存在'}).end();
            } else {
                if (newPsd === rows[0].password) {
                    let expires = Date.now()+30*60*1000;
                    let Authorization = jwt.encode({
                        iss: rows[0].userId,
                        exp: expires
                    }, app.get('jwtTokenSecret'));
                    rows[0].Authorization = Authorization;
                    rows[0].expiresTime = expires;
                    delete rows[0].password;
                    res.status(200).send({code:0,message:'success', data: rows[0]}).end();
                } else {
                    res.status(500).send({code:-1,message:'密码错误'}).end();
                }
            }
        }
    })
});
// 退出登录
router.post('/loginOut', function (req, res, next) {
    let userId = req.body.userId;
    db.query(`select * from userInfo where userId = ?;`,[userId],function (err,rows) {
        if (err) {
            res.status(500).send({code:-1,message:'fail'}).end();
        } else {
            res.status(200).send({code:0,message:'success'}).end();
        }
    })
});
// 文件上传
router.post('/upload', function(req, res,next){
    upload(req, res, function (err) {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                res.status(500).send({code:-1,message: '文件太大'})
            } else {
                res.status(500).send({code:-1,message: '上传失败'})
            }
        } else {
            let thumbnailUrl = 'http://www.heyuqian.net/' + req.file.path;
            let type = req.file.mimetype.split('/')[0];
            if (type === 'image') {
                let _data = {
                    thumbnailUrl: thumbnailUrl
                }
                res.status(200).send({code:0,message:'上传成功',data: _data}).end();
            } else {
                let pubTime = Date.now();
                let id = randowId();
                let resourceUrl = thumbnailUrl;
                let mediaType = type==='video' ? 1:2;
                let format = req.file.mimetype.split('/')[1];
                let valueArr =[[id,mediaType,format,resourceUrl,pubTime]]
                console.log(valueArr)
                db.query("insert into media_table (`id`,`mediaType`,`format`,`resourceUrl`,`pubTime`) values ?",[valueArr],function (err,rows) {
                    if (err) {
                        res.status(500).send({code:-1,message:'数据库操作异常'});
                    } else{
                        res.status(200).send({code:0,message:'success'});
                    }
                })
            }

        }
    })
});
// 发布文章
router.post('/publish',function(req,res,next){
    let title = req.body.title;
    let summary = req.body.summary;
    let type = req.body.type;
    let recommand = req.body.recommand;
    let thumbnailUrl = req.body.thumbnailUrl;
    let content = req.body.content;
    let knowCode = req.body.knowCode;
    let creater = '何育骞';
    if (title&&summary&&type&&knowCode&&recommand&&thumbnailUrl&&content) {
        let id = randowId();
        let pubTime = Date.now();
        let valueArr = [[id,title,summary,type,knowCode,recommand,thumbnailUrl,content,pubTime,creater]];
        console.log(valueArr)
        db.query("INSERT INTO pubArticle (`id`,`title`,`summary`,`type`,`knowCode`,`recommand`,`thumbnailUrl`,`content`,`pubTime`,`creater`) VALUES ?",[valueArr],
            function (err, rows) {
            if (err) {
                console.log(err)
                res.status(200).send({code:-1,message:'数据库操作异常'}).end();
            } else{
                res.status(200).send({code:0,message:'success'}).end();
            }
        })
    } else {
        res.status(500).send({code: -1, message: '请求失败'}).end();
    }
});
// 获取文章列表
router.get('/articlesList', function (req, res, next) {
    let title = req.query.title;
    let konwCode = req.query.knowCode;
    let recommand = req.query.recommand;
    let pageSize = Number(req.query.pageSize);
    let currentPage = Number(req.query.currentPage);
    let offset = pageSize*(currentPage-1);
    console.log(currentPage,'偏移量'+offset)
    // where title regexp ? [title],
        db.query(`select * from pubArticle order by pubTime desc limit ${offset},${pageSize};`, function (err, rows) {
        if (err) {
            res.status(500).send({code:-1,message:'数据库操作异常'}).end();
        } else {
            db.query(`select count(*) from pubArticle;`,function(err,count){
                if (err) {
                    res.status(500).send({code:-1,message:'数据库操作异常'}).end();
                } else {
                    let total = count[0]['count(*)'];
                    res.status(200).send({code:0,data:{result:rows,total:total,pageSize:pageSize,currentPage:currentPage},message: 'success'});
                }
            });

        }
    })
});
// 删除文章
router.post('/deleteArticle',function(req,res,next) {
    let id = req.body.id;
    console.log(id);
    db.query(`delete from pubArticle where id = ?`,[id],function (err,rows) {
        if (err) {
            res.status(500).send({code:-1,message:'数据库操作异常'}).end();
        } else {
            res.status(200).send({code:0,message:'success'}).end();
        }
    })
});
// 编辑文章
router.post('/editArticle',function(req,res,next){
    let id = req.body.id;
    let title = req.body.title;
    let type = Number(req.body.type);
    let kownCode = Number(req.body.knowCode);
    let summary = req.body.summary;
    let recommand = req.body.recommand;
  db.query(`update pubArticle set title=?,type=?,knowCode=?,summary=?,recommand=? where id =?`,[title,type,kownCode,summary,recommand,id],function (err, rows) {
      console.log(err)
      if (err) {
          res.status(500).send({code: -1,message: '数据库操作失败'}).end();
      } else {
          res.status(200).send({code: 0,message: 'success'}).end();
      }
  })
});
// 获取用户列表
router.get('/userList',function (req,res,next) {
    console.log(req.query)
    let userName = req.query.userName;
    let currentPage = req.query.currentPage;
    let pageSize = req.query.pageSize;
    let offset = pageSize*(currentPage-1);
    db.query(`select * from userInfo limit ${offset},${pageSize};`,function (err,rows) {
        if (err) {
            res.status(500).send({code:-1,message:'数据库操作异常'}).end();
        } else {
            db.query(`select count(*) from userInfo`,function (err,count) {
                if (err) {
                    res.status(500).send({code:-1,message:'数据库操作异常'}).end();
                } else {
                    let total = count[0]['count(*)'];
                    res.status(200).send({code:0,data:{result:rows,total:total,pageSize:pageSize,currentPage:currentPage},message: 'success'});
                }
            })
        }
    })
});
// 删除用户
router.post('/deleteUser',function (req,res,next) {
    let userId = req.body.userId;
    console.log(req.body.userId);
    db.query(`delete from userInfo where userId =?;`,[userId],function(err){
        if(err){
            res.status(500).send({code:-1,message:'数据库操作异常'}).end();
        } else {
            res.status(200).send({code:0,message:'success'}).end();
        }
    })
});
// 音视频列表
router.get('/mediaList',function (req,res,next) {
    console.log(req.query,1231312313123312)
    let title = req.query.title;
    let type = req.query.type;
    let currentPage = req.query.currentPage;
    let pageSize = req.query.pageSize;
    let offset = pageSize*(currentPage-1);
    db.query(`select * from media_table limit ${offset},${pageSize};`,function (err,rows) {
        if (err) {
            res.status(500).send({code:-1,message:'数据库操作异常'}).end();
        } else {
            db.query(`select count(*) from userInfo`,function (err,count) {
                if (err) {
                    res.status(500).send({code:-1,message:'数据库操作异常'}).end();
                } else {
                    let total = count[0]['count(*)'];
                    res.status(200).send({code:0,data:{result:rows,total:total,pageSize:pageSize,currentPage:currentPage},message: 'success'});
                }
            })
        }
    })
});
// 删除音视频
router.post('/deleteMedia',function (req,res,next) {
let id = req.body.id;
console.log(id)
db.query(`delete from media_table where id =?;`,[id],function (err) {
    if (err) {
        res.status(500).send({code:-1,message:'数据库操作异常'}).end();
    } else {
        res.status(200).send({code:0,message:'success'}).end();
    }
})
});
module.exports = router