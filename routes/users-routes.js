const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const database = require("../database/db");
const crypto = require("crypto");
const router = express.Router();
const nodemailer = require("nodemailer");
const { adminAuth, headerAuth } = require("../middleware/auth");
const {
  getAllUsers,
  getOneUser,
  getUserNemesis,
  getUserAlly,
  getOneOtherUser,
  getUserInfo,
  getOneUserWithToken,
} = require("../controllers/users-controllers");
const { verifyToken } = require("../utils/Auth");

require("dotenv").config();

const baseURL = `${process.env.BASE_URL}${process.env.PORT}`;
const clientURL = `${process.env.CLIENT_URL}`;

// const pool = database.client.pool;
// database.on("query", (builder) => {
//   console.log("User Routes to be executed", builder.sql);
//   console.log("User Routes Pool Used on Start", pool.numUsed());
//   console.log("User Routes Pool Used on Start", pool.numPendingAcquires());

//   console.log("User Routes Pool Free on Start", pool.numFree());
// });

// database.on("query-response", (response, builder) => {
//   console.log("User Routes Query executed successfully:", builder.sql);
//   console.log("User Routes Pool Used on response", pool.numUsed());
//   console.log("User Routes Pool Free on response", pool.numFree());
// });

// database.on("query-error", (error, builder) => {
//   console.error("Error executing query:", builder.sql, error);
//   console.log("User Routes Error Pool Used on error", pool.numUsed());
//   console.log("User Routes Error Pool Free on error", pool.numFree());
// });

const transport = nodemailer.createTransport({
  host: "live.smtp.mailtrap.io",
  port: 587,
  auth: {
    user: "api",
    pass: "5a616f388531139861b8e09414883af6",
  },
});

