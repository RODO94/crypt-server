const express = require("express");
const knex = require("knex")(require("../knexfile"));
const router = express.Router();
const crypto = require("crypto");
const dayjs = require("dayjs");

require("dotenv").config();

const {
  multiplayerKnexInsert,
  singleToMultiCombatantUpdate,
  deleteCombatantTeam,
  addCombatant,
  assignNewCombatant,
} = require("../controllers/battles-controller");

router.route("/create").post(async (req, res) => {
  let { points_size, battle_type, player_type, player_1, player_2, date } =
    req.body;

  if (
    !points_size |
    !battle_type |
    !player_type |
    !player_1 |
    !player_2 |
    !date
  ) {
    return res
      .status(400)
      .send("Details are missing, please check your submission and try again");
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
      date: dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
      player_type,
      battle_type,
      points_size,
      player_1_id: playerOneID,
      player_2_id: playerTwoID,
    };

    try {
      await knex("battles").insert(newBattleObj);
      res
        .status(200)
        .send(
          `Battle created with ID ${newBattleObj.id} between combatants ${playerOneName.name} and ${playerTwoName.name}`
        );
    } catch (error) {
      console.error(error);
      res
        .status(400)
        .send(
          "Unable to create new battle, please check the submitted details"
        );
    }
  } else if (player_type === "multi") {
    // if multi, player_1 & player_2 will be added as arrays of more than 1
    // each array will contain an object with the army_id

    await multiplayerKnexInsert(player_1, playerOneID);
    await multiplayerKnexInsert(player_2, playerTwoID);

    try {
      const teamOne = await knex("combatants").where({ team_id: playerOneID });
      const teamTwo = await knex("combatants").where({ team_id: playerTwoID });

      const newBattleObj = {
        id: crypto.randomUUID(),
        date: dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
        player_type,
        battle_type,
        points_size,
        player_1_id: playerOneID,
        player_2_id: playerTwoID,
      };

      await knex("battles").insert(newBattleObj);
      res.status(200).send(`Battle created with ID ${newBattleObj.id}`);
    } catch (error) {
      console.error(error);
      res.status(400).send("Error with multiplayer battle creation");
    }
  }
});

router.route("/:id/edit/pointsize").patch(async (req, res) => {
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
router.route("/:id/edit/scenario").patch(async (req, res) => {
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
router.route("/:id/edit/date").patch(async (req, res) => {
  const battleID = req.params.id;
  const { date } = req.body;

  const oldDate = await knex("battles")
    .where({ id: battleID })
    .first()
    .select("date");
  try {
    await knex("battles")
      .where({ id: battleID })
      .update({ date: dayjs(date).format("YYYY-MM-DD HH:mm:ss") });
    res
      .status(200)
      .send(
        `Date has been updated from ${oldDate.date} to ${dayjs(date).format(
          "YYYY-MM-DD HH:mm:ss"
        )}`
      );
  } catch (error) {
    console.error(error);
    res.status(400).send("Issue with altering date in the database");
  }
});
router.route("/:id/edit/gametype").patch(async (req, res) => {
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
router.route("/:id/edit/combatants").patch(async (req, res) => {
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
    // The case where the game is single but they have added another player
    // making it multiplayer.
    //   Player ID's would need to switch to Team IDs, update the combatants
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
    // Check what has changed
    // Alter the army_id of the combatant
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
router.route("/:id/edit/points_1").patch(async (req, res) => {
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

router.route("/:id/edit/points_2").patch(async (req, res) => {
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

router.route("/:id/delete").delete(async (req, res) => {
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

router.route("/:id/submit").post(async (req, res) => {
  // In every battle, an army's rank will change
  // When a battle is submitted, it should create a new rank for each player
  // unless the battle is multiplayer
  // Submit battle, check inputs, change status to submitted,
  // add result, and winner
  // For a single player game...
  // determine current rank position of players and create their new rank

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

  battleObj.player_1_points > battleObj.player_2_points
    ? (battleWinner = battleObj.player_1_id)
    : battleObj.player_1_points < battleObj.player_2_points
    ? (battleWinner = battleObj.player_2_id)
    : (battleWinner = "match drawn");

  battleObj.player_1_points > battleObj.player_2_points
    ? (finalResult = "victory")
    : battleObj.player_1_points < battleObj.player_2_points
    ? (finalResult = "victory")
    : (finalResult = "draw");

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

  // We have a winner, result, and status
  // Now I need to build the rank
  // I'll test battle 3 with combatants 6 + 10
  // Combat 6 - army 4 - rank 24.67 - prevRank 17
  // combat 10 - army 8 - rank 40.65 - prevRank 9
  try {
    const rankOne = await knex("rank")
      .where({ id: battleObj.player_1_id })
      .orderBy("date", "desc");

    const combatantOne = await knex("combatants")
      .join("armies", "combatants.army_id", "=", "armies.id")
      .join("rank", "combatants.army_id", "=", "rank.army_id");

    res.status(200).send(rankOne);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to submit battle");
  }
});

module.exports = router;
