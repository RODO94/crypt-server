const express = require("express");
const database = require("../database/db");

const {
  fetchAllRankings,
  fetchTopFiveRanking,
  fetchOneRanking,
} = require("../controllers/rankings-controllers");
const router = express.Router();
const pool = database.client.pool;
database.on("query", (builder) => {
  console.log("Ranking Routes to be executed", builder.sql);
  console.log("Ranking Routes Pool Used on Start", pool.numUsed());
  console.log("Ranking Routes Pool Used on Start", pool.numPendingAcquires());

  console.log("Ranking Routes Pool Free on Start", pool.numFree());
});

database.on("query-response", (response, builder) => {
  console.log("Ranking Routes Query executed successfully:", builder.sql);
  console.log("Ranking Routes Pool Used on response", pool.numUsed());
  console.log("Ranking Routes Pool Free on response", pool.numFree());
});

database.on("query-error", (error, builder) => {
  console.error("Error executing query:", builder.sql, error);
  console.log("Ranking Routes Error Pool Used on error", pool.numUsed());
  console.log("Ranking Routes Error Pool Free on error", pool.numFree());
});

router.route("/all").get(fetchAllRankings);
router.route("/top5").get(fetchTopFiveRanking);
router.route("/:id").get(fetchOneRanking);

module.exports = router;
