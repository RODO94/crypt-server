/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .alterTable("matches", (table) => {
      table.renameColumn("match_type", "battle_type");
    })
    .renameTable("matches", "battles");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .alterTable("battles", (table) => {
      table.renameColumn("battle_type", "match_type");
    })
    .renameTable("battles", "matches");
};
