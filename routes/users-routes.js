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

router.route("/login").post(async (req, res) => {
  const { email, password } = req.body;

  if (!email | !password) {
    return res.status(400).send("Please send required information");
  }

  try {
    const user = await knex("users").where({ email: email }).first();

    if (!user) {
      return res.status(400).send("User has not been found");
    }

    const isPasswordCorrect = bcrypt.compareSync(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).send("Invalid Password");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_KEY,
      { expiresIn: "24h" }
    );
    res.send(token);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to find user");
  }
});

module.exports = router;
