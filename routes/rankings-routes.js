const express = require("express");
const knex = require("knex");
const { fetchAllRankings } = require("../controllers/rankings-controllers");
const router = express.Router();

router.route("/all").get(fetchAllRankings);

module.exports = router;
