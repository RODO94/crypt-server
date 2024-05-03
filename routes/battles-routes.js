const express = require("express");
const database = require("../database/db");
const router = express.Router();
const crypto = require("crypto");
const dayjs = require("dayjs");
const cors = require("cors");

const jwt = require("jsonwebtoken");

require("dotenv").config();

const {
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
  battleResultFantasy,
  battleResultFortyK,
  fetchFiveUpcomingBattles,
  fetchFiveCompletedBattles,
  fetchUsersUpcomingBattles,
  fetchUsersCompletedBattles,
  fetchAllUsersBattles,
  fetchAllUsersBattlesCount,
  fetchUsersUpcomingBattlesCount,
  fetchUsersCompletedBattlesCount,
  fetchUsersWinCount,
  fetchUsersWinPercent,
  fetchOneBattle,
  multiplayerMapping,
  deleteCreateNewRank,
} = require("../controllers/battles-controller");
const { headerAuth, adminAuth } = require("../middleware/auth");
const pool = database.client.pool;

// database.on("query", (builder) => {
//   console.log("Battle Routes to be executed", builder.sql);
//   console.log("Battle Routes Pool Used on Start", pool.numUsed());
//   console.log("Battle Routes Pool Used on Start", pool.numPendingAcquires());
//   console.log("Battle Routes Pool Free on Start", pool.numFree());
// });

// database.on("query-response", (response, builder) => {
//   console.log("Battle Routes Query executed successfully:", builder.sql);
//   console.log("Battle Routes Pool Used on response", pool.numUsed());
//   console.log("Battle Routes Pool Free on response", pool.numFree());
// });

// database.on("query-error", (error, builder) => {
//   console.error("Error executing query:", builder.sql, error);
//   console.log("Battle Routes Error Pool Used on error", pool.numUsed());
//   console.log("Battle Routes Error Pool Free on error", pool.numFree());
// });

router.route("/create").post(headerAuth, async (req, res) => {
  let {
    points_size,
    battle_type,
    player_type,
    player_1,
    player_2,
    date,
    start,
    finish,
    table,
    scenario,
  } = req.body;

  if (
    !points_size |
    !battle_type |
    !player_type |
    !player_1 |
    !player_2 |
    !date |
    !start |
    !finish
  ) {
    return res
      .status(400)
      .send("Details are missing, please check your submission and try again");
  }

  if (scenario === undefined) {
    scenario = null;
  }

  if (date === "unspecified") {
    date = dayjs().format("YYYY-MM-DD HH:mm:ss");
  }
  const playerOneID = crypto.randomUUID();
  const playerTwoID = crypto.randomUUID();

  if (player_type === "single") {
    const playerOne = { id: playerOneID, army_id: player_1[0].army_id };
    const playerTwo = { id: playerTwoID, army_id: player_2[0].army_id };

    const newBattleObj = {
      id: crypto.randomUUID(),
      date: dayjs(date).format("YYYY-MM-DD"),
      player_type,
      battle_type,
      points_size,
      player_1_id: playerOneID,
      player_2_id: playerTwoID,
      scenario,
      start: start,
      finish: finish,
      table,
    };

    try {
      await database.transaction(async (trx) => {
        await trx("combatants").insert([playerOne, playerTwo]);
        await trx("battles").insert(newBattleObj);
      });
      res.status(200).send(`Battle created with ID ${newBattleObj.id}`);
    } catch (error) {
      console.error(error);
      res
        .status(400)
        .send(
          "Unable to create new battle, please check the submitted details"
        );
    }
  } else if (player_type === "multi") {
    try {
      const newBattleObj = {
        id: crypto.randomUUID(),
        date: dayjs(date).format("YYYY-MM-DD"),
        player_type,
        battle_type,
        points_size,
        player_1_id: playerOneID,
        player_2_id: playerTwoID,
        start: start,
        finish: finish,
        table,
      };

      const playerOneMapped = multiplayerMapping(player_1, playerOneID);
      const playerTwoMapped = multiplayerMapping(player_2, playerTwoID);

      await database.transaction(async (trx) => {
        await trx("combatants").insert([
          ...playerOneMapped,
          ...playerTwoMapped,
        ]);
        await trx("battles").insert(newBattleObj);
      });

      res.status(200).send(`Battle created with ID ${newBattleObj.id}`);
    } catch (error) {
      console.error(error);
      res.status(400).send("Error with multiplayer battle creation");
    }
  }
});

