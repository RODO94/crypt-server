require("dotenv").config();

module.exports = {
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: "utf8",
  },
  pool: {
    min: 2, // Minimum number of connections in the pool
    max: 10, // Maximum number of connections in the pool
  },
};
