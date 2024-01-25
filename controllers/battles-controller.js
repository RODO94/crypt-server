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

const singleToMultiCombatantUpdate = async (
  playerArray,
  prevPlayerID,
  teamID
) => {
  for (i = o; i < playerArray.length; i++) {
    if (playerArray[i].id === prevPlayerID) {
      await knex("combatant").where(
        { id: prevPlayerID }.update({ team_id: teamID })
      );
    } else {
      await knex("combatants").insert({
        id: crypto.randomUUID(),
        army_id: playerArray[i].army_id,
        team_id: teamID,
      });
    }
  }

  return await knex("combtant").where({ team_id: teamID });
};

const deleteCombatantTeam = async (teamID) => {
  await knex("combatants").where({ team_id: teamID }).del();
  return;
};

const addCombatant = async (army_id, combatantID) => {
  await knex("combatant").insert({ id: combatantID, army_id: army_id });

  return await knex("combatant").where({ id: combatantID }).first();
};

const assignNewCombatant = async (battleID, combatantID, player) => {
  if (player === 1) {
    await knex("battle")
      .where({ id: battleID })
      .update({ player_1_id: combatantID });
  } else if (player === 2) {
    await knex("battle")
      .where({ id: battleID })
      .update({ player_2_id: combatantID });
  }
};

module.exports = {
  multiplayerKnexInsert,
  singleToMultiCombatantUpdate,
  deleteCombatantTeam,
  addCombatant,
  assignNewCombatant,
};
