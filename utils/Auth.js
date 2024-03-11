const jwt = require("jsonwebtoken");

const verifyToken = (authToken) => {
  const decodedToken = jwt.verify(authToken, process.env.JWT_KEY);
  if (!decodedToken) {
    return null;
  }

  return decodedToken;
};

const getTokenProfile = async (id) => {
  try {
    const profile = await knex("users").where({ id: id }).first();
    return profile;
  } catch (error) {
    console.error(error);
    return false;
  }
};

module.exports = { verifyToken, getTokenProfile };
