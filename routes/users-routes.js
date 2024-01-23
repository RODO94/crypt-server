const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const knex = require("knex")(require("../knexfile"));
const crypto = require("crypto");
const router = express.Router();

router.route("/register").post(async (req, res) => {
  const { first_name, last_name, known_as, email, password } = req.body;

  const hashedPassword = bcrypt.hashSync(password);

  const newUser = {
    id: "1ABC",
    first_name,
    last_name,
    known_as,
    email,
    password: hashedPassword,
    role: "admin",
  };

  try {
    await knex("users").insert({
      id: "1ABC",
      first_name,
      last_name,
      known_as,
      email,
      password: hashedPassword,
      role: "admin",
    });
    res.status(201).send("Registration Successful!");
  } catch (error) {
    console.error(error);
    res.status(400).send("Registration Failed");
  }
});

module.exports = router;
