const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const knex = require("knex")(require("../knexfile"));
const crypto = require("crypto");
const router = express.Router();
const nodemailer = require("nodemailer");

require("dotenv").config();

const baseURL = `${process.env.BASE_URL}${process.env.PORT}`;

const transport = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "b34d99c801334f",
    pass: "8d263e86c481fc",
  },
});

router.route("/register").post(async (req, res) => {
  const { first_name, last_name, known_as, email, password } = req.body;

  if (!first_name) {
    return res
      .status(400)
      .send(
        "First name cannot be read from the request, please send again with the first name added"
      );
  }
  if (!last_name) {
    return res
      .status(400)
      .send(
        "Last name cannot be read from the request, please send again with the last name added"
      );
  }
  if (!email) {
    return res
      .status(400)
      .send(
        "Email cannot be read from the request, please send again with the email added"
      );
  }
  if (!password) {
    return res
      .status(400)
      .send(
        "Password cannot be read from the request, please send again with the password added"
      );
  }

  const hashedPassword = bcrypt.hashSync(password);

  const newUser = {
    id: crypto.randomUUID(),
    first_name,
    last_name,
    known_as,
    email,
    password: hashedPassword,
    role: "admin",
  };

  try {
    await knex("users").insert(newUser);
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

router.route("/reset").post(async (req, res) => {
  const { email } = req.body;

  const emailHTML = `<h1>Hello from Crypt</h1><p>To reset your password, please use the link below</p><a href="http://localhost:8080"> Reset Your Password </a>`;

  try {
    const user = await knex("users").where({ email: email }).first();

    if (!user) {
      return res.status(400).send("User is not found, please check the mail");
    }

    let mailOptions = {
      from: "thecrypt@email.com",
      to: email,
      subject: "Reset your Crypt Password",
      text: `To reset your password please go to: ${baseURL}/reset/${user.id}`,
      html: emailHTML,
    };

    transport.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
    res.status(200).send("Email Sent");
  } catch (error) {
    console.error(error);
    res.status(400).send("Error retrieving user");
  }
});

router.route("/:id/reset").patch(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res
      .status(400)
      .send("Please include the new password in your request");
  }

  const id = req.params.id.toString();

  if (!id) {
    return res.status(400).send("Invalid user ID in request parameters");
  }

  const hashedPassword = bcrypt.hashSync(password);

  try {
    const userToChange = await knex("users")
      .where({ id: id })
      .update({ password: hashedPassword });

    if (!userToChange) {
      return res
        .status(400)
        .send("User cannot be located, you may need to sign up first");
    }

    res.status(200).send("Password changed");
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to change the password");
  }
});

router.route("/:id/admin").patch(async (req, res) => {
  const id = req.params.id;

  try {
    const adminRights = await knex("users")
      .where({ id: id })
      .update({ role: "admin" });

    res.status(200).send(`User with ID ${id} has been given admin rights`);
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .send(
        "There is an issue with your request, please check the details and resubmit"
      );
  }
});

router.route("/:id/deactivate").patch(async (req, res) => {
  const id = req.params.id;

  try {
    const deactivateRights = await knex("users")
      .where({ id: id })
      .update({ role: "deactivated" });

    res.status(200).send(`User with ID ${id} has been deactivated`);
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .send(
        `There is an issue with your request, please check the details and resubmit`
      );
  }
});

router.route("/:id/user").patch(async (req, res) => {
  const id = req.params.id;

  try {
    const userRights = await knex("users")
      .where({ id: id })
      .update({ role: "user" });

    res.status(200).send(`User with ID ${id} has been given user status`);
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .send(
        `There is an issue with your request, please check the details and resubmit`
      );
  }
});

router.route("/:id/edit/first_name").patch(async (req, res) => {
  const { first_name } = req.body;
  const id = req.params.id;

  const targetUser = await knex("users").where({ id: id }).first();

  if (!targetUser) {
    res.status(400).send("User has not been found");
  }
  if (!first_name) {
    return res.status(400).send("Please add a first name to the request");
  }

  try {
    const firstNameChange = await knex("users")
      .where({ id: id })
      .update({ first_name: first_name });

    res.status(200).send(`First Name has been changed to ${first_name}`);
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .send("An error has arisen, please check the details and connection");
  }
});

router.route("/:id/edit/last_name").patch(async (req, res) => {
  const { last_name } = req.body;
  const id = req.params.id;

  const targetUser = await knex("users").where({ id: id }).first();

  if (!targetUser) {
    res.status(400).send("User has not been found");
  }
  if (!last_name) {
    return res.status(400).send("Please add a last name to the request");
  }

  try {
    const lastNameChange = await knex("users")
      .where({ id: id })
      .update({ last_name: last_name });

    res.status(200).send(`Last Name has been changed to ${last_name}`);
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .send("An error has arisen, please check the details and connection");
  }
});

router.route("/:id/edit/email").patch(async (req, res) => {
  const { email } = req.body;
  const id = req.params.id;

  const targetUser = await knex("users").where({ id: id }).first();

  if (!targetUser) {
    res.status(400).send("User has not been found");
  }
  if (!email) {
    return res.status(400).send("Please add an email to the request");
  }

  try {
    const emailChange = await knex("users")
      .where({ id: id })
      .update({ email: email });

    res.status(200).send(`Your email has been changed to ${email}`);
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .send("An error has arisen, please check the details and connection");
  }
});

router.route("/:id/edit/known_as").patch(async (req, res) => {
  const { known_as } = req.body;
  const id = req.params.id;

  const targetUser = await knex("users").where({ id: id }).first();

  if (!targetUser) {
    res.status(400).send("User has not been found");
  }
  if (!known_as) {
    return res
      .status(400)
      .send("Please add how you would like to be known to the request");
  }

  try {
    const knownAsChange = await knex("users")
      .where({ id: id })
      .update({ known_as: known_as });

    res.status(200).send(`Known as has been changed to ${known_as}`);
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .send("An error has arisen, please check the details and connection");
  }
});

router.route("/:id/rankings").get(async (req, res) => {
  const userID = req.params.id;

  try {
    const userObj = await knex("users").where({ id: userID }).first();
    if (!userObj) {
      return res
        .status(400)
        .send("User cannot be found, please check the ID provided");
    }

    const fortySubquery = knex("rank")
      .join("armies", "rank.army_id", "=", "armies.id")
      .join("users", "armies.user_id", "=", "users.id")
      .select("army_id", "date", "ranking", "armies.name", "users.known_as")
      .rowNumber("rn", { column: "date", order: "desc" }, "army_id")
      .where({ "armies.type": "40k", "users.id": userID })
      .as("fortyranks");

    const fortyQuery = knex(fortySubquery)
      .select("name", "known_as", "ranking", "rn")
      .where("rn", 1)
      .orderBy("ranking", "desc");

    const fantasySubquery = knex("rank")
      .join("armies", "rank.army_id", "=", "armies.id")
      .join("users", "armies.user_id", "=", "users.id")
      .select("army_id", "date", "ranking", "armies.name", "users.known_as")
      .rowNumber("fn", { column: "date", order: "desc" }, "army_id")
      .where({ "armies.type": "fantasy", "users.id": userID })
      .as("fantasyranks");

    const fantasyQuery = knex(fantasySubquery)
      .select("name", "known_as", "ranking", "fn")
      .where("fn", 1)
      .orderBy("ranking", "desc");
    res
      .status(200)
      .send({ fortyK: await fortyQuery, fantasy: await fantasyQuery });
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve rankings");
  }
});

module.exports = router;
