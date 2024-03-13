const express = require("express");
const knex = require("knex")(require("../knexfile"));

const {
  fetchAllRankings,
  fetchTopFiveRanking,
  fetchOneRanking,
} = require("../controllers/rankings-controllers");
const router = express.Router();
const pool = knex.client.pool;

knex.on("start", (builder) => {
  console.log(("Pool Used on Start", pool.numUsed()));
  console.log(("Pool Free on Start", pool.numFree()));
});

knex.on("query-response", (response, builder) => {
  console.log("Query executed successfully:", builder.sql);
  console.log("Pool Used", pool.numUsed());
  console.log("Pool Free on on response", pool.numFree());
});

knex.on("query-error", (error, builder) => {
  console.error("Error executing query:", builder.sql, error);
});

console.log("Connections in use:", pool.numUsed());
console.log("Connections available:", pool.numFree());

router.route("/all").get(fetchAllRankings);
router.route("/top5").get(fetchTopFiveRanking);
router.route("/:id").get(fetchOneRanking);

module.exports = router;
