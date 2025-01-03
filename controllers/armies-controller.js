const database = require("../database/db");
const dayjs = require("dayjs");
const crypto = require("crypto");
const { completedArmiesBattleFormatting } = require("../utils/ArrayMethods");

// const pool = database.client.pool;

// database.on("query", (builder) => {
//   console.log("Army Controller to be executed", builder.sql);
//   console.log("Army Controller Pool Used on Start", pool.numUsed());
//   console.log("Army Controller Pool Used on Start", pool.numPendingAcquires());

//   console.log("Army Controller Pool Free on Start", pool.numFree());
// });

// database.on("query-response", (response, builder) => {
//   console.log("Army Controller Query executed successfully:", builder.sql);
//   console.log("Army Controller Pool Used on response", pool.numUsed());
//   console.log("Army Controller Pool Free on response", pool.numFree());
// });

// database.on("query-error", (error, builder) => {
//   console.error("Error executing query:", builder.sql, error);
//   console.log("Army Controller Error Pool Used on error", pool.numUsed());
//   console.log("Army Controller Error Pool Free on error", pool.numFree());
// });

const armyCountFn = (array) => {
  const returnArray = [];
  array.forEach((army) => {
    let armyBool = false;
    for (let i = 0; i < returnArray.length; i++) {
      if (
        returnArray[i].id === army.id &&
        returnArray[i].name === army.name &&
        returnArray[i].known_as === army.known_as
      ) {
        armyBool = true;
        returnArray[i].count++;
      }
    }
    if (armyBool !== true) {
      returnArray.push({ count: 1, ...army });
    }
  });

  return returnArray;
};

const updateArmyField = async (armyID, fieldName, newValue) => {
  try {
    await database("armies")
      .where({ id: armyID })
      .update(`${fieldName}`, newValue);

    return await database("armies").where({ id: armyID }).first();
  } catch (error) {
    console.error(error);
    return "Unable to update";
  }
};

