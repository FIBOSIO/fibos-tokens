let ex_assert = (quantity) => {
    return {
        quantity: quantity.quantity.split(" ")[0],
        symbol: quantity.quantity.split(" ")[1],
        contract: quantity.contract
    }
}

let saveUniswaps = (m, db) => {
    if (!checkExist(m, db)) return;
    let data = m.act.data;
    let owner = data.owner;

    let contract_action = m.act.account + "/" + m.act.name;
    let token_from_name, token_to_name;
    if (contract_action == "eosio.token/addreserves") {
        let tx = ex_assert(data.tokenx);
        let ty = ex_assert(data.tokeny);
        token_from_name = tx.symbol + "@" + tx.contract;
        token_to_name = ty.symbol + "@" + ty.contract;
    } else if (contract_action == "eosio.token/outreceipt") {
        let tx = ex_assert(data.x);
        let ty = ex_assert(data.y);
        token_from_name = tx.symbol + "@" + tx.contract;
        token_to_name = ty.symbol + "@" + ty.contract;
    } else {
        token_from_name = data.x.sym.split(",")[1] + "@" + data.x.contract;
        token_to_name = data.y.sym.split(",")[1] + "@" + data.y.contract;
    }

    let account = db.models.fibos_accounts.oneSync({
        name: owner
    })

    let token_ids = [token_from_name, token_to_name].map(t => {
        let token = db.models.fibos_tokens.oneSync({ token_name: t });
        return token.id;
    })

    let action = db.models.fibos_actions.oneSync({
        trx_id: m.trx_id,
        global_sequence: m.receipt.global_sequence
    })

    db.models.fibos_tokens_action.createSync({
        account_from_name: owner,
        token_from_name: token_from_name,
        token_to_name: token_to_name,
        contract_action: m.act.account + "/" + m.act.name,
        token_from_id: token_ids[0],
        token_to_id: token_ids[1],
        account_from_id: account.id,
        action_id: action.id,
        global_sequence: m.receipt.global_sequence
    })
}

let checkExist = (m, db) => {
    if (!m.receipt.global_sequence) return

    let t = db.models.fibos_tokens_action.oneSync({
        global_sequence: m.receipt.global_sequence
    })

    if (t) {
        console.error("trx_id: %s global_sequence: %s has exist", m.trx_id, m.receipt.global_sequence);
        return false;
    }

    return true;
}

