const express = require("express");
const knex = require("knex")(require("../knexfile"));
const router = express.Router();

require("dotenv").config();

module.exports = router;
