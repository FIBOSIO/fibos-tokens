# fibos-tokens 模块

## 介绍

fibos-tokens 模块，依赖于 [fibos-tracker](https://github.com/FIBOSIO/fibos-tracker) 模块，模块内默认依赖 [fibos-accounts](https://github.com/FIBOSIO/fibos-accounts) 模块。使用该模块，可以轻松搞定 FIBOS、EOS 链上的 token 合约相关记录的存储和查询。

## 安装

```shell
npm install fibos-tokens
```

## 使用

```javascript
...
const Tracker = require("fibos-tracker");

Tracker.Config.DBconnString = "sqlite:./chain.db";

const tracker = new Tracker();
tracker.use(require("fibos-tokens"));
...
```

[示例代码](./examples/)

## 默认表结构定义

![数据模型](./diagram.svg)

fibos_tokens 表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | int | 自增id |
| token_name | text | 通证名 FO@eosio|
| token_type | text | 通证类型(tradition:传统通证，tradition:智能通证) |
| token_status | text | 通证状态(on:在线，off:销毁) |
| created| Date | 通证创建时间 |
| createdAt | Date | 记录创建时间 |
| updatedAt | Date | 记录更新时间 |
| creator_id | String | 通证创建者关联账号 |

fibos_tokens_action 表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | int | 自增id |
| account_from_id | String | 交易发起账户 |
| account_to_id | String | 交易目标账户 |
| contract_action | String | 交易名称 |
| token_from_id | int | 交易发起通证关联id |
| token_to_id | int | 交易目标通证关联id|
| transaction_id | int | 交易关联事务id|
| global_sequence | int | 交易唯一标识 |
| createdAt | Date | 记录创建时间 |
| updatedAt | Date | 记录更新时间 |

### 查询示例

示例 server

```javascript
const http = require('http');
const Tracker = require("fibos-tracker");

let port = 8080;

let DBconnString = process.env.DBconnString || 'mysql://root:123456@127.0.0.1/fibos_chain';
Tracker.Config.DBconnString = DBconnString;

const tracker = new Tracker();
tracker.use(require("fibos-tokens"));

var svr = new http.Server(port, [
    (req) => { req.session = {} },
    {
        "/1.0/app": tracker.app
    }]);

svr.start();
```

> 以下所有查询都通过 graphql

业务场景-:

需要查询合约 eosio.token 中所有的 transfer 操作

```javascript

http.post(`http://127.0.0.1:8081/1.1`, {
	headers: {
		'Content-Type': 'application/graphql'
	},
	body: `
		{
			find_fibos_tokens_action(
				order:"-id"
				where:{
					contract_action:"eosio.token/extransfer"
				}
			){
				account_from_id
				action{
					rawData
				}
				token_from{
					token_name
					token_type
					token_status
				}
			}
		}`
}).json();
```

业务场景二:

查询用户「fibos」的所有 transfer、extransfer 操作

``` javascript
const http = require("http");
http.post(`http://127.0.0.1:8081/1.1`, {
	headers: {
		'Content-Type': 'application/graphql'
	},
	body: `
		{
			find_fibos_tokens_action(
				order:"-id"
				where:{
					account_from_name: "fibos"
					contract_action:{
						in:["eosio.token/extransfer","eosio.token/exchange"]
					}
				}
			){
				account_from_id
				contract_action
				action{
					rawData
				}
				token_from{
					token_name
					token_type
					token_status
				}
			}
		}`
}).json();
```

业务场景三：
查询用户「fibos」的所有有关 FO 通证的操作记录

```javascript
const http = require("http");
http.post(`http://127.0.0.1:8081/1.1`, {
	headers: {
		'Content-Type': 'application/graphql'
	},
	body: `
		{
			find_fibos_tokens_action(
				order:"-id"
				where:{
					account_from_name: "fibos",
					or:[{
						token_from_name:"FO@eosio"
					},{
						token_to_name:"FO@eosio"
					}]
				}
			){
				account_from_id
				contract_action
				action{
					rawData
				}
				token_from{
					token_name
					token_type
					token_status
				}
				token_to{
					token_name
					token_type
					token_status
				}
			}
		}`
}).json();
```