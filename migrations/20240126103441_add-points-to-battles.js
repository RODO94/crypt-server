/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("battles", (table) => {
    table.mediumint("player_1_points").defaultTo(0);
    table.mediumint("player_2_points").defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("battles", (table) => {
    table.dropColumn("player_1_points");
    table.dropColumn("player_2_points");
  });
};
