const multer = require('multer');
let storage = multer.diskStorage({
    destination: function (req,file,cb) {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
            cb(null,'public/images')
        } else if (file.mimetype === 'video/mp4' || file.mimetype === 'video/x-ms-wmv') {
            cb(null,'public/video')
        } else if (file.mimetype === 'audio/mp3') {
            console.log('音频')
            cb(null,'public/audio')
        }

    },
    filename: function (req,file,cb) {
        const fileArr = file.originalname.split('.');
        cb(null, (Date.now()).toString(36) + '.' + fileArr[fileArr.length-1])
    }
})
let upload = multer({
        storage:storage,
        limits: {
            fileSize: 100*1024*1024
        }
}).single('file');
module.exports = upload