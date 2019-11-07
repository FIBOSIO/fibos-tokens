const fibos = require("fibos");

fibos.config_dir = "./data";
fibos.data_dir = "./data";

fibos.load("http", {
    "http-server-address": "0.0.0.0:8870",
    "access-control-allow-origin": "*",
    "http-validate-host": false,
    "verbose-http-errors": true
});

fibos.load("net", {
    "p2p-peer-address": ["192.168.1.203:9870"],
    "p2p-listen-endpoint": "0.0.0.0:9870"
});

fibos.load("producer");
fibos.load("chain", {
    "contracts-console": true,
    "delete-all-blocks": true,
    "genesis-json": "genesis.json"
});

fibos.load("ethash");
fibos.load("chain_api");

const Tracker = require("fibos-tracker");

// Tracker.Config.replay = true;
Tracker.Config.DBconnString = "mysql://root:123456@127.0.0.1/fibos_chain";
const tracker = new Tracker();

tracker.use(require('../'));

tracker.emitter();
fibos.start();