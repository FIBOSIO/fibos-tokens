let ex_assert = (quantity) => {
    return {
        quantity: quantity.quantity.split(" ")[0],
        symbol: quantity.quantity.split(" ")[1],
        contract: quantity.contract
    }
}

let saveUniswaps = (db, m) => {
    let data = m.act.data;;

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

    save_actions(db, {
        account_from_name: data.owner,
        token_from_name: token_from_name,
        token_to_name: token_to_name,
        contract_action: contract_action,
        trx_id: m.trx_id,
        global_sequence: m.receipt.global_sequence
    })
}

let save_actions = (db, params) => {
    let trx_id = params.trx_id;
    let token_from_name = params.token_from_name;
    let token_to_name = params.token_to_name;
    let account_from_name = params.account_from_name;
    let account_to_name = params.account_to_name;
    let global_sequence = params.global_sequence;
    let token_from_id = params.token_from_id;
    let token_to_id = params.token_to_id;
    let contract_action = params.contract_action;

    let action_id = db.driver.execQuerySync(`select id from fibos_actions where trx_id = ? and global_sequence = ?`, [trx_id, global_sequence])[0].id;

    let ta = db.driver.execQuerySync(`select id from fibos_tokens_action where action_id = ?`, [action_id])[0];
    if (ta && ta.id) return;

    if (!!token_from_name) {
        token_from_id = db.driver.execQuerySync(`select id from fibos_tokens where token_name = ? and token_status = "on"`, [token_from_name])[0].id;
    }

    if (!!token_to_name) {
        token_to_id = db.driver.execQuerySync(`select id from fibos_tokens where token_name = ? and token_status = "on"`, [token_to_name])[0].id;
    }

    db.driver.execQuerySync(`insert into fibos_tokens_action(account_from_id,account_to_id,token_from_id,token_to_id,contract_action,action_id) values(?,?,?,?,?,?)`, [account_from_name,
        account_to_name, token_from_id, token_to_id, contract_action, action_id]);
}

