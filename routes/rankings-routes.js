const express = require("express");
const knex = require("knex");
const cors = require("cors");

const {
  fetchAllRankings,
  fetchTopFiveRanking,
  fetchOneRanking,
} = require("../controllers/rankings-controllers");
const router = express.Router();

router.route("/all").get(fetchAllRankings);
router.route("/top5").get(fetchTopFiveRanking);
router.route("/:id").get(fetchOneRanking);

module.exports = router;
