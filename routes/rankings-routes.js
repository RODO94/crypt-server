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
  console.log(("Ranking Routes Pool Used on Start", pool.numUsed()));
  console.log(("Ranking Routes Pool Free on Start", pool.numFree()));
});

knex.on("query-response", (response, builder) => {
  console.log("Ranking Routes Query executed successfully:", builder.sql);
  console.log("Ranking Routes Pool Used", pool.numUsed());
  console.log("Ranking Routes Pool Free on on response", pool.numFree());
});

knex.on("query-error", (error, builder) => {
  console.error("Ranking Routes Error  executing query:", builder.sql, error);
  console.log("Ranking Routes Error Connections in use:", pool.numUsed());
  console.log("Ranking Routes Error Connections available:", pool.numFree());
});

router.route("/all").get(fetchAllRankings);
router.route("/top5").get(fetchTopFiveRanking);
router.route("/:id").get(fetchOneRanking);

module.exports = router;
