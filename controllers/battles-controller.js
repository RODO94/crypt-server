const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const database = require("../database/db");
const dayjs = require("dayjs");
const {
  battleFormatting,
  CompletedBattleFormatting,
  completedBattleFormattingLimited,
  upcomingBattleFormatting,
  upcomingBattleFormattingLimited,
  completedBattleFormatting,
  formatOneBattle,
} = require("../utils/ArrayMethods");
const { getTokenProfile } = require("../utils/Auth");

const createCombatant = async (playerObj, trx) => {
  try {
    await database("combatants").insert(playerObj);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const multiplayerMapping = (playerArray, teamID) => {
  const mappedPlayerArray = playerArray.map((player) => {
    return {
      id: crypto.randomUUID(),
      army_id: player.army_id,
      team_id: teamID,
    };
  });

  return mappedPlayerArray;
};

const singleToMultiCombatantUpdate = async (
  playerArray,
  prevPlayerID,
  teamID
) => {
  for (i = 0; i < playerArray.length; i++) {
    if (playerArray[i].id === prevPlayerID) {
      await database("combatants").where(
        { id: prevPlayerID }.update({ team_id: teamID })
      );
    } else {
      await database("combatants").insert({
        id: crypto.randomUUID(),
        army_id: playerArray[i].army_id,
        team_id: teamID,
      });
    }
  }

  return await database("combatants").where({ team_id: teamID });
};

const deleteCombatantTeam = async (teamID) => {
  await database("combatants").where({ team_id: teamID }).del();
  return;
};

const addCombatant = async (army_id, combatantID) => {
  await database("combatants").insert({ id: combatantID, army_id: army_id });

  return await database("combatants").where({ id: combatantID }).first();
};

const assignNewCombatant = async (battleID, combatantID, player) => {
  if (player === 1) {
    await database("battles")
      .where({ id: battleID })
      .update({ player_1_id: combatantID });
  } else if (player === 2) {
    await database("battles")
      .where({ id: battleID })
      .update({ player_2_id: combatantID });
  }
};

const fetchBattleCombatantArmy = async (playerID, player) => {
  const armyObj = await database("battles")
    .join("combatants", `battles.player_${player}_id`, "=", "combatants.id")
    .where({ "combatants.id": playerID })
    .select("combatants.army_id")
    .first();

  return armyObj;
};

const fetchRecentArmyRank = async (armyID) => {
  const armyRankObj = await database("rank")
    .where({ army_id: armyID })
    .orderBy("date", "desc")
    .first()
    .select("ranking");

  return armyRankObj;
};

const battleResultFantasy = (pointSize, playerOnePoints, playerTwoPoints) => {
  let pointsDifference = playerOnePoints - playerTwoPoints;

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
    ? (rankChange = -2)
    : (rankChange = rankDiff * 0.1 - 1);

  return rankChange;
};

const createNewRank = async (newRank, armyID, date, type) => {
  const query = await database("rank_view")
    .join("armies", "army_id", "=", "armies.id")
    .where("rn", 1)
    .andWhere("armies.type", "=", type)
    .orderBy("ranking", "desc");

  const currentRankPosition =
    query.findIndex((ranking) => ranking.army_id === armyID) + 1;

  const newRankObj = {
    id: crypto.randomUUID(),
    date: date,
    ranking: newRank,
    army_id: armyID,
    prev_ranking: currentRankPosition,
  };

  try {
    await database("rank").insert(newRankObj);
    return newRankObj;
  } catch (error) {
    console.error(error);
    return error;
  }
};

const deleteCreateNewRank = async (newRank, armyID, battleType) => {
  const deleteQuery = await database("rank_view")
    .where("rn", 1)
    .andWhere({ army_id: armyID })
    .first();

  const deleteRankResponse = await database("rank")
    .where({
      id: deleteQuery.id,
    })
    .delete();

  const query = await database("rank_view")
    .where("rn", 1)
    .andWhere({ army_id: armyID })
    .orderBy("ranking", "desc");

  const currentRankPosition =
    query.findIndex((ranking) => ranking.army_id === armyID) + 1;

  // TODO: Change date to date of battle
  const date = Date.now();

  const newRankObj = {
    id: crypto.randomUUID(),
    date: dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
    ranking: newRank,
    army_id: armyID,
    prev_ranking: currentRankPosition,
  };

  try {
    await database("rank").insert(newRankObj);
    return newRankObj;
  } catch (error) {
    console.error(error);
    return error;
  }
};

const fetchAllBattles = async (req, res) => {
  try {
    const battleArray = await database("battles");

    const formattedBattleArray = await battleFormatting(battleArray);

    res.status(200).send(formattedBattleArray);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve all battles");
  }
};
const fetchUpcomingBattles = async (req, res) => {
  try {
    const formattedBattleArray = await upcomingBattleFormatting();

    const sortedArray = formattedBattleArray.sort(
      (a, b) =>
        dayjs(a.date, "YYYY-MM-DD").valueOf() -
        dayjs(b.date, "YYYY-MM-DD").valueOf()
    );

    res.status(200).send(sortedArray);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve all battles");
  }
};
const fetchCompletedBattles = async (req, res) => {
  try {
    const formattedBattleArray = await completedBattleFormatting();

    res.status(200).send(formattedBattleArray);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve all battles");
  }
};

const fetchFiveUpcomingBattles = async (req, res) => {
  try {
    const formattedBattleArray = await upcomingBattleFormattingLimited();
    const sortedArray = formattedBattleArray.sort(
      (a, b) =>
        dayjs(`${a.date} ${a.start}`, "YYYY-MM-DD hh:mm:ss").valueOf() -
        dayjs(`${b.date} ${b.start}`, "YYYY-MM-DD hh:mm:ss").valueOf()
    );
    const currentDate = dayjs(Date.now());

    const finalArray = sortedArray
      .filter((battle) => {
        let dateOne = dayjs(battle.date, "YYYY-MM-dd");
        let difference = dateOne.diff(currentDate, "day");
        if (difference >= 0) {
          return true;
        } else return false;
      })
      .map((battle, index) => (index < 5 ? battle : ""))
      .filter((battle) => battle !== "");

    res.status(200).send(finalArray);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve all battles");
  }
};
const fetchFiveCompletedBattles = async (req, res) => {
  try {
    const responseArray = await completedBattleFormattingLimited();

    res.status(200).send(responseArray);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve all battles");
  }
};

const fetchUsersUpcomingBattles = async (req, res) => {
  const date = Date.now();

  const authToken = req.headers.authorization.split(" ")[1];

  try {
    const decodedToken = jwt.verify(authToken, process.env.JWT_KEY);
    const profile = await database("users")
      .where({ id: decodedToken.id })
      .first();

    delete profile.password;
    const userID = profile.id;

    const formattedBattleArray = await upcomingBattleFormatting();
    const filteredUserArray = formattedBattleArray.filter(
      (battle) => battle.user_1_id === userID || battle.user_2_id === userID
    );

    const sortedArray = filteredUserArray.sort(
      (a, b) =>
        dayjs(`${a.date} ${a.start}`, "YYYY-MM-DD hh:mm:ss").valueOf() -
        dayjs(`${b.date} ${b.start}`, "YYYY-MM-DD hh:mm:ss").valueOf()
    );

    res.status(200).send({ user: profile, battleArray: sortedArray });
  } catch (error) {
    console.error(error);
    return res.status(400).send("unable to retrive the battles");
  }
};

const fetchOneBattle = async (req, res) => {
  const id = req.params.id;
  try {
    const newBattleObj = await formatOneBattle(id);
    res.status(200).send(newBattleObj[0]);
  } catch (error) {
    console.error(error);
    res.status(400).send("We are unable to find your battle right now");
  }
};

const fetchUsersCompletedBattles = async (req, res) => {
  const authToken = req.headers.authorization.split(" ")[1];

  try {
    const decodedToken = jwt.verify(authToken, process.env.JWT_KEY);
    // const profile = await database("users").where({ id: decodedToken.id }).first();

    const profile = await getTokenProfile(decodedToken.id);

    delete profile.password;
    const userID = profile.id;

    const formattedBattleArray = await completedBattleFormatting();

    const filteredUserArray = formattedBattleArray.filter(
      (battle) => battle.user_1_id === userID || battle.user_2_id === userID
    );

    const sortedArray = filteredUserArray.sort(
      (a, b) =>
        dayjs(b.date, "YYYY-MM-DD").valueOf() -
        dayjs(a.date, "YYYY-MM-DD").valueOf()
    );
    res.status(200).send(sortedArray);
  } catch (error) {
    console.error(error);
    return res.status(400).send("unable to retrive the battles");
  }
};

const fetchUsersLastFiveBattles = async (req, res) => {
  const authToken = req.headers.authorization.split(" ")[1];

  try {
    const decodedToken = jwt.verify(authToken, process.env.JWT_KEY);

    const profile = await getTokenProfile(decodedToken.id);

    delete profile.password;
    const userID = profile.id;

    const formattedBattleArray = await completedBattleFormatting();

    const filteredUserArray = formattedBattleArray.filter(
      (battle) => battle.user_1_id === userID || battle.user_2_id === userID
    );

    const sortedArray = filteredUserArray
      .sort(
        (a, b) =>
          dayjs(b.date, "YYYY-MM-DD").valueOf() -
          dayjs(a.date, "YYYY-MM-DD").valueOf()
      )
      .slice(0, 4);

    const winnerArray = sortedArray.map((battle) => {
      if (battle.result === "draw") {
        return { ...battle, userResult: "draw" };
      }

      const { user_1_id: userOneId } = battle;
      const whichPlayerIsUser = userID === userOneId ? "one" : "two";
      const { winner, combatant_1_id } = battle;

      const whoIsWinner = winner === combatant_1_id ? "playerOne" : "playerTwo";

      if (whoIsWinner === "playerOne" && whichPlayerIsUser === "one") {
        return { ...battle, userResult: "win" };
      } else if (whoIsWinner === "playerTwo" && whichPlayerIsUser === "two") {
        return { ...battle, userResult: "win" };
      } else {
        return { ...battle, userResult: "loss" };
      }
    });

    res.status(200).send(winnerArray);
  } catch (error) {
    console.error(error);
    return res.status(400).send("unable to retrive the battles");
  }
};

const fetchAllUsersBattles = async (req, res) => {
  const userID = req.params.id;

  try {
    const battleArray = await database("battles")
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

    const formattedBattleArray = await CompletedBattleFormatting(battleArray);

    res.status(200).send(formattedBattleArray);
  } catch (error) {
    console.error(error);
    return res.status(400).send("unable to retrive the battles");
  }
};

const fetchAllUsersBattlesCount = async (req, res) => {
  const userID = req.params.id;

  try {
    const battleArray = await database("battles")
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
    const battleArray = await database("battles")
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
    const battleArray = await database("battles")
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
    const winArray = database("battles")
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
    const winArray = await database("battles")
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
  multiplayerMapping,
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
  fetchUsersLastFiveBattles,
  fetchAllUsersBattles,
  fetchAllUsersBattlesCount,
  fetchUsersUpcomingBattlesCount,
  fetchUsersWinCount,
  fetchUsersCompletedBattlesCount,
  fetchUsersWinPercent,
  fetchOneBattle,
  createCombatant,
  deleteCreateNewRank,
};
