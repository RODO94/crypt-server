const express = require("express");
const knex = require("knex")(require("../knexfile"));
const router = express.Router();
const crypto = require("crypto");
const dayjs = require("dayjs");

require("dotenv").config();

router.route("/create").post(async (req, res) => {
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

module.exports = router;
