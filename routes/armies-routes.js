const express = require("express");
const knex = require("knex")(require("../knexfile"));
const router = express.Router();
const crypto = require("crypto");
const dayjs = require("dayjs");
const {
  updateArmyField,
  addNewArmyRanking,
  fetchOneArmy,
} = require("../controllers/armies-controller");
const { headerAuth, adminAuth } = require("../middleware/auth");

require("dotenv").config();

router.route("/create").post(headerAuth, async (req, res) => {
  const { name, type, userID } = req.body;
  let { emblemName, emblemID } = req.body;

  if (!name) {
    return res.status(400).send("Please provide a valid name for the army");
  }

  if (!type) {
    return res.status(400).send("Please provide a valid type for the army");
  }

  if (!userID) {
    return res.status(400).send("Please provide a valid user ID for the army");
  }

  emblemName ? emblemName : (emblemName = "undefined");
  emblemID ? emblemID : (emblemID = "undefined");

  const newArmyID = crypto.randomUUID();

  const newArmyObj = {
    id: newArmyID,
    name: name,
    emblem_id: emblemID,
    type: type,
    user_id: userID,
    emblem: emblemName,
  };

  try {
    await knex("armies").insert(newArmyObj);

    return res.status(200).send(newArmyObj);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to create the new army");
  }
});

router.route("/:id").get(fetchOneArmy);

router.route("/:id/update").patch(headerAuth, async (req, res) => {
  const armyID = req.params.id;

  const { name, type } = req.body;
  let { emblemName, emblemID } = req.body;

  const targetArmy = await knex("armies").where({ id: armyID }).first();

  if (!targetArmy) {
    return res.status(400).send(`Unable to find army with ID ${armyID}`);
  }

  try {
    name ? await updateArmyField(armyID, "name", name) : name;
    type ? await updateArmyField(armyID, "type", type) : type;
    emblemName
      ? await updateArmyField(armyID, "emblem", emblemName)
      : emblemName;
    emblemID ? await updateArmyField(armyID, "emblem_id", emblemID) : emblemID;

    res.status(200).send(await knex("armies").where({ id: armyID }).first());
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to update army");
  }
});

router.route("/:id/ranking").post(adminAuth, addNewArmyRanking);

module.exports = router;
