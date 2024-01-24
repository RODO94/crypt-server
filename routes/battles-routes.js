const express = require("express");
const knex = require("knex")(require("../knexfile"));
const router = express.Router();

require("dotenv").config();

router.route("/create").post(async (req, res) => {});

module.exports = router;
