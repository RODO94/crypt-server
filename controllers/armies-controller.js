const knex = require("knex")(require("../knexfile"));
const dayjs = require("dayjs");
const crypto = require("crypto");

const updateArmyField = async (armyID, fieldName, newValue) => {
  try {
    await knex("armies").where({ id: armyID }).update(`${fieldName}`, newValue);

    return await knex("armies").where({ id: armyID }).first();
  } catch (error) {
    console.error(error);
    return "Unable to update";
  }
};

const fetchOneArmy = async (req, res) => {
  const id = req.params.id;

  try {
    const armyObj = await knex("armies").where({ id: id }).first();

    if (!armyObj) {
      return res
        .status(400)
        .send("We cannot find the army you are looking for");
    }

    res.status(200).send(armyObj);
  } catch (error) {
    console.error(error);
    res.status(400).send("We cannot process your request right now");
  }
};

const addNewArmyRanking = async (req, res) => {
  const armyID = req.params.id;
  const { newRank } = req.body;

  if (!newRank) {
    return res.status(400).send("Please add the new rank to the request body");
  }

  const armyObj = await knex("armies").where({ id: armyID }).first();

  if (!armyObj) {
    return res.status(400).send(`Can't find the army with ID: ${armyID}`);
  }

  try {
    const subquery = knex("rank")
      .join("armies", "rank.army_id", "=", "armies.id")
      .select("army_id", "date", "ranking")
      .rowNumber("rn", { column: "date", order: "desc" }, "army_id")
      .where({ "armies.type": armyObj.type })
      .as("ranks");

    const query = knex(subquery)
      .select("army_id", "date", "ranking", "rn")
      .where("rn", 1)
      .orderBy("ranking", "desc");

    const currentRankPosition =
      (await query).findIndex((ranking) => ranking.army_id === armyID) + 1;

    const date = Date.now();

    const newRankObj = {
      date: dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
      id: crypto.randomUUID(),
      army_id: armyID,
      ranking: newRank,
      prev_ranking: currentRankPosition,
    };

    await knex("rank").insert(newRankObj);

    res.status(200).send(newRankObj);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to update the rank");
  }
};

module.exports = { updateArmyField, addNewArmyRanking, fetchOneArmy };