router.route("/all").get(fetchAllBattles);
router.route("/upcoming").get(fetchUpcomingBattles);
router.route("/upcoming/5").get(fetchFiveUpcomingBattles);
router.route("/completed").get(fetchCompletedBattles);
router.route("/completed/5").get(fetchFiveCompletedBattles);
router.route("/:id").get(fetchOneBattle);
router.route("/:id/win/percent").get(fetchUsersWinPercent);
router.route("/:id/win/count").get(fetchUsersWinCount);
router.route("/:id/all").get(fetchAllUsersBattles);
router.route("/:id/all/count").get(fetchAllUsersBattlesCount);
router.route("/user/upcoming").get(fetchUsersUpcomingBattles);
router.route("/user/completed").get(fetchUsersCompletedBattles);
router.route("/:id/upcoming/count").get(fetchUsersUpcomingBattlesCount);
router.route("/:id/completed").get(fetchUsersCompletedBattles);
router.route("/:id/completed/count").get(fetchUsersCompletedBattlesCount);

router.route("/:id/edit/pointsize").patch(headerAuth, async (req, res) => {
  const battleID = req.params.id;
  const { points_size } = req.body;
  const oldPointsSize = await database("battles")
    .where({ id: battleID })
    .first()
    .select("points_size");
  try {
    await database("battles")
      .where({ id: battleID })
      .update({ points_size: points_size });
    res
      .status(200)
      .send(
        `Points Size has been updated from ${oldPointsSize.points_size} to ${points_size}`
      );
  } catch (error) {
    console.error(error);
    res.status(400).send("Issue with altering points size in the database");
  }
});
router.route("/:id/edit/scenario").patch(headerAuth, async (req, res) => {
  const battleID = req.params.id;
  const { scenario } = req.body;
  const oldScenario = await database("battles")
    .where({ id: battleID })
    .first()
    .select("scenario");
  try {
    await database("battles")
      .where({ id: battleID })
      .update({ scenario: scenario });
    res
      .status(200)
      .send(
        `Scenario has been updated from ${oldScenario.scenario} to ${scenario}`
      );
  } catch (error) {
    console.error(error);
    res.status(400).send("Issue with altering scenario in the database");
  }
});
router.route("/:id/edit/date").patch(headerAuth, async (req, res) => {
  const battleID = req.params.id;
  const { date } = req.body;

  const oldDate = await database("battles")
    .where({ id: battleID })
    .first()
    .select("date");
  try {
    await database("battles")
      .where({ id: battleID })
      .update({ date: dayjs(date).format("YYYY-MM-DD") });
    res
      .status(200)
      .send(
        `Date has been updated from ${oldDate.date} to ${dayjs(date).format(
          "YYYY-MM-DD"
        )}`
      );
  } catch (error) {
    console.error(error);
    res.status(400).send("Issue with altering date in the database");
  }
});
router.route("/:id/edit/start").patch(headerAuth, async (req, res) => {
  const battleID = req.params.id;
  const { start } = req.body;

  const oldStart = await database("battles")
    .where({ id: battleID })
    .first()
    .select("start");
  try {
    await database("battles").where({ id: battleID }).update({ start: start });
    res
      .status(200)
      .send(`Start time has been updated from ${oldStart.start} to ${start}`);
  } catch (error) {
    console.error(error);
    res.status(400).send("Issue with altering Start Time in the database");
  }
});
router.route("/:id/edit/finish").patch(headerAuth, async (req, res) => {
  const battleID = req.params.id;
  const { finish } = req.body;

  const oldFinish = await database("battles")
    .where({ id: battleID })
    .first()
    .select("finish");
  try {
    await database("battles")
      .where({ id: battleID })
      .update({ finish: finish });
    res
      .status(200)
      .send(
        `Finish time has been updated from ${oldFinish.finish} to ${finish}`
      );
  } catch (error) {
    console.error(error);
    res.status(400).send("Issue with altering Finish Time in the database");
  }
});
router.route("/:id/edit/table").patch(headerAuth, async (req, res) => {
  const battleID = req.params.id;
  const { table } = req.body;

  const oldTable = await database("battles")
    .where({ id: battleID })
    .first()
    .select("table");
  try {
    await database("battles").where({ id: battleID }).update({ table: table });
    res
      .status(200)
      .send(`Date has been updated from ${oldTable.table} to ${table}`);
  } catch (error) {
    console.error(error);
    res.status(400).send("Issue with altering Table in the database");
  }
});
router.route("/:id/edit/gametype").patch(headerAuth, async (req, res) => {
  const battleID = req.params.id;
  const { battle_type, player_type } = req.body;

  if (!battle_type && player_type) {
    const oldPlayerType = await database("battles")
      .where({ id: battleID })
      .first()
      .select("player_type");
    try {
      await database("battles")
        .where({ id: battleID })
        .update({ player_type: player_type });
      res
        .status(200)
        .send(
          `Player Type has been updated from ${oldPlayerType.player_type} to ${player_type}`
        );
    } catch (error) {
      console.error(error);
      res.status(400).send("Issue with altering Player Type in the database");
    }
  } else if (battle_type && !player_type) {
    const oldBattleType = await database("battles")
      .where({ id: battleID })
      .first()
      .select("battle_type");
    try {
      await database("battles")
        .where({ id: battleID })
        .update({ battle_type: battle_type });
      res
        .status(200)
        .send(
          `Battle Type has been updated from ${oldBattleType.battle_type} to ${battle_type}`
        );
    } catch (error) {
      console.error(error);
      res.status(400).send("Issue with altering Battle Type in the database");
    }
  } else if (battle_type && player_type) {
    const oldBattleType = await database("battles")
      .where({ id: battleID })
      .first()
      .select("battle_type", "player_type");
    try {
      await database("battles")
        .where({ id: battleID })
        .update({ player_type: player_type, battle_type: battle_type });
      res
        .status(200)
        .send(
          `Player Type has been updated from ${oldBattleType.player_type} to ${player_type} and Battle Type has been changed from ${oldBattleType.battle_type} to ${battle_type}`
        );
    } catch (error) {
      console.error(error);
      res.status(400).send("Issue with altering Player Type in the database");
    }
  } else {
    res
      .status(400)
      .send(
        `Required details have not been submitted, please recheck your submission`
      );
  }
});
router.route("/:id/edit/combatants").patch(headerAuth, async (req, res) => {
  const battleID = req.params.id;
  const { player_1, player_2 } = req.body;

  const battleToChange = await database("battles")
    .where({ id: battleID })
    .first();

  if (!battleToChange) {
    return res
      .status(400)
      .send("Unable to locate the battle you are looking for");
  }

  const prevPlayerOneID = battleToChange.player_1_id;
  const prevPlayerTwoID = battleToChange.player_2_id;

  if (
    battleToChange.player_type === "single" &&
    (player_1.length > 1) | (player_2.length > 1)
  ) {
    try {
      const teamOneID = crypto.randomUUID();
      const teamTwoID = crypto.randomUUID();

      const teamOneArray = await singleToMultiCombatantUpdate(
        player_1,
        prevPlayerOneID,
        teamOneID
      );
      const teamTwoArray = await singleToMultiCombatantUpdate(
        player_2,
        prevPlayerTwoID,
        teamTwoID
      );

      await database("battles")
        .where({ id: battleID })
        .update({ player_type: "multi" });

      await database("battles")
        .where({ id: battleID })
        .update({ player_1_id: teamOneID, player_2_id: teamTwoID });

      res.status(200).send({
        message: "Teams successfully Update",
        teamOne: teamOneArray,
        teamTwo: teamTwoArray,
      });
    } catch (error) {
      console.error(error);
      res.status(400).send("Unable to update teams");
    }
  } else if (
    battleToChange.player_type === "single" &&
    player_1.length === 1 &&
    player_2.length === 1
  ) {
    try {
      if (player_1.id !== prevPlayerOneID) {
        await database("combatants")
          .where({ id: prevPlayerOneID })
          .update({ army_id: player_1[0].army_id });
      }
      if (player_2.id !== prevPlayerTwoID) {
        await database("combatants")
          .where({ id: prevPlayerTwoID })
          .update({ army_id: player_2[0].army_id });
      }

      res.status(200).send({
        message: "Successfully updated the combatants",
        player_1,
        player_2,
      });
    } catch (error) {
      console.error(error);
      res.status(400).send("Unable to update the combatants");
    }
  } else if (
    battleToChange.player_type === "multi" &&
    player_1.length === 1 &&
    player_2.length === 1
  ) {
    const playerOneID = crypto.randomUUID();
    const playerTwoID = crypto.randomUUID();

    try {
      await database("battles")
        .where({ id: battleID })
        .update({ player_type: "single" });

      await deleteCombatantTeam(battleToChange.player_1_id);
      await deleteCombatantTeam(battleToChange.player_2_id);

      const playerOneObj = await addCombatant(player_1[0].army_id, playerOneID);
      const playerTwoObj = await addCombatant(player_2[0].army_id, playerTwoID);

      await assignNewCombatant(battleID, playerOneID, 1);
      await assignNewCombatant(battleID, playerTwoID, 2);

      res.status(200).send({
        message: "Combatants have been successfully update",
        player_1: playerOneObj,
        player_2: playerTwoObj,
      });
    } catch (error) {
      console.error(error);
      res.status(400).send("Unable to update the battle");
    }
  } else if (
    battleToChange.player_type === "multi" &&
    player_1.length > 1 &&
    player_2.length > 1
  ) {
    const playerOneID = crypto.randomUUID();
    const playerTwoID = crypto.randomUUID();

    try {
      await deleteCombatantTeam(battleToChange.player_1_id);
      await deleteCombatantTeam(battleToChange.player_2_id);

      const teamOneArray = await multiplayerdatabaseInsert(
        player_1,
        playerOneID
      );
      const teamTwoArray = await multiplayerdatabaseInsert(
        player_2,
        playerTwoID
      );

      await assignNewCombatant(battleID, playerOneID, 1);
      await assignNewCombatant(battleID, playerTwoID, 2);

      res.status(200).send({
        message: "Teams have been updated",
        team_1: teamOneArray,
        team_2: teamTwoArray,
      });
    } catch (error) {
      console.error(error);
      res.status(400).send("Unable to update teams");
    }
  }
});
router.route("/:id/edit/points_1").patch(headerAuth, async (req, res) => {
  const { points } = req.body;
  const battleID = req.params.id;

  if (typeof points !== "number") {
    return res
      .status(400)
      .send("Submission needs to be a number, please check the details");
  }

  if (!points) {
    return res
      .status(400)
      .send("A value for Points is required for the submission");
  }

  try {
    await database("battles")
      .where({ id: battleID })
      .update({ player_1_points: points });

    res.status(200).send({
      message: "Points for player 1 successfully updated",
    });
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to update the battle");
  }
});
router.route("/:id/edit/points_2").patch(headerAuth, async (req, res) => {
  const { points } = req.body;
  const battleID = req.params.id;

  if (typeof points !== "number") {
    return res
      .status(400)
      .send("Submission needs to be a number, please check the details");
  }

  if (!points) {
    return res
      .status(400)
      .send("A value for Points is required for the submission");
  }

  try {
    await database("battles")
      .where({ id: battleID })
      .update({ player_2_points: points });

    res.status(200).send({
      message: "Points for player 2 successfully updated",
    });
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to update the battle");
  }
});

