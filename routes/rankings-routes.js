const express = require("express");
const knex = require("knex");
const {
  fetchAllRankings,
  fetchTopFiveRanking,
  fetchOneRanking,
} = require("../controllers/rankings-controllers");
const router = express.Router();

const corsOptions = {
  origin: "https://thecryptanstruther.com", // Replace with your Netlify domain
  optionsSuccessStatus: 200, // Some legacy browsers (e.g., IE11) choke on 204
};

router.route("/all").get(fetchAllRankings);
router.route("/top5").get(cors(corsOptions), fetchTopFiveRanking);
router.route("/:id").get(fetchOneRanking);

module.exports = router;
