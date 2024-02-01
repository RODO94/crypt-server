const express = require("express");
const knex = require("knex");
const {
  fetchAllRankings,
  fetchTopFiveRanking,
} = require("../controllers/rankings-controllers");
const router = express.Router();

router.route("/all").get(fetchAllRankings);
router.route("/top5").get(fetchTopFiveRanking);

module.exports = router;
