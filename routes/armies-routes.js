const express = require("express");
const knex = require("knex")(require("../knexfile"));
const router = express.Router();
const crypto = require("crypto");
const dayjs = require("dayjs");
const jwt = require("jsonwebtoken");

const {
  updateArmyField,
  addNewArmyRanking,
  fetchOneArmy,
  getAllArmies,
  getArmyNemesis,
  getArmyAlly,
  getAllUserArmies,
  insertNewArmy,
} = require("../controllers/armies-controller");
const { headerAuth, adminAuth } = require("../middleware/auth");

require("dotenv").config();
knex.on("start", (builder) => {
  console.log("New query being executed:", builder.pool.numUsed);
});

knex.on("query-response", (response, builder) => {
  console.log("Query executed successfully:", builder.sql);
  console.log("Pool Used", builder.pool.numUsed);
});

knex.on("query-error", (error, builder) => {
  console.error("Error executing query:", builder.sql, error);
});

const pool = knex.client.pool;

console.log("Connections in use:", pool.numUsed());
console.log("Connections available:", pool.numFree());

knex.on("start", (builder) => {
  console.log("New query being executed:", builder.sql);
});

knex.on("query-response", (response, builder) => {
  console.log("Query executed successfully:", builder.sql);
});

knex.on("query-error", (error, builder) => {
  console.error("Error executing query:", builder.sql, error);
});

router.route("/all").get(getAllArmies);
router.route("/all/:id").get(getAllUserArmies);

router.route("/create").post(headerAuth, async (req, res) => {
  const { name, type } = req.body;
  let { emblemName, emblemID } = req.body;

  const authToken = req.headers.authorization.split(" ")[1];

  const decodedToken = jwt.verify(authToken, process.env.JWT_KEY);
  const userID = decodedToken.id;

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
    const response = await insertNewArmy(newArmyObj);
    console.log(response);
    if (!response) {
      return res
        .status(400)
        .send("We are having trouble inserting the new army");
    }

    await knex("rank").insert({
      id: crypto.randomUUID(),
      date: dayjs(Date.now()).format("YYYY-MM-DD"),
      ranking: 30,
      army_id: newArmyID,
      prev_ranking: 99,
    });

    return res.status(200).send(newArmyObj);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to create the new army");
  }
});

router.route("/army/:id").get(fetchOneArmy);

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

router.route("/:id/nemesis").get(getArmyNemesis);
router.route("/:id/ally").get(getArmyAlly);

module.exports = router;
