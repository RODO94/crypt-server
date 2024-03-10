const express = require("express");
const knex = require("knex")(require("../knexfile"));
const router = express.Router();
const crypto = require("crypto");
const dayjs = require("dayjs");
const cors = require("cors");

const jwt = require("jsonwebtoken");

require("dotenv").config();

const {
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
} = require("../controllers/battles-controller");
const { headerAuth, adminAuth } = require("../middleware/auth");

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

    const playerOneName = await knex("armies")
      .where({
        id: player_1[0].army_id,
      })
      .first();

    const playerTwoName = await knex("armies")
      .where({
        id: player_2[0].army_id,
      })
      .first();

    if (!playerOneName | !playerTwoName) {
      return res.status(400).send("Cannot find armies, please check army IDs");
    }
    const newCombatantOne = await knex("combatants").insert(playerOne);
    const newCombatantTwo = await knex("combatants").insert(playerTwo);

    if (!newCombatantOne | !newCombatantTwo) {
      return res
        .status(400)
        .send(
          "New combatant could not be created, please check details being submitted"
        );
    }
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
      await knex("battles").insert(newBattleObj);
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
    await multiplayerKnexInsert(player_1, playerOneID);
    await multiplayerKnexInsert(player_2, playerTwoID);

    try {
      const teamOne = await knex("combatants").where({
        team_id: playerOneID,
      });
      const teamTwo = await knex("combatants").where({
        team_id: playerTwoID,
      });

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

      await knex("battles").insert(newBattleObj);
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
  const oldPointsSize = await knex("battles")
    .where({ id: battleID })
    .first()
    .select("points_size");
  try {
    await knex("battles")
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
  const oldScenario = await knex("battles")
    .where({ id: battleID })
    .first()
    .select("scenario");
  try {
    await knex("battles")
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

  const oldDate = await knex("battles")
    .where({ id: battleID })
    .first()
    .select("date");
  try {
    await knex("battles")
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

  const oldStart = await knex("battles")
    .where({ id: battleID })
    .first()
    .select("start");
  try {
    await knex("battles").where({ id: battleID }).update({ start: start });
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

  const oldFinish = await knex("battles")
    .where({ id: battleID })
    .first()
    .select("finish");
  try {
    await knex("battles").where({ id: battleID }).update({ finish: finish });
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

  const oldTable = await knex("battles")
    .where({ id: battleID })
    .first()
    .select("table");
  try {
    await knex("battles").where({ id: battleID }).update({ table: table });
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
    const oldPlayerType = await knex("battles")
      .where({ id: battleID })
      .first()
      .select("player_type");
    try {
      await knex("battles")
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
    const oldBattleType = await knex("battles")
      .where({ id: battleID })
      .first()
      .select("battle_type");
    try {
      await knex("battles")
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
    const oldBattleType = await knex("battles")
      .where({ id: battleID })
      .first()
      .select("battle_type", "player_type");
    try {
      await knex("battles")
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

  const battleToChange = await knex("battles").where({ id: battleID }).first();

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

      await knex("battles")
        .where({ id: battleID })
        .update({ player_type: "multi" });

      await knex("battles")
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
        await knex("combatants")
          .where({ id: prevPlayerOneID })
          .update({ army_id: player_1[0].army_id });
      }
      if (player_2.id !== prevPlayerTwoID) {
        await knex("combatants")
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
      await knex("battles")
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

      const teamOneArray = await multiplayerKnexInsert(player_1, playerOneID);
      const teamTwoArray = await multiplayerKnexInsert(player_2, playerTwoID);

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
    await knex("battles")
      .where({ id: battleID })
      .update({ player_1_points: points });

    const newBattle = await knex("battles").where({ id: battleID }).first();

    res.status(200).send({
      message: "Points for player 1 successfully updated",
      newBattle: newBattle,
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
    await knex("battles")
      .where({ id: battleID })
      .update({ player_2_points: points });

    const newBattle = await knex("battles").where({ id: battleID }).first();

    res.status(200).send({
      message: "Points for player 2 successfully updated",
      newBattle: newBattle,
    });
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to update the battle");
  }
});

router.route("/:id/delete").delete(adminAuth, async (req, res) => {
  const battleID = req.params.id;
  const battleObj = await knex("battles").where({ id: battleID }).first();
  try {
    await knex("battles").where({ id: battleID }).del();

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

  const battleObj = await knex("battles").where({ id: battleID }).first();

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

  battleObj.player_1_points > battleObj.player_2_points
    ? (battleWinner = battleObj.player_1_id)
    : battleObj.player_1_points < battleObj.player_2_points
    ? (battleWinner = battleObj.player_2_id)
    : (battleWinner = "draw");

  if (battleObj.player_type === "multi") {
    try {
      await knex("battles").where({ id: battleID }).update({
        status: "submitted",
        winner: battleWinner,
        result: finalResult,
      });

      return res
        .status(200)
        .send(await knex("battles").where({ id: battleID }).first());
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
        battleObj.battle_type
      );

      const rankChangeTwoObj = await createNewRank(
        newRankTwo,
        armyTwo.army_id,
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
        battleObj.battle_type
      );

      const newLoserRankObj = await createNewRank(
        newRankLoser,
        armyTwo.army_id,
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
        battleObj.battle_type
      );

      const newLoserRankObj = await createNewRank(
        newRankLoser,
        armyOne.army_id,
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

  const battleObj = await knex("battles").where({ id: battleID }).first();

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

  battleObj.player_1_points > battleObj.player_2_points
    ? (battleWinner = battleObj.player_1_id)
    : battleObj.player_1_points < battleObj.player_2_points
    ? (battleWinner = battleObj.player_2_id)
    : (battleWinner = "draw");

  if (battleObj.player_type === "multi") {
    try {
      await knex("battles").where({ id: battleID }).update({
        status: "submitted",
        winner: battleWinner,
        result: finalResult,
      });

      return res
        .status(200)
        .send(await knex("battles").where({ id: battleID }).first());
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
        battleObj.battle_type
      );

      const rankChangeTwoObj = await createNewRank(
        newRankTwo,
        armyTwo.army_id,
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
        battleObj.battle_type
      );

      const newLoserRankObj = await createNewRank(
        newRankLoser,
        armyTwo.army_id,
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
        battleObj.battle_type
      );

      const newLoserRankObj = await createNewRank(
        newRankLoser,
        armyOne.army_id,
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

module.exports = router;
