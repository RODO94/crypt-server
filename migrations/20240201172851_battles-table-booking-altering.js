/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("battles", (table) => {
    table.time("start", { precision: 0 }).notNullable();
    table.time("finish", { precision: 0 }).notNullable();
    table.string("table").notNullable().defaultTo("Table 0");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("battles", (table) => {
    table.dropColumn("start");
    table.dropColumn("finish");
    table.dropColumn("table");
  });
};
