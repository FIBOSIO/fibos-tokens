let fibos_accounts = require('fibos-accounts');

module.exports = {
    defines: fibos_accounts.defines.concat(require('./defs')),
    hooks: {
        ...require('./hooks'),
        ...fibos_accounts.hooks
    }
}