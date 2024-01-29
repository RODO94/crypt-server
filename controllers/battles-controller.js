const crypto = require("crypto");
const knex = require("knex")(require("../knexfile"));
const dayjs = require("dayjs");

const multiplayerKnexInsert = async (playerArray, teamID) => {
  teamArray = [];
  for (i = 0; i < playerArray.length; i++) {
    let playerID = crypto.randomUUID();
    let playerObj = {
      id: playerID,
      army_id: playerArray[i].army_id,
      team_id: teamID,
    };

    teamArray.push(playerObj);
    await knex("combatants").insert(playerObj);
  }
  return teamArray;
};

const singleToMultiCombatantUpdate = async (
  playerArray,
  prevPlayerID,
  teamID
) => {
  for (i = 0; i < playerArray.length; i++) {
    if (playerArray[i].id === prevPlayerID) {
      await knex("combatants").where(
        { id: prevPlayerID }.update({ team_id: teamID })
      );
    } else {
      await knex("combatants").insert({
        id: crypto.randomUUID(),
        army_id: playerArray[i].army_id,
        team_id: teamID,
      });
    }
  }

  return await knex("combatants").where({ team_id: teamID });
};

const deleteCombatantTeam = async (teamID) => {
  await knex("combatants").where({ team_id: teamID }).del();
  return;
};

const addCombatant = async (army_id, combatantID) => {
  await knex("combatants").insert({ id: combatantID, army_id: army_id });

  return await knex("combatants").where({ id: combatantID }).first();
};

const assignNewCombatant = async (battleID, combatantID, player) => {
  if (player === 1) {
    await knex("battles")
      .where({ id: battleID })
      .update({ player_1_id: combatantID });
  } else if (player === 2) {
    await knex("battles")
      .where({ id: battleID })
      .update({ player_2_id: combatantID });
  }
};

const fetchBattleCombatantArmy = async (playerID, player) => {
  const armyObj = await knex("battles")
    .join("combatants", `battles.player_${player}_id`, "=", "combatants.id")
    .where({ "combatants.id": playerID })
    .select("combatants.army_id")
    .first();

  return armyObj;
};

const fetchRecentArmyRank = async (armyID) => {
  const armyRankObj = await knex("rank")
    .where({ army_id: armyID })
    .orderBy("date", "desc")
    .first()
    .select("ranking");

  return armyRankObj;
};

const battleResultFantasy = (pointSize, playerOnePoints, playerTwoPoints) => {
  const pointsDifference = playerOnePoints - playerTwoPoints;

  pointsDifference < 0
    ? (pointsDifference = playerTwoPoints - playerOnePoints)
    : pointsDifference;

  if (pointSize > 0 && pointSize <= 1999) {
    return pointsDifference > 149 ? "victory" : "draw";
  } else if (pointSize > 1999 && pointSize <= 2999) {
    return pointsDifference > 299 ? "victory" : "draw";
  } else if (pointSize > 2999 && pointSize <= 3999) {
    return pointsDifference > 449 ? "victory" : "draw";
  } else if (pointSize > 3999 && pointSize <= 4999) {
    return pointsDifference > 599 ? "victory" : "draw";
  } else if (pointSize > 4999 && pointSize <= 5999) {
    return pointsDifference > 749 ? "victory" : "draw";
  } else if (pointSize > 5999) {
    return pointsDifference > 1199 ? "victory" : "draw";
  }
};

const battleResultFortyK = (playerOnePoints, playerTwoPoints) => {
  let finalResult = null;
  playerOnePoints > playerTwoPoints
    ? (finalResult = "victory")
    : playerOnePoints < playerTwoPoints
    ? (finalResult = "victory")
    : (finalResult = "draw");

  return finalResult;
};
const rankChangeDraw = (rankOne, rankTwo) => {
  let rankChangeOne = 0;
  let rankChangeTwo = 0;

  const rankOneDiff = rankTwo - rankOne;

  // If -10 : Rc is -1
  // if 10 : Rc is 1

  (rankOneDiff <= -10) | (rankOneDiff >= 10)
    ? (rankChangeOne = 1)
    : (rankChangeOne = rankOneDiff * 0.1);

  const rankTwoDiff = rankOne - rankTwo;

  (rankTwoDiff <= -10) | (rankTwoDiff >= 10)
    ? (rankChangeTwo = 1)
    : (rankChangeTwo = rankTwoDiff * 0.1);

  return { rankChangeOne: rankChangeOne, rankChangeTwo: rankChangeTwo };
};

const rankChangeWin = (winnerRank, loserRank) => {
  let rankChange = 0;

  const rankDiff = loserRank - winnerRank;

  rankDiff >= 10
    ? (rankChange = 2)
    : rankDiff <= -10
    ? (rankChange = 0)
    : (rankChange = rankDiff * 0.1 + 1);

  return rankChange;
};

