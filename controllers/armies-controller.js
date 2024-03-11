const knex = require("knex")(require("../knexfile"));
const dayjs = require("dayjs");
const crypto = require("crypto");
const { completedArmiesBattleFormatting } = require("../utils/ArrayMethods");

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

const getAllArmies = async (req, res) => {
  try {
    const armyArray = await knex("armies").select("*");
    console.log(knex.client.pool.numUsed());
    res.status(200).send(armyArray);
  } catch (error) {
    console.error(error);
    res.status(400).send(error);
  }
};
const getAllUserArmies = async (req, res) => {
  const id = req.params.id;
  try {
    let battleArray = await knex("battles")
      .innerJoin("combatants", (builder) => {
        builder
          .on("battles.player_1_id", "=", "combatants.id")
          .orOn("battles.player_2_id", "=", "combatants.id");
      })
      .join("armies", "combatants.army_id", "=", "armies.id")
      .where("armies.user_id", "=", id)
      .rowNumber("count", { column: "user_id", order: "desc" }, "army_id")
      .select("army_id", "armies.name", "armies.type")
      .as("battleArray");

    const maxCountArray = [];

    battleArray.forEach((army) => {
      const targetObj = maxCountArray.find(
        (targetArmy) => targetArmy.army_id === army.army_id
      );
      if (!targetObj) {
        maxCountArray.push(army);
      } else if (targetObj) {
        const targetIndex = maxCountArray.findIndex(
          (targetArmy) => targetArmy.army_id === army.army_id
        );

        maxCountArray[targetIndex].count = army.count;
      }
    });

    res.status(200).send(maxCountArray);
  } catch (error) {
    console.error(error);
    res.status(400).send(error);
  }
};

const getArmyNemesis = async (req, res) => {
  try {
    const armyID = req.params.id;

    const formattedBattleArray = await completedArmiesBattleFormatting(armyID);

    console.log(knex.client.pool.numUsed());

    let opponentArray = [];

    let playerOneArray = formattedBattleArray.map((battle) => {
      return battle.player_1;
    });

    let playerTwoArray = formattedBattleArray.map((battle) => {
      return battle.player_2;
    });

    playerOneArray.map((player, index) => {
      let playerBool = false;
      for (let i = 0; i < player.length; i++) {
        if (player[i].army_id === armyID) {
          playerBool = true;
        }
      }
      if (playerBool === false) {
        opponentArray.push(player);
        false;
      }
    });

    playerTwoArray.map((player) => {
      let playerBool = false;
      for (let i = 0; i < player.length; i++) {
        if (player[i].army_id === armyID) {
          playerBool = true;
        }
      }
      if (playerBool === false) {
        opponentArray.push(player);
        false;
      }
    });

    const flatOpponentArray = opponentArray.flat(1);

    let armyArray = [];

    flatOpponentArray.forEach((army) => {
      let armyBool = false;
      for (let i = 0; i < armyArray.length; i++) {
        if (
          armyArray[i].id === army.id &&
          armyArray[i].name === army.name &&
          armyArray[i].known_as === army.known_as
        ) {
          armyBool = true;
          armyArray[i].count++;
        }
      }
      if (armyBool !== true) {
        armyArray.push({ count: 1, ...army });
      }
    });

    const sortedOpponentArray = armyArray.sort((a, b) => b.count - a.count);
    console.log(knex.client.pool.numUsed());

    res.status(200).send(sortedOpponentArray[0]);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve user");
  }
};

const getArmyAlly = async (req, res) => {
  try {
    const armyID = req.params.id;

    const formattedBattleArray = await completedArmiesBattleFormatting(armyID);

    let opponentArray = [];

    let playerOneArray = formattedBattleArray.map((battle) => {
      return battle.player_1;
    });

    let playerTwoArray = formattedBattleArray.map((battle) => {
      return battle.player_2;
    });

    playerOneArray.map((player) => {
      let playerBool = false;
      for (let i = 0; i < player.length; i++) {
        if (player[i].army_id === armyID) {
          playerBool = true;
        }
      }
      if (playerBool === true) {
        opponentArray.push(player);
        playerBool = false;
      }
    });

    playerTwoArray.map((player) => {
      let playerBool = false;
      for (let i = 0; i < player.length; i++) {
        if (player[i].army_id === armyID) {
          playerBool = true;
        }
      }
      if (playerBool === true) {
        opponentArray.push(player);
        playerBool = false;
      }
    });

    const flatOpponentArray = opponentArray.flat(1);

    let armyArray = [];

    flatOpponentArray.forEach((army) => {
      let armyBool = false;
      for (let i = 0; i < armyArray.length; i++) {
        if (
          armyArray[i].id === army.id &&
          armyArray[i].name === army.name &&
          armyArray[i].known_as === army.known_as
        ) {
          armyBool = true;
          armyArray[i].count++;
        }
      }
      if (armyBool !== true) {
        armyArray.push({ count: 1, ...army });
      }
    });

    const filteredArmyArray = armyArray.filter(
      (player) => player.army_id !== armyID
    );

    const sortedOpponentArray = filteredArmyArray.sort(
      (a, b) => b.count - a.count
    );

    console.log(knex.client.pool.numUsed());

    res.status(200).send({
      target: sortedOpponentArray[0],
      formattedBattleArray: formattedBattleArray,
    });
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve user");
  }
};

const insertNewArmy = async (armyObj) => {
  try {
    await knex("armies").insert(armyObj);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};
module.exports = {
  updateArmyField,
  addNewArmyRanking,
  fetchOneArmy,
  getAllArmies,
  getArmyNemesis,
  getArmyAlly,
  getAllUserArmies,
  insertNewArmy,
};
