module.exports = db => {
    let FibosTokensAction = db.define('fibos_tokens_action', {
        contract_action: {
            required: true,
            index: true,
            type: "text"
        }
    });

    FibosTokensAction.hasOne('account_from', db.models.fibos_accounts);

    FibosTokensAction.hasOne('account_to', db.models.fibos_accounts);

    FibosTokensAction.hasOne('token_from', db.models.fibos_tokens, {
        key: true,
        reverse: "actions"
    });

    FibosTokensAction.hasOne('token_to', db.models.fibos_tokens, {
        key: true,
        reverse: "actions"
    });

    FibosTokensAction.hasOne('action', db.models.fibos_actions);

    return FibosTokensAction;
}