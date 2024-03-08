/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createView("battle_view", function (view) {
    view.columns([
      "battles.*",
      "a1.type AS a1_type",
      "a1.emblem AS a1_emblem",
      "a1.name AS a1_name",
      "a2.type AS a2_type",
      "a2.emblem AS a2_emblem",
      "a1.user_id AS a1_userid",
      "a2.user_id AS a2_userid",
      "a2.name AS a2_name",
      "cb1.id AS cb1_id",
      "cb2.id AS cb2_id",
      "cb1.army_id AS cb1_armyid",
      "cb2.army_id AS cb2_armyid",
      "cb1.team_id AS cb1_teamid",
      "cb2.team_id AS cb2_teamid",
      "u1.known_as AS u1_known_as",
      "u2.known_as AS u2_known_as",
    ]);

    view.as(
      knex("battles")
        .where({ status: "submitted" })
        .join("combatants AS cb1", function () {
          this.on("battles.player_1_id", "=", "cb1.id").orOn(
            "battles.player_1_id",
            "=",
            "cb1.team_id"
          );
        })
        .join("combatants AS cb2", function () {
          this.on("battles.player_2_id", "=", "cb2.id").orOn(
            "battles.player_2_id",
            "=",
            "cb2.team_id"
          );
        })
        .join("armies AS a1", "cb1.army_id", "a1.id")
        .join("armies AS a2", "cb2.army_id", "a2.id")
        .join("users as u1", "a1.user_id", "=", "u1.id")
        .join("users as u2", "a2.user_id", "=", "u2.id")
        .select(
          "battles.*",
          "a1.type AS a1_type",
          "a1.emblem AS a1_emblem",
          "a1.name AS a1_name",
          "a2.type AS a2_type",
          "a2.emblem AS a2_emblem",
          "a1.user_id AS a1_userid",
          "a2.user_id AS a2_userid",
          "a2.name AS a2_name",
          "cb1.id AS cb1_id",
          "cb2.id AS cb2_id",
          "cb1.army_id AS cb1_armyid",
          "cb2.army_id AS cb2_armyid",
          "cb1.team_id AS cb1_teamid",
          "cb2.team_id AS cb2_teamid",
          "u1.known_as AS u1_known_as",
          "u2.known_as AS u2_known_as"
        )
        .orderBy("date", "desc")
    );
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropView("battle_view");
};
