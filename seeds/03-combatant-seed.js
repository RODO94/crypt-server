/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex("combatants").del();
  await knex("combatants").insert([
    { id: "1", army_id: "1", team_id: null },
    { id: "2", army_id: "1", team_id: null },
    { id: "3", army_id: "2", team_id: null },
    { id: "4", army_id: "2", team_id: null },
    { id: "5", army_id: "3", team_id: null },
    { id: "6", army_id: "4", team_id: null },
    { id: "7", army_id: "5", team_id: null },
    { id: "8", army_id: "6", team_id: null },
    { id: "9", army_id: "7", team_id: null },
    { id: "10", army_id: "8", team_id: null },
    { id: "11", army_id: "9", team_id: null },
    { id: "12", army_id: "10", team_id: null },
    { id: "13", army_id: "11", team_id: null },
    { id: "14", army_id: "12", team_id: null },
    { id: "16", army_id: "14", team_id: null },
    { id: "17", army_id: "15", team_id: null },
    { id: "18", army_id: "16", team_id: null },
    { id: "19", army_id: "17", team_id: null },
    { id: "20", army_id: "1", team_id: "1" },
    { id: "21", army_id: "2", team_id: "1" },
    { id: "22", army_id: "3", team_id: "2" },
    { id: "23", army_id: "5", team_id: "2" },
    { id: "24", army_id: "5", team_id: "3" },
    { id: "25", army_id: "6", team_id: "3" },
    { id: "26", army_id: "7", team_id: "4" },
    { id: "27", army_id: "3", team_id: "4" },
    { id: "28", army_id: "10", team_id: "5" },
    { id: "29", army_id: "11", team_id: "5" },
    { id: "30", army_id: "12", team_id: "5" },
    { id: "31", army_id: "9", team_id: "6" },
    { id: "32", army_id: "8", team_id: "6" },
    { id: "33", army_id: "13", team_id: "6" },
  ]);
};
