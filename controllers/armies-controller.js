const crypto = require("crypto");
const knex = require("knex")(require("../knexfile"));
const dayjs = require("dayjs");

const updateArmyField = async (armyID, fieldName, newValue) => {
  try {
    await knex("armies").where({ id: armyID }).update(`${fieldName}`, newValue);

    return await knex("armies").where({ id: armyID }).first();
  } catch (error) {
    console.error(error);
    return "Unable to update";
  }
};

module.exports = { updateArmyField };
