const knex = require("knex")(require("../knexfile"));

const fetchAllRankings = async (req, res) => {
  try {
    const fortySubquery = knex("rank")
      .join("armies", "rank.army_id", "=", "armies.id")
      .join("users", "armies.user_id", "=", "users.id")
      .select("army_id", "date", "ranking", "armies.name", "users.known_as")
      .rowNumber("rn", { column: "date", order: "desc" }, "army_id")
      .where({ "armies.type": "40k" })
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
      .where({ "armies.type": "fantasy" })
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
};

const fetchTopFiveRanking = async (req, res) => {
  try {
    const fortySubquery = knex("rank")
      .join("armies", "rank.army_id", "=", "armies.id")
      .join("users", "armies.user_id", "=", "users.id")
      .select("army_id", "date", "ranking", "armies.name", "users.known_as")
      .rowNumber("rn", { column: "date", order: "desc" }, "army_id")
      .where({ "armies.type": "40k" })
      .as("fortyranks");

    const fortyQuery = knex(fortySubquery)
      .select("name", "known_as", "ranking", "rn")
      .where("rn", 1)
      .orderBy("ranking", "desc")
      .limit(5);

    const fantasySubquery = knex("rank")
      .join("armies", "rank.army_id", "=", "armies.id")
      .join("users", "armies.user_id", "=", "users.id")
      .select("army_id", "date", "ranking", "armies.name", "users.known_as")
      .rowNumber("fn", { column: "date", order: "desc" }, "army_id")
      .where({ "armies.type": "fantasy" })
      .as("fantasyranks");

    const fantasyQuery = knex(fantasySubquery)
      .select("name", "known_as", "ranking", "fn")
      .where("fn", 1)
      .orderBy("ranking", "desc")
      .limit(5);

    res
      .status(200)
      .send({ fortyK: await fortyQuery, fantasy: await fantasyQuery });
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve rankings");
  }
};

module.exports = { fetchAllRankings, fetchTopFiveRanking };
