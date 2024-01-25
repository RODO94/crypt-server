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
  // The case where the game is single but they have added another player
  // making it multiplayer.
  //   Player ID's would need to switch to Team IDs, update the combatants

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
          .update({ army_id: player_1.army_id });
      }
      if (player_2.id !== prevPlayerTwoID) {
        await knex("combatants")
          .where({ id: prevPlayerTwoID })
          .update({ army_id: player_2.army_id });
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
      await deleteCombatantTeam(battleToChange.player_1_id);
      await deleteCombatantTeam(battleToChange.player_2_id);

      const playerOneObj = await addCombatant(player_1.army_id, playerOneID);
      const playerTwoObj = await addCombatant(player_2.army_id, playerTwoID);

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
  }
});

module.exports = router;
