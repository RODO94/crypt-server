const jwt = require("jsonwebtoken");

const verifyToken = (authToken) => {
  const decodedToken = jwt.verify(authToken, process.env.JWT_KEY);
  if (!decodedToken) {
    return null;
  }

  return decodedToken;
};

module.exports = { verifyToken };
