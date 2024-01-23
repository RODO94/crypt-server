/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("rank", (table) => {
    table.dropColumn("rank");
    table.dropColumn("prev_rank");
    table.decimal("ranking", 6, 2).notNullable();
    table.decimal("prev_ranking", 6, 2);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("rank", (table) => {
    table.dropColumn("ranking");
    table.dropColumn("prev_ranking");
    table.smallint("rank").notNullable();
    table.smallint("prev_rank");
  });
};
