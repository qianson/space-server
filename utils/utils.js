const jwtSecret = 'a_hyq!_&%$#gql1024';
const randomId = function () {
    // let _ARRSTR = 'abcdefghijklmnopqrstuvwxyzaABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';
    // let _ARR = _ARRSTR.split('').join(',');
    let _num = Math.random();
    return Number(_num.toString().substr(3,_num.length) + Date.now()).toString(36);
}
const requestIncepter = function (param) {
    
}
module.exports = {
    jwtSecret: jwtSecret,
    randomId: randomId
}