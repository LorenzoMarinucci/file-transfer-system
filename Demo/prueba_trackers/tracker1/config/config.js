const fs = require("fs");

module.exports = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
