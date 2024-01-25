const express = require("express");
const knex = require("knex")(require("../knexfile"));
const router = express.Router();
const crypto = require("crypto");
const dayjs = require("dayjs");

require("dotenv").config();

router.route("/create").post(async (req, res) => {
  let { battle_type, player_type, player_1, player_2, date } = req.body;

  if (date === "unspecified") {
    date = dayjs().format("YYYY-MM-DD HH:mm:ss");
  }

  if (player_type === "single") {
    const playerOneID = crypto.randomUUID();
    const playerTwoID = crypto.randomUUID();

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
  }
});

module.exports = router;