module.exports = {
    "eosio.token/create": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;

            let issuer = data.issuer;
            let token_name = data.maximum_supply.split(' ')[1] + "@" + issuer;

            let FibosTokens = db.models.fibos_tokens;

            let token = FibosTokens.oneSync({ token_name: token_name });
            if (token) return;
            FibosTokens.createSync({
                token_name: token_name,
                creator_id: issuer,
                token_status: "on",
                token_type: "tradition",
                created: m.block_time
            })

            save_actions(db, {
                account_from_name: issuer,
                token_from_name: token_name,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name
            })
        })
    },
    "eosio.token/issue": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;

            save_actions(db, {
                account_from_name: m.act.authorization[0].actor,
                account_to_name: data.to,
                token_from_name: data.quantity.split(" ")[1] + "@eosio",
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name
            })
        })
    },
    "eosio.token/retire": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;
            save_actions(db, {
                token_from_name: data.quantity.split(" ")[1] + "@eosio",
                account_from_name: data.from,
                trx_id: m.trx_id,
                global_sequence: m.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/close": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;
            save_actions(db, {
                token_from_name: data.symbol.split(',')[1] + "@eosio",
                account_from_name: data.owner,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/excreate": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;

            let issuer = data.issuer;
            let cw = data.connector_weight;
            let token_name = data.maximum_supply.split(' ')[1] + "@" + issuer;

            let FibosTokens = db.models.fibos_tokens;
            let token = FibosTokens.oneSync({ token_name: token_name });

            if (token && (token.created > m.block_time)) return;

            let token_type = (cw > 0) ? "smart" : "tradition";

            FibosTokens.createSync({
                token_status: "on",
                token_name: token_name,
                token_type: token_type,
                creator_id: issuer,
                created: m.block_time
            })

            save_actions(db, {
                account_from_name: issuer,
                token_from_name: token_name,
                contract_action: m.act.account + "/" + m.act.name,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })

        })
    },
    "eosio.token/exdestroy": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;

            let issuer = data.symbol.contract;
            let token_name = data.symbol.sym.split(",")[1] + "@" + issuer;

            let FibosTokens = db.models.fibos_tokens;

            let token = FibosTokens.oneSync({
                token_name: token_name,
                token_status: "on"
            });

            if (!token) {
                token = FibosTokens.createSync({
                    token_status: "off",
                    token_name: token_name,
                    token_type: "tradition",
                    created: m.block_time,
                    creator_id: issuer
                })
            } else if (token.token_status !== 'off') {
                token.saveSync({ token_status: "off" });
            }

            save_actions(db, {
                account_from_name: issuer,
                token_from_id: token.id,
                contract_action: m.act.account + "/" + m.act.name,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence
            })
        })
    },
    "eosio.token/exclose": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;
            save_actions(db, {
                token_from_name: data.symbol.sym.split(',')[1] + "@" + data.symbol.contract,
                account_from_name: data.owner,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/exissue": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;
            let t = ex_assert(data.quantity);
            save_actions(db, {
                token_from_name: t.symbol + "@" + t.contract,
                account_from_name: m.act.authorization[0].actor,
                account_to_name: data.to,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/exretire": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;
            let t = ex_assert(data.quantity);

            save_actions(db, {
                token_from_name: t.symbol + "@" + t.contract,
                account_from_name: data.from,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/exshare": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;

            let f = ex_assert(data.quantity);
            save_actions(db, {
                token_from_name: f.symbol + "@" + f.contract,
                token_to_name: data.tosym.sym.split(",")[1] + "@" + data.tosym.contract,
                account_from_name: m.act.authorization[0].actor,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/transfer": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;

            save_actions(db, {
                token_from_name: data.quantity.split(" ")[1] + "@" + "eosio",
                account_from_name: data.from,
                account_to_name: data.to,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/extransfer": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;

            let t = ex_assert(data.quantity);
            save_actions(db, {
                token_from_name: t.symbol + "@" + t.contract,
                account_from_name: data.from,
                account_to_name: data.to,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/ctxrecharge": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;

            let t = ex_assert(data.quantity);
            save_actions(db, {
                token_from_name: t.symbol + "@" + t.contract,
                account_from_name: data.owner,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/ctxextract": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;

            let t = ex_assert(data.quantity);
            save_actions(db, {
                token_from_name: t.symbol + "@" + t.contract,
                account_from_name: data.owner,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/ctxtransfer": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;
            let t = ex_assert(data.quantity);

            save_actions(db, {
                token_from_name: t.symbol + "@" + t.contract,
                account_from_name: data.from,
                account_to_name: data.to,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/setposition": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;
            save_actions(db, {
                token_from_name: data.sym.sym.split(',')[1] + "@" + data.sym.contract,
                account_from_name: m.act.authorization[0].actor,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/exunlock": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;

            let t = ex_assert(data.quantity);
            save_actions(db, {
                token_from_name: t.symbol + "@" + t.contract,
                account_from_name: data.owner,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/exlock": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;

            let t = ex_assert(data.quantity);

            save_actions(db, {
                token_from_name: t.symbol + "@" + t.contract,
                account_from_name: data.owner,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/exlocktrans": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;

            let t = ex_assert(data.quantity);
            save_actions(db, {
                token_from_name: t.symbol + "@" + t.contract,
                account_from_name: data.from,
                account_to_name: data.to,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/exchange": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;

            let token_to_name;
            if (data.to) {
                var t = ex_assert(data.to);
                token_to_name = t.symbol + "@" + t.contract;
            } else if (data.tosym) {
                token_to_name = data.tosym.sym.split(",")[1] + "@" + data.tosym.contract;
            }

            let account_to_name;
            m.inline_traces.some(inline => {
                if (inline.act.account + "/" + inline.act.name == "eosio.token/traderecord") {
                    account_to_name = inline.act.oppo;
                }
            })

            let f = ex_assert(data.quantity);
            save_actions(db, {
                token_from_name: f.symbol + "@" + f.contract,
                token_to_name: token_to_name,
                account_from_name: data.owner,
                account_to_name: account_to_name,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/addreserves": (db, messages) => {
        messages.forEach(m => {
            saveUniswaps(db, m);
        })
    },
    "eosio.token/outreserves": (db, messages) => {
        messages.forEach(m => {
            saveUniswaps(db, m);
        })
    },
    "eosio.token/withdraw": (db, messages) => {
        messages.forEach(m => {
            saveUniswaps(db, m);
        })
    },
    "eosio.token/lockreserve": (db, messages) => {
        messages.forEach(m => {
            saveUniswaps(db, m);
        })
    },
    "eosio.token/unlckreserve": (db, messages) => {
        messages.forEach(m => {
            saveUniswaps(db, m);
        })
    },
    "eosio.token/outreceipt": (db, messages) => {
        messages.forEach(m => {
            saveUniswaps(db, m);
        })
    },
    "esoio.token/uniswapsnap": (db, messages) => {
        messages.forEach(m => {

            let data = m.act.data;

            let t = ex_assert(data.quantity);

            save_actions(db, {
                token_from_name: t.symbol + "@" + t.contract,
                account_from_name: data.owner,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
    "eosio.token/traderecord": (db, messages) => {
        messages.forEach(m => {
            let data = m.act.data;

            let f = ex_assert(data.from);
            let t = ex_assert(data.to);
            save_actions(db, {
                token_from_name: f.symbol + "@" + f.contract,
                token_to_name: t.symbol + "@" + t.contract,
                account_from_name: data.owner,
                account_to_name: data.oppo,
                trx_id: m.trx_id,
                global_sequence: m.receipt.global_sequence,
                contract_action: m.act.account + "/" + m.act.name,
            })
        })
    },
}