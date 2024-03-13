const express = require("express");
const knex = require("knex")(require("../knexfile"));

const {
  fetchAllRankings,
  fetchTopFiveRanking,
  fetchOneRanking,
} = require("../controllers/rankings-controllers");
const router = express.Router();

knex.on("start", (builder) => {
  console.log("New query being executed:", builder.pool.numUsed());
});

knex.on("query-response", (response, builder) => {
  console.log("Query executed successfully:", builder.sql);
  console.log("Pool Used", builder.pool.numUsed());
});

knex.on("query-error", (error, builder) => {
  console.error("Error executing query:", builder.sql, error);
});

const pool = knex.client.pool;

console.log("Connections in use:", pool.numUsed());
console.log("Connections available:", pool.numFree());

router.route("/all").get(fetchAllRankings);
router.route("/top5").get(fetchTopFiveRanking);
router.route("/:id").get(fetchOneRanking);

module.exports = router;
