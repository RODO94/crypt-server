import { verify } from "jsonwebtoken";
import database from "../database/db";

const verifyToken = (authToken) => {
  const decodedToken = verify(authToken, process.env.JWT_KEY);
  if (!decodedToken) {
    return null;
  }

  return decodedToken;
};

const getTokenProfile = async (id) => {
  try {
    const profile = await database("users").where({ id: id }).first();
    return profile;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export default { verifyToken, getTokenProfile };
