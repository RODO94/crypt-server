const knex = require("knex")(require("../knexfile"));

const pool = knex.client.pool;

knex.on("start", (builder) => {
  console.log(("Pool Used on Start", pool.numUsed()));
  console.log(("Pool Free on Start", pool.numFree()));
});

knex.on("query-response", (response, builder) => {
  console.log("Query executed successfully:", builder.sql);
  console.log("Pool Used", pool.numUsed());
  console.log("Pool Free on on response", pool.numFree());
});

const fetchAllRankings = async (req, res) => {
  try {
    const rankArray = await knex("rank_view")
      .join("armies", "armies.id", "=", "army_id")
      .join("users", "armies.user_id", "=", "users.id")
      .where("rn", "=", 1);

    const fantasyArray = rankArray.filter(
      (army) => army.type.toLowerCase() === "fantasy"
    );

    const fortykArray = rankArray.filter(
      (army) => army.type.toLowerCase() === "40k"
    );

    res.status(200).send({ fortyK: fortykArray, fantasy: fantasyArray });
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve rankings");
  }
};

const fetchTopFiveRanking = async (req, res) => {
  try {
    const rankArray = await knex("rank_view")
      .join("armies", "armies.id", "=", "army_id")
      .join("users", "armies.user_id", "=", "users.id")
      .where("rn", "=", 1);

    const fantasyArray = rankArray
      .filter((army) => army.type.toLowerCase() === "fantasy")
      .map((army, index) => {
        if (index < 5) {
          return army;
        } else {
          return " ";
        }
      })
      .filter((army) => army !== " ");

    const fortykArray = rankArray
      .filter((army) => army.type.toLowerCase() === "40k")
      .map((army, index) => {
        if (index < 5) {
          return army;
        } else {
          return " ";
        }
      })
      .filter((army) => army !== " ");

    res.status(200).send({ fortyK: fortykArray, fantasy: fantasyArray });
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve rankings");
  }
};

const fetchOneRanking = async (req, res) => {
  const armyID = req.params.id;
  try {
    const rankArray = await knex("rank")
      .where({ army_id: armyID })
      .orderBy("date", "desc");

    if (!rankArray) {
      res.status(400).send("Cannot find any Rank for the Army you sent");
    }

    res.status(200).send(rankArray[0]);
  } catch (error) {
    console.error(error);
    res.status(400).send(error);
  }
};

module.exports = { fetchAllRankings, fetchTopFiveRanking, fetchOneRanking };
