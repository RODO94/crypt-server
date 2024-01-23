/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .alterTable("combatants", (table) => {
      table.dropForeign("army_id");
    })
    .alterTable("matches", (table) => {
      table.dropForeign("player_1_id");
      table.dropForeign("player_2_id");
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .alterTable("combatants", (table) => {
      table.foreign("army_id");
    })
    .alterTable("matches", (table) => {
      table.foreign("player_1_id");
      table.foreign("player_2_id");
    });
};
