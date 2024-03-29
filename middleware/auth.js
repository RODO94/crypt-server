const jwt = require("jsonwebtoken");
const knex = require("knex")(require("../knexfile"));

const headerAuth = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send("Access Denied, please log in");
  }

  const authToken = req.headers.authorization.split(" ")[1];

  try {
    const decodedToken = jwt.verify(authToken, process.env.JWT_KEY);
    const userID = decodedToken.id;

    const profile = await knex("users").where({ id: userID }).first();
    delete profile.password;

    next();
  } catch (error) {
    console.error(error);
    res.status(401).send("Access Denied, please log in");
  }
};

const adminAuth = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send("Access Denied, please log in");
  }

  const authToken = req.headers.authorization.split(" ")[1];

  try {
    const decodedToken = jwt.verify(authToken, process.env.JWT_KEY);
    const userID = decodedToken.id;

    const profile = await knex("users").where({ id: userID }).first();

    if (profile.role !== "admin") {
      return res.status(401).send("Access Denied, please check your user role");
    }
    delete profile.password;

    next();
  } catch (error) {
    console.error(error);
    res.status(401).send("Access Denied, please log in");
  }
};

module.exports = { headerAuth, adminAuth };