const rankChangeLoss = (loserRank, winnerRank) => {
  let rankChange = 0;

  const rankDiff = winnerRank - loserRank;

  rankDiff >= 10
    ? (rankChange = 0)
    : rankDiff <= -10
    ? (rankChange = 2)
    : (rankChange = rankDiff * 0.1 - 1);

  return rankChange;
};

const createNewRank = async (newRank, armyID, battleType) => {
  const subquery = knex("rank")
    .join("armies", "rank.army_id", "=", "armies.id")
    .select("army_id", "date", "ranking")
    .rowNumber("rn", { column: "date", order: "desc" }, "army_id")
    .where({ "armies.type": battleType })
    .as("ranks");

  const query = knex(subquery)
    .select("army_id", "date", "ranking", "rn")
    .where("rn", 1)
    .orderBy("ranking", "desc");

  const currentRankPosition =
    (await query).findIndex((ranking) => ranking.army_id === armyID) + 1;

  const date = Date.now();

  const newRankObj = {
    id: crypto.randomUUID(),
    date: dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
    ranking: newRank,
    army_id: armyID,
    prev_ranking: currentRankPosition,
  };

  try {
    await knex("rank").insert(newRankObj);
    return newRankObj;
  } catch (error) {
    console.error(error);
    return error;
  }
};

const fetchAllBattles = async (req, res) => {
  try {
    const battleArray = await knex("battles");

    res.status(200).send(battleArray);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve all battles");
  }
};
const fetchUpcomingBattles = async (req, res) => {
  try {
    const date = Date.now();
    const battleArray = await knex("battles")
      .where("date", ">=", dayjs(date).format("YYYY-MM-DD HH:mm:ss"))
      .andWhere({ status: null });

    res.status(200).send(battleArray);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve all battles");
  }
};
const fetchCompletedBattles = async (req, res) => {
  try {
    const battleArray = await knex("battles").where({ status: "submitted" });

    res.status(200).send(battleArray);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve all battles");
  }
};

const fetchFiveUpcomingBattles = async (req, res) => {
  try {
    const date = Date.now();
    const battleArray = await knex("battles")
      .where("date", ">=", dayjs(date).format("YYYY-MM-DD HH:mm:ss"))
      .andWhere({ status: null })
      .limit(5);

    res.status(200).send(battleArray);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve all battles");
  }
};
const fetchFiveCompletedBattles = async (req, res) => {
  try {
    const battleArray = await knex("battles")
      .where({ status: "submitted" })
      .orderBy("date", "desc")
      .limit(5);

    res.status(200).send(battleArray);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve all battles");
  }
};

const fetchUsersUpcomingBattles = async (req, res) => {
  const userID = req.params.id;
  const date = Date.now();

  try {
    const battleArray = await knex("battles")
      .innerJoin("combatants", (builder) => {
        builder
          .on("battles.player_1_id", "=", "combatants.id")
          .orOn("battles.player_2_id", "=", "combatants.id");
      })
      .join("armies", "combatants.army_id", "=", "armies.id")
      .join("users", "armies.user_id", "=", "users.id")
      .where("users.id", "=", userID)
      .andWhere("date", ">=", dayjs(date).format("YYYY-MM-DD HH:mm:ss"))
      .andWhere({ status: null });

    return res.status(200).send(battleArray);
  } catch (error) {
    console.error(error);
    return res.status(400).send("unable to retrive the battles");
  }
};

const fetchUsersCompletedBattles = async (req, res) => {
  const userID = req.params.id;

  try {
    const battleArray = await knex("battles")
      .innerJoin("combatants", (builder) => {
        builder
          .on("battles.player_1_id", "=", "combatants.id")
          .orOn("battles.player_2_id", "=", "combatants.id");
      })
      .join("armies", "combatants.army_id", "=", "armies.id")
      .join("users", "armies.user_id", "=", "users.id")
      .where("users.id", "=", userID)
      .andWhere({ status: "submitted" });

    return res.status(200).send(battleArray);
  } catch (error) {
    console.error(error);
    return res.status(400).send("unable to retrive the battles");
  }
};

const fetchAllUsersBattles = async (req, res) => {
  const userID = req.params.id;

  try {
    const battleArray = await knex("battles")
      .innerJoin("combatants", (builder) => {
        builder
          .on("battles.player_1_id", "=", "combatants.id")
          .orOn("battles.player_2_id", "=", "combatants.id");
      })
      .join("armies", "combatants.army_id", "=", "armies.id")
      .join("users", "armies.user_id", "=", "users.id")
      .where("users.id", "=", userID)
      .select(
        "battles.id",
        "battles.date",
        "armies.name",
        "combatants.army_id"
      );

    return res.status(200).send(battleArray);
  } catch (error) {
    console.error(error);
    return res.status(400).send("unable to retrive the battles");
  }
};