router.route("/register").post(async (req, res) => {
  const { first_name, last_name, known_as, email, password, user_emblem } =
    req.body;

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
    role: "user",
    user_emblem: user_emblem ? user_emblem : "necrons",
  };

  try {
    await database("users").insert(newUser);
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
    const user = await database("users").where({ email: email }).first();

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
    res.send({ token: token, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to find user");
  }
});

router.route("/forgot-password").post(async (req, res) => {
  const { email } = req.body;
  const resetToken = crypto.randomUUID();

  try {
    const user = await database("users").where({ email: email }).first();
    const emailHTML = `<h1>Reset Password for The Crypt</h1><p>Good day, my fellow combatant. <br/> It seems to me that you require assistance resetting your password... <br/> The link below will guide you on your way.</p><a href="${clientURL}/reset/${resetToken}"> Reset Your Password </a>`;

    await database("users")
      .where({ email: email })
      .update({ "password-reset-token": resetToken });

    if (!user) {
      return res.status(400).send("User is not found, please check the mail");
    }

    let mailOptions = {
      from: "mailtrap@thecryptanstruther.com",
      to: email,
      subject: "Reset your Crypt Password",
      text: `To reset your password please go to: ${clientURL}/reset/${resetToken}`,
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

router.route("/reset/:token").patch(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res
      .status(400)
      .send("Please include the new password in your request");
  }

  const token = req.params.token.toString();

  if (!token) {
    return res.status(400).send("Invalid user ID in request parameters");
  }

  const hashedPassword = bcrypt.hashSync(password);

  try {
    const userToChange = await database("users")
      .where({ "password-reset-token": token })
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

router.route("/:id/admin").patch(adminAuth, async (req, res) => {
  const id = req.params.id;

  try {
    const adminRights = await database("users")
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

router.route("/:id/deactivate").patch(adminAuth, async (req, res) => {
  const id = req.params.id;

  try {
    const deactivateRights = await database("users")
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

router.route("/:id/user").patch(adminAuth, async (req, res) => {
  const id = req.params.id;

  try {
    const userRights = await database("users")
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

router.route("/:id/edit/first_name").patch(headerAuth, async (req, res) => {
  const { first_name } = req.body;
  const id = req.params.id;

  const targetUser = await database("users").where({ id: id }).first();

  if (!targetUser) {
    res.status(400).send("User has not been found");
  }
  if (!first_name) {
    return res.status(400).send("Please add a first name to the request");
  }

  try {
    const firstNameChange = await database("users")
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

router.route("/:id/edit/last_name").patch(headerAuth, async (req, res) => {
  const { last_name } = req.body;
  const id = req.params.id;

  const targetUser = await database("users").where({ id: id }).first();

  if (!targetUser) {
    res.status(400).send("User has not been found");
  }
  if (!last_name) {
    return res.status(400).send("Please add a last name to the request");
  }

  try {
    const lastNameChange = await database("users")
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

router.route("/:id/edit/email").patch(headerAuth, async (req, res) => {
  const { email } = req.body;
  const id = req.params.id;

  const targetUser = await database("users").where({ id: id }).first();

  if (!targetUser) {
    res.status(400).send("User has not been found");
  }
  if (!email) {
    return res.status(400).send("Please add an email to the request");
  }

  try {
    const emailChange = await database("users")
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

router.route("/:id/edit/known_as").patch(headerAuth, async (req, res) => {
  const { known_as } = req.body;
  const id = req.params.id;

  const targetUser = await database("users").where({ id: id }).first();

  if (!targetUser) {
    res.status(400).send("User has not been found");
  }
  if (!known_as) {
    return res
      .status(400)
      .send("Please add how you would like to be known to the request");
  }

  try {
    const knownAsChange = await database("users")
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

router.route("/rankings").get(headerAuth, async (req, res) => {
  const authToken = req.headers.authorization.split(" ")[1];
  const decodedToken = verifyToken(authToken);

  const userID = decodedToken.id;

  try {
    const rankArray = await database("rank_view")
      .join("armies", "armies.id", "=", "rank_view.army_id")
      .join("users", "users.id", "=", "armies.user_id")
      .where("users.id", "=", userID)
      .orderBy("ranking", "desc");

    if (!rankArray) {
      return res
        .status(400)
        .send(
          "Unable to retrieve the rankings for specified user, double check the token"
        );
    }

    const fantasyRankArray = rankArray.filter(
      (rank) => rank.type === "fantasy" || rank.type === "Fantasy"
    );
    const fortyKRankArray = rankArray.filter((rank) => rank.type === "40k");

    const rankedFantasyArray = fantasyRankArray.map((army, index) => {
      if (army.prev_ranking > index + 1) {
        return { ...army, current_position: index + 1, status: "increase" };
      } else if (army.prev_ranking < index + 1) {
        return { ...army, current_position: index + 1, status: "decrease" };
      } else {
        return { ...army, current_position: index + 1, status: "no change" };
      }
    });
    const rankedFortyArray = fortyKRankArray.map((army, index) => {
      if (army.prev_ranking > index + 1) {
        return { ...army, current_position: index + 1, status: "increase" };
      } else if (army.prev_ranking < index + 1) {
        return { ...army, current_position: index + 1, status: "decrease" };
      } else {
        return { ...army, current_position: index + 1, status: "no change" };
      }
    });

    const filteredFantasyArray = rankedFantasyArray.filter(
      (army) => army.user_id === userID
    );

    const filteredFortyArray = rankedFortyArray.filter(
      (army) => army.user_id === userID
    );

    res
      .status(200)
      .send({ fortyK: filteredFortyArray, fantasy: filteredFantasyArray });
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve rankings");
  }
});

router.route("/all").get(getAllUsers);

router.route("/one").get(getOneUser);

router.route("/one/:id").get(getOneOtherUser);

router.route("/nemesis").get(getUserNemesis);
router.route("/ally").get(getUserAlly);

router.route("/token").get(getOneUserWithToken);

router.route("/user/info").get(getUserInfo);
router.route("/user/authenticate/:token").get((req, res) => {
  const token = req.params.token;

  const response = verifyToken(token);

  if (response) {
    return res.status(200).send(true);
  } else {
    return res.status(401).send(false);
  }
});
module.exports = router;
