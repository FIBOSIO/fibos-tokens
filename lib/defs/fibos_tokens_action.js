module.exports = db => {
    let FibosTokensAction = db.define('fibos_tokens_action', {
        account_from_name: {
            index: true,
            required: true,
            size: 12,
            type: "text"
        },
        account_to_name: {
            index: true,
            type: "text",
            size: 12
        },
        token_from_name: {
            required: true,
            type: "text",
            size: 24
        },
        token_to_name: {
            type: "text",
            size: 24
        },
        contract_action: {
            required: true,
            index: true,
            type: "text"
        },
        global_sequence: {
            index: true,
            required: true,
            type: "text"
        }
    });

    FibosTokensAction.hasOne('account_from', db.models.fibos_accounts);

    FibosTokensAction.hasOne('account_to', db.models.fibos_accounts);

    FibosTokensAction.hasOne('token_from', db.models.fibos_tokens);

    FibosTokensAction.hasOne('token_to', db.models.fibos_tokens);

    FibosTokensAction.hasOne('transaction', db.models.fibos_transactions)

    return FibosTokensAction;
}