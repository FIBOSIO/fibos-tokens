let fibos_accounts = require('fibos-accounts');

let fs = require('fs');
global.save = (data) => {
    let t = new Date().getTime();
    console.notice(`save file ${t}.json`);
    fs.writeFileSync(`./${t}.json`, JSON.stringify(data))
}

module.exports = {
    defines: fibos_accounts.defines.concat(require('./defs')),
    hooks: {
        ...require('./hooks'),
        ...fibos_accounts.hooks
    }
}