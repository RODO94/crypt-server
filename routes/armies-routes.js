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
const pool = knex.client.pool;

knex.on("query", (builder) => {
  console.log("Army Routes to be executed", builder.sql);
  console.log("Army Routes Pool Used on Start", pool.numUsed());
  console.log("Army Routes Pool Free on Start", pool.numFree());
});

knex.on("query-response", (response, builder) => {
  console.log("Army Routes Query executed successfully:", builder.sql);
  console.log("Army Routes Pool Used on response", pool.numUsed());
  console.log("Army Routes Pool Free on response", pool.numFree());
});

knex.on("query-error", (error, builder) => {
  console.error("Error executing query:", builder.sql, error);
  console.log("Army Routes Error Pool Used on error", pool.numUsed());
  console.log("Army Routes Error Pool Free on error", pool.numFree());
});

router.route("/all").get(getAllArmies);
router.route("/all/:id").get(getAllUserArmies);

router.route("/create").post(headerAuth, async (req, res) => {
  try {
    const { name, type, emblemName, emblemID } = req.body;

    if (!name || !type) {
      return res
        .status(400)
        .send("Please provide a valid name and type for the army");
    }

    const authToken = req.headers.authorization.split(" ")[1];

    const decodedToken = jwt.verify(authToken, process.env.JWT_KEY);
    const userID = decodedToken.id;

    if (!userID) {
      return res
        .status(400)
        .send("Please provide a valid user ID for the army");
    }

    const finalEmblemName = emblemName || "undefined";
    const finalEmblemID = emblemID || "undefined";

    const newArmyID = crypto.randomUUID();

    const newArmyObj = {
      id: newArmyID,
      name,
      emblem_id: finalEmblemID,
      type,
      user_id: userID,
      emblem: finalEmblemName,
    };

    // Use transaction for atomicity
    await knex.transaction(async (trx) => {
      // Insert new army
      await insertNewArmy(newArmyObj, trx);

      // Insert rank entry
      await trx("rank").insert({
        id: crypto.randomUUID(),
        date: dayjs().format("YYYY-MM-DD"),
        ranking: 30,
        army_id: newArmyID,
        prev_ranking: 99,
      });
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
