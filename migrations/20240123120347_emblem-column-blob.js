/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .alterTable("armies", (table) => {
      table.string("emblem");
      table.dropForeign("emblem_id");
    })
    .dropTable("emblems");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .createTable("emblems", (table) => {
      table.string("id").primary();
      table.binary("emblem_blob").notNullable();
      table.string("emblem_name").notNullable();
    })
    .alterTable("armies", (table) => {
      table.dropColumn("emblem");
      table.string("emblem_id").references("emblems.id");
    });
};
