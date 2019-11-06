module.exports = db => {
    let FibosTokens = db.define('fibos_tokens', {
        token_name: {
            index: true,
            required: true,
            type: "text"
        },
        token_type: {
            type: "text",
            size: 24
        },
        token_status: {
            type: "text",
            size: 24
        },
        created: {
            type: "date",
            time: true
        }
    });

    FibosTokens.hasOne("creator", db.models.fibos_accounts, {
        key: true,
        reverse: "token"
    })

    return FibosTokens;
}