router.route("/:id/delete").delete(adminAuth, async (req, res) => {
  const battleID = req.params.id;
  const battleObj = await database("battles").where({ id: battleID }).first();
  try {
    await database("battles").where({ id: battleID }).del();

    res
      .status(200)
      .send({ message: "Successfully deleted the battle", battle: battleObj });
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to delete the requested battle");
  }
});

router.route("/:id/submit").post(headerAuth, async (req, res) => {
  const battleID = req.params.id;

  const battleObj = await database("battles").where({ id: battleID }).first();

  if (!battleObj) {
    return res.status(400).send("Unable to find the battle");
  }

  if (!battleObj.player_1_points | (battleObj.player_1_points === 0)) {
    return res.status(400).send("Please add points for Player 1");
  }

  if (!battleObj.player_2_points | (battleObj.player_2_points === 0)) {
    return res.status(400).send("Please add points for Player 2");
  }

  let battleWinner = null;
  let finalResult = null;

  battleObj.battle_type === "fantasy"
    ? (finalResult = battleResultFantasy(
        battleObj.points_size,
        battleObj.player_1_points,
        battleObj.player_2_points
      ))
    : battleObj.battle_type === "40k"
    ? (finalResult = battleResultFortyK(
        battleObj.player_1_points,
        battleObj.player_2_points
      ))
    : (finalResult = "undefined");

  battleObj.player_1_points > battleObj.player_2_points &&
  finalResult !== "draw"
    ? (battleWinner = battleObj.player_1_id)
    : battleObj.player_1_points < battleObj.player_2_points &&
      finalResult !== "draw"
    ? (battleWinner = battleObj.player_2_id)
    : (battleWinner = "draw");

  try {
    await database("battles").where({ id: battleID }).update({
      status: "submitted",
      winner: battleWinner,
      result: finalResult,
    });
  } catch (error) {
    console.error(error);
    res.status(400).send(error);
  }

  if (battleObj.player_type === "multi") {
    try {
      return res
        .status(200)
        .send(await database("battles").where({ id: battleID }).first());
    } catch (error) {
      console.error(error);
      res.status(400).send("Unable to submit the battle");
    }
  }

  try {
    const armyOne = await fetchBattleCombatantArmy(battleObj.player_1_id, 1);
    const armyTwo = await fetchBattleCombatantArmy(battleObj.player_2_id, 2);

    const rankOne = await fetchRecentArmyRank(armyOne.army_id);
    const rankTwo = await fetchRecentArmyRank(armyTwo.army_id);

    if (finalResult === "draw") {
      const rankChangeObj = rankChangeDraw(rankOne.ranking, rankTwo.ranking);

      const newRankOne =
        Number(rankOne.ranking) + Number(rankChangeObj.rankChangeOne);
      const newRankTwo =
        Number(rankTwo.ranking) + Number(rankChangeObj.rankChangeTwo);

      const rankChangeOneObj = await createNewRank(
        newRankOne,
        armyOne.army_id,
        battleObj.date,
        battleObj.battle_type
      );

      const rankChangeTwoObj = await createNewRank(
        newRankTwo,
        armyTwo.army_id,
        battleObj.date,
        battleObj.battle_type
      );

      res
        .status(200)
        .send({ playerOne: rankChangeOneObj, playerTwo: rankChangeTwoObj });
    } else if (
      finalResult === "victory" &&
      battleWinner === battleObj.player_1_id
    ) {
      const rankChangeWinner = rankChangeWin(rankOne.ranking, rankTwo.ranking);
      const rankChangeLoser = rankChangeLoss(rankTwo.ranking, rankOne.ranking);

      const newRankWinner = Number(rankOne.ranking) + Number(rankChangeWinner);
      const newRankLoser = Number(rankTwo.ranking) + Number(rankChangeLoser);

      const newWinnerRankObj = await createNewRank(
        newRankWinner,
        armyOne.army_id,
        battleObj.date,
        battleObj.battle_type
      );

      const newLoserRankObj = await createNewRank(
        newRankLoser,
        armyTwo.army_id,
        battleObj.date,
        battleObj.battle_type
      );

      res
        .status(200)
        .send({ Winner: newWinnerRankObj, Loser: newLoserRankObj });
    } else if (
      finalResult === "victory" &&
      battleWinner === battleObj.player_2_id
    ) {
      const rankChangeWinner = rankChangeWin(rankTwo.ranking, rankOne.ranking);

      const rankChangeLoser = rankChangeLoss(rankOne.ranking, rankTwo.ranking);

      const newRankWinner = Number(rankTwo.ranking) + Number(rankChangeWinner);
      const newRankLoser = Number(rankOne.ranking) + Number(rankChangeLoser);

      const newWinnerRankObj = await createNewRank(
        newRankWinner,
        armyTwo.army_id,
        battleObj.date,
        battleObj.battle_type
      );

      const newLoserRankObj = await createNewRank(
        newRankLoser,
        armyOne.army_id,
        battleObj.date,
        battleObj.battle_type
      );

      res
        .status(200)
        .send({ Winner: newWinnerRankObj, Loser: newLoserRankObj });
    }
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to submit battle");
  }
});