const fetchAllUsersBattlesCount = async (req, res) => {
  const userID = req.params.id;

  try {
    const battleArray = await knex("battles")
      .innerJoin("combatants", (builder) => {
        builder
          .on("battles.player_1_id", "=", "combatants.id")
          .orOn("battles.player_2_id", "=", "combatants.id");
      })
      .join("armies", "combatants.army_id", "=", "armies.id")
      .join("users", "armies.user_id", "=", "users.id")
      .where("users.id", "=", userID)
      .select(
        "battles.id",
        "battles.date",
        "armies.name",
        "combatants.army_id"
      );

    return res.status(200).send({ count: battleArray.length });
  } catch (error) {
    console.error(error);
    return res.status(400).send("unable to retrive the battles");
  }
};

const fetchUsersCompletedBattlesCount = async (req, res) => {
  const userID = req.params.id;

  try {
    const battleArray = await knex("battles")
      .innerJoin("combatants", (builder) => {
        builder
          .on("battles.player_1_id", "=", "combatants.id")
          .orOn("battles.player_2_id", "=", "combatants.id");
      })
      .join("armies", "combatants.army_id", "=", "armies.id")
      .join("users", "armies.user_id", "=", "users.id")
      .where("users.id", "=", userID)
      .andWhere({ status: "submitted" });

    return res.status(200).send({ count: battleArray.length });
  } catch (error) {
    console.error(error);
    return res.status(400).send("unable to retrive the battles");
  }
};
const fetchUsersUpcomingBattlesCount = async (req, res) => {
  const userID = req.params.id;
  const date = Date.now();

  try {
    const battleArray = await knex("battles")
      .innerJoin("combatants", (builder) => {
        builder
          .on("battles.player_1_id", "=", "combatants.id")
          .orOn("battles.player_2_id", "=", "combatants.id");
      })
      .join("armies", "combatants.army_id", "=", "armies.id")
      .join("users", "armies.user_id", "=", "users.id")
      .where("users.id", "=", userID)
      .andWhere("date", ">=", dayjs(date).format("YYYY-MM-DD HH:mm:ss"))
      .andWhere({ status: null });

    return res.status(200).send({ count: battleArray.length });
  } catch (error) {
    console.error(error);
    return res.status(400).send("unable to retrive the battles");
  }
};

const fetchUsersWinCount = async (req, res) => {
  const userID = req.params.id;
  const date = Date.now();

  try {
    const winArray = knex("battles")
      .crossJoin("combatants", (builder) => {
        builder
          .on("battles.player_1_id", "=", "combatants.id")
          .orOn("battles.player_2_id", "=", "combatants.id");
      })
      .join("armies", "combatants.army_id", "=", "armies.id")
      .join("users", "armies.user_id", "=", "users.id")
      .where("users.id", "=", userID)
      .where({ status: "submitted" })
      .select("battles.winner", "combatants.army_id", "combatants.id")
      .as("wins");

    const winnerCountArray = (await winArray)
      .map((win) => {
        if (win.winner === win.id) {
          return true;
        } else {
          return;
        }
      })
      .filter((bool) => bool === true);

    return res.status(200).send({ count: winnerCountArray.length });
  } catch (error) {
    console.error(error);
    return res.status(400).send("unable to retrive the battles");
  }
};

const fetchUsersWinPercent = async (req, res) => {
  const userID = req.params.id;
  const date = Date.now();

  try {
    const winArray = await knex("battles")
      .crossJoin("combatants", (builder) => {
        builder
          .on("battles.player_1_id", "=", "combatants.id")
          .orOn("battles.player_2_id", "=", "combatants.id");
      })
      .join("armies", "combatants.army_id", "=", "armies.id")
      .join("users", "armies.user_id", "=", "users.id")
      .where("users.id", "=", userID)
      .where({ status: "submitted" })
      .select("battles.winner", "combatants.army_id", "combatants.id")
      .as("wins");

    const winnerCountArray = winArray
      .map((win) => {
        if (win.winner === win.id) {
          return true;
        } else {
          return;
        }
      })
      .filter((bool) => bool === true);

    if (winnerCountArray.length === 0) {
      return res.status(200).send({ percent: 0 });
    }

    let winPercent = Math.round(
      (winnerCountArray.length / winArray.length) * 100
    );

    return res.status(200).send({ percent: winPercent });
  } catch (error) {
    console.error(error);
    return res.status(400).send("unable to retrive the battles");
  }
};

module.exports = {
  multiplayerKnexInsert,
  singleToMultiCombatantUpdate,
  deleteCombatantTeam,
  addCombatant,
  assignNewCombatant,
  fetchBattleCombatantArmy,
  fetchRecentArmyRank,
  rankChangeDraw,
  rankChangeWin,
  rankChangeLoss,
  createNewRank,
  fetchAllBattles,
  fetchUpcomingBattles,
  fetchCompletedBattles,
  fetchFiveUpcomingBattles,
  fetchFiveCompletedBattles,
  battleResultFantasy,
  battleResultFortyK,
  fetchUsersUpcomingBattles,
  fetchUsersCompletedBattles,
  fetchAllUsersBattles,
  fetchAllUsersBattlesCount,
  fetchUsersUpcomingBattlesCount,
  fetchUsersWinCount,
  fetchUsersCompletedBattlesCount,
  fetchUsersWinPercent,
};
