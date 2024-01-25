const crypto = require("crypto");
const knex = require("knex")(require("../knexfile"));

const multiplayerKnexInsert = async (playerArray, teamID) => {
  teamArray = [];
  for (i = 0; i < playerArray.length; i++) {
    let playerID = crypto.randomUUID();
    let playerObj = {
      id: playerID,
      army_id: playerArray[i].army_id,
      team_id: teamID,
    };

    teamArray.push(playerObj);
    await knex("combatants").insert(playerObj);
  }
  return teamArray;
};

module.exports = { multiplayerKnexInsert };