module.exports = {
    "eosio.token/create": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;

            let data = m.act.data;

            let issuer = data.issuer;
            let token_name = data.maximum_supply.split(' ')[1] + "@" + issuer;

            let FibosTokens = db.models.fibos_tokens;

            let token = FibosTokens.oneSync({ token_name: token_name });
            if (token && (token.created > m.block_time)) return;

            let account = db.models.fibos_accounts.oneSync({
                name: issuer
            });

            let account_id = account ? account.id : 0;

            if (token) {
                token.saveSync({
                    token_status: "tradition",
                    created: m.block_time
                })
            } else {
                token = FibosTokens.createSync({
                    token_status: "on",
                    token_name: token_name,
                    token_type: "tradition",
                    created: m.block_time,
                    account_id: account_id
                })
            }

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            });

            db.models.fibos_tokens_action.createSync({
                token_from_name: token_name,
                account_from_name: issuer,
                contract_action: m.act.account + "/" + m.act.name,
                token_from_id: token.id,
                account_from_id: account_id,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/issue": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;
            let data = m.act.data;

            let from = m.act.authorization[0].actor;
            let to = data.to;
            let token_name = data.quantity.split(" ")[1] + "@eosio";

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            })

            let account_ids = [from, to].map(a => {
                let account = db.models.fibos_accounts.oneSync({ name: a });
                return account ? account.id : 0;
            })

            db.models.fibos_tokens_action.createSync({
                token_from_name: token_name,
                account_from_name: from,
                account_to_name: to,
                contract_action: m.act.account + "/" + m.act.name,
                token_from_id: token.id,
                account_from_id: account_ids[0],
                account_to_id: account_ids[1],
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/retire": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;
            if (!!m.parent) return;

            let data = m.act.data;

            let from = data.from;
            let token_name = data.quantity.split(" ")[1] + "@eosio";


            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            });

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let account = db.models.fibos_accounts.oneSync({ name: from });

            db.models.fibos_tokens_action.createSync({
                account_from_name: from,
                account_from_id: account.id,
                token_from_name: token_name,
                token_from_id: token.id,
                contract_action: m.act.account + "/" + m.act.name,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/close": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;
            let data = m.act.data;

            let owner = data.owner;
            let token_name = data.symbol.split(',')[1] + "@eosio";

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            });

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let account = db.models.fibos_accounts.oneSync({ name: owner });

            db.models.fibos_tokens_action.createSync({
                account_from_name: owner,
                account_from_id: account.id,
                token_from_name: token_name,
                token_from_id: token.id,
                contract_action: m.act.account + "/" + m.act.name,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/excreate": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;
            let data = m.act.data;

            let issuer = data.issuer;
            let cw = data.connector_weight;
            let token_name = data.maximum_supply.split(' ')[1] + "@" + issuer;

            let FibosTokens = db.models.fibos_tokens;
            let token = FibosTokens.oneSync({ token_name: token_name });

            if (token && (token.created > m.block_time)) return;

            let account = db.models.fibos_accounts.oneSync({
                name: issuer
            });

            let account_id = account ? account.id : 0;
            let token_type = (cw > 0) ? "smart" : "tradition";

            if (token) {
                token.saveSync({
                    created: m.block_time,
                    token_status: "on",
                    token_type: token_type,
                })
            } else {
                token = FibosTokens.createSync({
                    token_status: "on",
                    token_name: token_name,
                    token_type: token_type,
                    created: m.block_time,
                    account_id: account_id
                })
            }

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            db.models.fibos_tokens_action.createSync({
                token_from_name: token_name,
                account_from_name: issuer,
                token_from_id: token.id,
                account_from_id: account_id,
                contract_action: m.act.account + "/" + m.act.name,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/exdestroy": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;
            let data = m.act.data;

            let issuer = data.symbol.contract;
            let token_name = data.symbol.sym.split(",")[1] + "@" + issuer;

            let FibosTokens = db.models.fibos_tokens;

            let token = FibosTokens.oneSync({
                token_name: token_name
            });

            let account = db.models.fibos_accounts.oneSync({ name: issuer });
            let account_id = account ? account.id : 0;

            if (!token) {
                token = FibosTokens.createSync({
                    token_status: "off",
                    token_name: token_name,
                    token_type: "tradition",
                    created: m.block_time,
                    account_id: account_id
                })
            } else if (token.token_status !== 'off') {
                token.saveSync({ token_status: "off" });
            }

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            db.models.fibos_tokens_action.createSync({
                account_from_name: issuer,
                account_from_id: account_id,
                token_from_name: token_name,
                token_id: token.id,
                contract_action: m.act.account + "/" + m.act.name,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/exclose": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;
            let data = m.act.data;

            let owner = data.owner;
            let token_name = data.symbol.sym.split(',')[1] + "@" + data.symbol.contract;

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            });

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let account = db.models.fibos_accounts.oneSync({ name: owner });

            db.models.fibos_tokens_action.createSync({
                account_from_name: owner,
                account_from_id: account.id,
                token_from_name: token_name,
                token_from_id: token.id,
                contract_action: m.act.account + "/" + m.act.name,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/exissue": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;
            let data = m.act.data;

            let from = m.act.authorization[0].actor;
            let to = data.to;

            let t = ex_assert(data.quantity);
            let token_name = t.symbol + "@" + t.contract;

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            });

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let account_ids = [from, to].map(a => {
                let account = db.models.fibos_accounts.oneSync({ name: a });
                return account ? account.id : 0;
            })


            db.models.fibos_tokens_action.createSync({
                token_from_name: token_name,
                account_from_name: from,
                account_to_name: to,
                contract_action: m.act.account + "/" + m.act.name,
                token_from_id: token.id,
                account_from_id: account_ids[0],
                account_to_id: account_ids[1],
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/exretire": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;

            let data = m.act.data;

            let from = data.from;

            let t = ex_assert(data.quantity);

            let token_name = t.symbol + "@" + t.contract;

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            });

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let account = db.models.fibos_accounts.oneSync({ name: from });
            db.models.fibos_tokens_action.createSync({
                account_from_name: from,
                account_from_id: account ? account.id : 0,
                token_from_name: token_name,
                token_from_id: token.id,
                contract_action: m.act.account + "/" + m.act.name,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/exshare": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;
            let data = m.act.data;

            let account_name = m.act.authorization[0].actor;

            let f = ex_assert(data.quantity);
            let token_from_name = f.symbol + "@" + f.contract;

            let token_to_name = data.tosym.sym.split(",")[1] + "@" + data.tosym.contract;

            let token_ids = [token_from_name, token_to_name].map(t => {
                let token = db.models.fibos_tokens.oneSync({ token_name: t });
                return token.id;
            });

            let account = db.models.fibos_accounts.oneSync({ name: account });

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            db.models.fibos_tokens_action.createSync({
                account_from_name: account_name,
                account_from_id: account.id,
                token_from_name: token_from_name,
                token_from_id: token_ids[0],
                token_to_name: token_to_name,
                token_to_id: token_ids[1],
                contract_action: m.act.account + "/" + m.act.name,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })

        })
    },
    "eosio.token/transfer": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;

            let data = m.act.data;
            let from = data.from;
            let to = data.to;
            let token_name = data.quantity.split(" ")[1] + "@" + "eosio";

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            })

            let account_ids = [from, to].map(a => {
                let account = db.models.fibos_accounts.oneSync({ name: a });
                return account ? account.id : 0;
            })

            db.models.fibos_tokens_action.createSync({
                token_from_name: token_name,
                account_from_name: from,
                account_to_name: to,
                contract_action: m.act.account + "/" + m.act.name,
                token_from_id: token.id,
                account_from_id: account_ids[0],
                account_to_id: account_ids[1],
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/extransfer": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;

            let data = m.act.data;
            let from = data.from;
            let to = data.to;

            let t = ex_assert(data.quantity);
            let token_name = t.symbol + "@" + t.contract;

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            })

            let account_ids = [from, to].map(a => {
                let account = db.models.fibos_accounts.oneSync({ name: a });
                return account ? account.id : 0;
            })

            db.models.fibos_tokens_action.createSync({
                token_from_name: token_name,
                account_from_name: from,
                account_to_name: to,
                contract_action: m.act.account + "/" + m.act.name,
                token_from_id: token.id,
                account_from_id: account_ids[0],
                account_to_id: account_ids[1],
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/ctxrecharge": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;

            let data = m.act.data;
            let owner = data.owner;

            let t = ex_assert(data.quantity);
            let token_name = t.symbol + "@" + t.contract;

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            });

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let account = db.models.fibos_accounts.oneSync({ name: owner });

            db.models.fibos_tokens_action.createSync({
                account_from_name: owner,
                token_from_name: token_name,
                contract_action: m.act.account + "/" + m.act.name,
                account_from_id: account.id,
                token_from_id: token.id,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/ctxextract": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;
            let data = m.act.data;

            let owner = data.owner;
            let t = ex_assert(data.quantity);
            let token_name = t.symbol + "@" + t.contract;

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            });

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let account = db.models.fibos_accounts.oneSync({ name: owner });

            db.models.fibos_tokens_action.createSync({
                account_from_name: owner,
                token_from_name: token_name,
                contract_action: m.act.account + "/" + m.act.name,
                account_from_id: account.id,
                token_from_id: token.id,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/ctxtransfer": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;

            let data = m.act.data;
            let from = data.from;
            let to = data.to;

            let t = ex_assert(data.quantity);
            let token_name = t.symbol + "@" + t.contract;

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            })

            let account_ids = [from, to].map(a => {
                let account = db.models.fibos_accounts.oneSync({ name: a });
                return account ? account.id : 0;
            })

            db.models.fibos_tokens_action.createSync({
                token_from_name: token_name,
                account_from_name: from,
                account_to_name: to,
                contract_action: m.act.account + "/" + m.act.name,
                token_from_id: token.id,
                account_from_id: account_ids[0],
                account_to_id: account_ids[1],
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/setposition": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;
            let data = m.act.data;

            let account_name = m.act.authorization[0].actor;

            let token_name = data.sym.sym.split(',')[1] + "@" + data.sym.contract;

            let account = db.models.fibos_accounts.oneSync({
                name: account_name
            })

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            });

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            db.models.fibos_tokens_action.createSync({
                account_from_name: account_name,
                token_from_name: token_name,
                contract_action: m.act.account + "/" + m.act.name,
                account_from_id: account.id,
                token_from_id: token.id,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/exunlock": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;

            let data = m.act.data;

            let owner = data.owner;
            let t = ex_assert(data.quantity);
            let token_name = t.symbol + "@" + t.contract;

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            });

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let account = db.models.fibos_accounts.oneSync({ name: owner });

            db.models.fibos_tokens_action.createSync({
                account_from_name: owner,
                account_from_id: account.id,
                token_from_name: token_name,
                token_from_id: token.id,
                contract_action: m.act.account + "/" + m.act.name,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/exlock": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;
            let data = m.act.data;

            let owner = data.owner;
            let t = ex_assert(data.quantity);
            let token_name = t.symbol + "@" + t.contract;

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            });

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let account = db.models.fibos_accounts.oneSync({ name: owner });

            db.models.fibos_tokens_action.createSync({
                account_from_name: owner,
                account_from_id: account.id,
                token_from_name: token_name,
                token_from_id: token.id,
                contract_action: m.act.account + "/" + m.act.name,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/exlocktrans": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;

            let data = m.act.data;
            let from = data.from;
            let to = data.to;
            let t = ex_assert(data.quantity);
            let token_name = t.symbol + "@" + t.contract;

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            })

            let account_ids = [from, to].map(a => {
                let account = db.models.fibos_accounts.oneSync({ name: a });
                return account ? account.id : 0;
            })

            db.models.fibos_tokens_action.createSync({
                token_from_name: token_name,
                account_from_name: from,
                account_to_name: to,
                contract_action: m.act.account + "/" + m.act.name,
                token_from_id: token.id,
                account_from_id: account_ids[0],
                account_to_id: account_ids[1],
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/exchange": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;
            let data = m.act.data;
            let owner = data.owner;

            let f = ex_assert(data.quantity);
            let token_from_name = f.symbol + "@" + f.contract;
            let token_to_name;
            if (data.to) {
                var t = ex_assert(data.to);
                token_to_name = t.symbol + "@" + t.contract;
            } else if (data.tosym) {
                token_to_name = data.tosym.sym.split(",")[1] + "@" + data.tosym.contract;
            }

            let account_to_name, account_to_id;
            m.inline_traces.some(inline => {
                if (inline.act.account + "/" + inline.act.name == "eosio.token/traderecord") {
                    account_to_name = inline.act.oppo;
                    let to_account = db.models.fibos_accounts.oneSync({ name: account_to_name });
                    account_to_id = to_account ? to_account.id : 0;
                }
            })

            let account = db.models.fibos_accounts.oneSync({ name: owner });

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let token_ids = [token_from_name, token_to_name].map(t => {
                let token = db.models.fibos_tokens.oneSync({ token_name: t });
                return token.id;
            })

            db.models.fibos_tokens_action.createSync({
                account_from_name: owner,
                account_to_name: account_to_name,
                token_from_name: token_from_name,
                token_to_name: token_to_name,
                contract_action: m.act.account + "/" + m.act.name,
                token_from_id: token_ids[0],
                token_to_id: token_ids[1],
                account_from_id: account.id,
                account_to_id: account_to_id,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/addreserves": (db, messages) => {
        messages.forEach(m => {
            saveUniswaps(m, db);
        })
    },
    "eosio.token/outreserves": (db, messages) => {
        messages.forEach(m => {
            saveUniswaps(m, db);
        })
    },
    "eosio.token/withdraw": (db, messages) => {
        messages.forEach(m => {
            saveUniswaps(m, db);
        })
    },
    "eosio.token/lockreserve": (db, messages) => {
        messages.forEach(m => {
            saveUniswaps(m, db);
        })
    },
    "eosio.token/unlckreserve": (db, messages) => {
        messages.forEach(m => {
            saveUniswaps(m, db);
        })
    },
    "eosio.token/outreceipt": (db, messages) => {
        messages.forEach(m => {
            saveUniswaps(m, db);
        })
    },
    "esoio.token/uniswapsnap": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;

            let data = m.act.data;
            let owner = data.owner;

            let t = ex_assert(data.quantity);
            let token_name = t.symbol + "@" + t.contract;

            let token = db.models.fibos_tokens.oneSync({
                token_name: token_name
            });

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            let account = db.models.fibos_accounts.oneSync({ name: owner });

            db.models.fibos_tokens_action.createSync({
                account_from_name: owner,
                account_from_id: account.id,
                token_from_name: token_name,
                token_from_id: token.id,
                contract_action: m.act.account + "/" + m.act.name,
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/traderecord": (db, messages) => {
        messages.forEach(m => {
            if (!checkExist(m, db)) return;
            let data = m.act.data;

            let account_from_name = data.owner;
            let account_to_name = data.oppo;

            let f = ex_assert(data.from);
            let token_from_name = f.symbol + "@" + f.contract;

            let t = ex_assert(data.to);
            let token_to_name = t.symbol + "@" + t.contract;

            let account_ids = [account_from_name, account_to_name].map(a => {
                let account = db.models.fibos_accounts.oneSync({ name: a });
                return account ? account.id : 0;
            })

            let token_ids = [token_from_name, token_to_name].map(t => {
                let token = db.models.fibos_tokens.oneSync({ token_name: t });
                return token.id;
            })

            let action = db.models.fibos_actions.oneSync({
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

            db.models.fibos_tokens_action.createSync({
                account_from_name: account_from_name,
                account_to_name: account_to_name,
                token_from_name: token_from_name,
                token_to_name: token_to_name,
                contract_action: m.act.account + "/" + m.act.name,
                token_from_id: token_ids[0],
                token_to_id: token_ids[1],
                account_from_id: account_ids[0],
                account_to_id: account_ids[1],
                action_id: action.id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
}