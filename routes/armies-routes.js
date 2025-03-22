import { Router } from "express";
import database from "../database/db.js";
import crypto from "crypto";
import dayjs from "dayjs";
import jwt from "jsonwebtoken";

const armyRouter = Router();

import {
  updateArmyField,
  addNewArmyRanking,
  fetchOneArmy,
  getAllArmies,
  getArmyNemesis,
  getArmyAlly,
  getAllUserArmies,
  insertNewArmy,
  getArmyInfo,
} from "../controllers/modules/armies/armies-controller.ts";

import { headerAuth, adminAuth } from "../middleware/auth.js";

require("dotenv").config();

armyRouter.route("/all").get(getAllArmies);
armyRouter.route("/all/:id").get(getAllUserArmies);

armyRouter.route("/create").post(headerAuth, async (req, res) => {
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
    await database.transaction(async (trx) => {
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

armyRouter.route("/army/:id").get(fetchOneArmy);

armyRouter.route("/:id/update").patch(headerAuth, async (req, res) => {
  const armyID = req.params.id;

  const { name, type, userId } = req.body;
  let { emblemName, emblemID } = req.body;

  const targetArmy = await database("armies").where({ id: armyID }).first();

  if (!targetArmy) {
    return res.status(400).send(`Unable to find army with ID ${armyID}`);
  }

  try {
    name ? await updateArmyField(armyID, "name", name) : name;
    type ? await updateArmyField(armyID, "type", type) : type;
    userId && (await updateArmyField(armyID, "user_id", userId));
    emblemName
      ? await updateArmyField(armyID, "emblem", emblemName)
      : emblemName;
    emblemID ? await updateArmyField(armyID, "emblem_id", emblemID) : emblemID;

    res
      .status(200)
      .send(await database("armies").where({ id: armyID }).first());
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to update army");
  }
});

armyRouter.route("/:id/ranking").post(adminAuth, addNewArmyRanking);

armyRouter.route("/:id/nemesis").get(getArmyNemesis);
armyRouter.route("/:id/ally").get(getArmyAlly);
armyRouter.route("/:id/info").get(getArmyInfo);

export default armyRouter;
