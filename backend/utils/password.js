const bcrypt = require("bcrypt");

const hashPassword = (password) => bcrypt.hash(password, 10);
const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

module.exports = {
    hashPassword,
    verifyPassword,
};