const fetchOneArmy = async (req, res) => {
  const id = req.params.id;

  try {
    const armyObj = await database("armies").where({ id: id }).first();

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

  const armyObj = await database("armies").where({ id: armyID }).first();

  if (!armyObj) {
    return res.status(400).send(`Can't find the army with ID: ${armyID}`);
  }

  try {
    const subquery = database("rank")
      .join("armies", "rank.army_id", "=", "armies.id")
      .select("army_id", "date", "ranking")
      .rowNumber("rn", { column: "date", order: "desc" }, "army_id")
      .where({ "armies.type": armyObj.type })
      .as("ranks");

    const query = database(subquery)
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

    await database("rank").insert(newRankObj);

    res.status(200).send(newRankObj);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to update the rank");
  }
};

const getAllArmies = async (req, res) => {
  try {
    const armyArray = await database("armies").select("*");
    res.status(200).send(armyArray);
  } catch (error) {
    console.error(error);
    res.status(400).send(error);
  }
};
const getAllUserArmies = async (req, res) => {
  const id = req.params.id;
  try {
    let battleArray = await database("battles")
      .innerJoin("combatants", (builder) => {
        builder
          .on("battles.player_1_id", "=", "combatants.id")
          .orOn("battles.player_2_id", "=", "combatants.id");
      })
      .join("armies", "combatants.army_id", "=", "armies.id")
      .where("armies.user_id", "=", id)
      .rowNumber("count", { column: "user_id", order: "desc" }, "army_id")
      .select("army_id", "armies.name", "armies.type", "armies.emblem")
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

    const formattedBattleArray = await completedArmiesBattleFormatting();

    const filterArray = formattedBattleArray.filter((battle) => {
      const playerOneBool = battle.player_1.find(
        (player) => player.army_id === armyID
      );
      const playerTwoBool = battle.player_2.find(
        (player) => player.army_id === armyID
      );
      if (playerOneBool || playerTwoBool) {
        return true;
      } else {
        return false;
      }
    });

    let opponentArray = [];

    let playerOneArray = filterArray.map((battle) => {
      return battle.player_1;
    });

    let playerTwoArray = filterArray.map((battle) => {
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

    // console.log(formattedBattleArray[0].player_1);

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
    const filterArray = formattedBattleArray.filter((battle) => {
      const playerOneBool = battle.player_1.find(
        (player) => player.army_id === armyID
      );
      const playerTwoBool = battle.player_2.find(
        (player) => player.army_id === armyID
      );
      if (playerOneBool || playerTwoBool) {
        return true;
      } else {
        return false;
      }
    });

    let opponentArray = [];

    let playerOneArray = filterArray.map((battle) => {
      return battle.player_1;
    });

    let playerTwoArray = filterArray.map((battle) => {
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

    res.status(200).send({
      target: sortedOpponentArray[0],
      formattedBattleArray: formattedBattleArray,
    });
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve user");
  }
};

const getArmyInfo = async (req, res) => {
  try {
    const armyID = req.params.id;

    const formattedBattleArray = await completedArmiesBattleFormatting(armyID);

    const filterArray = formattedBattleArray.filter((battle) => {
      const playerOneBool = battle.player_1.find(
        (player) => player.army_id === armyID
      );
      const playerTwoBool = battle.player_2.find(
        (player) => player.army_id === armyID
      );
      if (playerOneBool || playerTwoBool) {
        return true;
      } else {
        return false;
      }
    });

    const armyObj = await database("rank_view")
      .join("armies", "armies.id", "=", "rank_view.army_id")
      .join("users", "armies.user_id", "=", "users.id")
      .select("armies.*", "users.known_as", "rn", "ranking")
      .where("armies.id", "=", armyID)
      .andWhere("rn", "=", 1)
      .first();

    if (!filterArray[0]) {
      return res.status(200).send({
        nemesis: {},
        ally: {},
        user: armyObj,
        battleCount: 0,
        winPercent: 0,
      });
    }

    let opponentArray = [];
    let friendArray = [];

    let playerOneArray = filterArray.map((battle) => {
      return battle.player_1;
    });

    let playerTwoArray = filterArray.map((battle) => {
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
        friendArray.push(player);
        playerBool = false;
      } else {
        opponentArray.push(player);
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
        friendArray.push(player);
        playerBool = false;
      } else {
        opponentArray.push(player);
      }
    });

    const flatOpponentArray = opponentArray.flat(1);
    const flatAllyArray = friendArray.flat(1);

    let nemesisArray = armyCountFn(flatOpponentArray);
    let allyArray = armyCountFn(flatAllyArray);

    let sortedNemesisArray = nemesisArray.sort((a, b) => b.count - a.count);
    let sortedAllyArray = allyArray
      .filter((player) => player.army_id !== armyID)
      .sort((a, b) => b.count - a.count);

    let userArray = allyArray.filter((player) => player.army_id === armyID);

    let winArray = filterArray
      .map((battle) => {
        let playerBool = battle.player_1.find(
          (player) => player.army_id === armyID
        );
        const targetPlayer = playerBool ? 1 : 2;

        const winnerPlayer = battle.combatant_1_id === battle.winner ? 1 : 2;

        if (targetPlayer === winnerPlayer && battle.result !== "draw") {
          return "win";
        }
      })
      .filter((win) => win);

    const winPercent = Math.round((winArray.length / filterArray.length) * 100);

    res.status(200).send({
      nemesis: sortedNemesisArray[0],
      ally: sortedAllyArray[0],
      user: armyObj,
      battleCount: filterArray.length,
      winPercent,
    });
  } catch (error) {
    console.error(error);
    res.status(400).send(error.response);
  }
};
const insertNewArmy = async (armyObj, trx) => {
  try {
    await trx("armies").insert(armyObj);
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
  getArmyInfo,
  armyCountFn,
};