router.route("/:id/resubmit").post(adminAuth, async (req, res) => {
  const battleID = req.params.id;

  const battleObj = await database("battles").where({ id: battleID }).first();

  if (!battleObj) {
    return res.status(400).send("Unable to find the battle");
  }

  if (!battleObj.player_1_points | (battleObj.player_1_points === 0)) {
    return res.status(400).send("Please add points for Player 1");
  }

  if (!battleObj.player_2_points | (battleObj.player_2_points === 0)) {
    return res.status(400).send("Please add points for Player 2");
  }

  let battleWinner = null;
  let finalResult = null;

  battleObj.battle_type === "fantasy"
    ? (finalResult = battleResultFantasy(
        battleObj.points_size,
        battleObj.player_1_points,
        battleObj.player_2_points
      ))
    : battleObj.battle_type === "40k"
    ? (finalResult = battleResultFortyK(
        battleObj.player_1_points,
        battleObj.player_2_points
      ))
    : (finalResult = "undefined");

  battleObj.player_1_points > battleObj.player_2_points &&
  finalResult !== "draw"
    ? (battleWinner = battleObj.player_1_id)
    : battleObj.player_1_points < battleObj.player_2_points && finalResult !== "draw"
    ? (battleWinner = battleObj.player_2_id)
    : (battleWinner = "draw");

  try {
    await database("battles").where({ id: battleID }).update({
      status: "submitted",
      winner: battleWinner,
      result: finalResult,
    });

    if (battleObj.player_type === "multi") {
      return res
        .status(200)
        .send(await database("battles").where({ id: battleID }).first());
    }
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to submit the battle");
  }

  if (battleObj.player_type === "single") {
    try {
      const armyOne = await fetchBattleCombatantArmy(battleObj.player_1_id, 1);
      const armyTwo = await fetchBattleCombatantArmy(battleObj.player_2_id, 2);

      const rankOneObj = await database("rank_view")
        .where({
          army_id: armyOne.army_id,
          rn: 1,
        })
        .first();

      const rankTwoObj = await database("rank_view")
        .where({
          army_id: armyTwo.army_id,
          rn: 1,
        })
        .first();

      const deleteRankOne = await database("rank")
        .where("rank.id", "=", rankOneObj.id)
        .delete();

      const deleteRankTwo = await database("rank")
        .where({ id: rankTwoObj.id })
        .delete();

      const rankOne = await fetchRecentArmyRank(armyOne.army_id);
      const rankTwo = await fetchRecentArmyRank(armyTwo.army_id);

      if (finalResult === "draw") {
        const rankChangeObj = rankChangeDraw(rankOne.ranking, rankTwo.ranking);

        const newRankOne =
          Number(rankOne.ranking) + Number(rankChangeObj.rankChangeOne);
        const newRankTwo =
          Number(rankTwo.ranking) + Number(rankChangeObj.rankChangeTwo);

        const rankChangeOneObj = await createNewRank(
          newRankOne,
          armyOne.army_id,
          battleObj.date,
          battleObj.battle_type
        );

        const rankChangeTwoObj = await createNewRank(
          newRankTwo,
          armyTwo.army_id,
          battleObj.date,
          battleObj.battle_type
        );

        res
          .status(200)
          .send({ playerOne: rankChangeOneObj, playerTwo: rankChangeTwoObj });
      } else if (
        finalResult === "victory" &&
        battleWinner === battleObj.player_1_id
      ) {
        const rankChangeWinner = rankChangeWin(
          rankOne.ranking,
          rankTwo.ranking
        );
        const rankChangeLoser = rankChangeLoss(
          rankTwo.ranking,
          rankOne.ranking
        );

        const newRankWinner =
          Number(rankOne.ranking) + Number(rankChangeWinner);
        const newRankLoser = Number(rankTwo.ranking) + Number(rankChangeLoser);

        const newWinnerRankObj = await createNewRank(
          newRankWinner,
          armyOne.army_id,
          battleObj.date,
          battleObj.battle_type
        );

        const newLoserRankObj = await createNewRank(
          newRankLoser,
          armyTwo.army_id,
          battleObj.date,
          battleObj.battle_type
        );

        res
          .status(200)
          .send({ Winner: newWinnerRankObj, Loser: newLoserRankObj });
      } else if (
        finalResult === "victory" &&
        battleWinner === battleObj.player_2_id
      ) {
        const rankChangeWinner = rankChangeWin(
          rankTwo.ranking,
          rankOne.ranking
        );
        const rankChangeLoser = rankChangeLoss(
          rankOne.ranking,
          rankTwo.ranking
        );

        const newRankWinner =
          Number(rankTwo.ranking) + Number(rankChangeWinner);
        const newRankLoser = Number(rankOne.ranking) + Number(rankChangeLoser);

        const newWinnerRankObj = await createNewRank(
          newRankWinner,
          armyTwo.army_id,
          battleObj.date,
          battleObj.battle_type
        );

        const newLoserRankObj = await createNewRank(
          newRankLoser,
          armyOne.army_id,
          battleObj.date,
          battleObj.battle_type
        );

        res
          .status(200)
          .send({ Winner: newWinnerRankObj, Loser: newLoserRankObj });
      }
    } catch (error) {
      console.error(error);
      res.status(400).send("Unable to submit battle");
    }
  }
});

module.exports = router;
