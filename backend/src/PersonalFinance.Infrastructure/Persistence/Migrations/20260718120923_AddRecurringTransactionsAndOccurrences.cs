using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PersonalFinance.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringTransactionsAndOccurrences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "recurring_transaction_templates",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    transaction_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    source_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    destination_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    category_id = table.Column<Guid>(type: "uuid", nullable: true),
                    merchant = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    description = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    frequency = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    interval = table.Column<int>(type: "integer", nullable: false),
                    day_of_month = table.Column<int>(type: "integer", nullable: true),
                    day_of_week = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    next_occurrence_date = table.Column<DateOnly>(type: "date", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recurring_transaction_templates", x => x.id);
                    table.CheckConstraint("ck_recurring_transaction_templates_amount_positive", "amount > 0");
                    table.CheckConstraint("ck_recurring_transaction_templates_day_of_month", "day_of_month IS NULL OR day_of_month BETWEEN 1 AND 31");
                    table.CheckConstraint("ck_recurring_transaction_templates_interval_positive", "interval > 0");
                    table.ForeignKey(
                        name: "FK_recurring_transaction_templates_accounts_destination_accoun~",
                        column: x => x.destination_account_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_recurring_transaction_templates_accounts_source_account_id",
                        column: x => x.source_account_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_recurring_transaction_templates_categories_category_id",
                        column: x => x.category_id,
                        principalTable: "categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_recurring_transaction_templates_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "recurring_transaction_occurrences",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    template_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scheduled_date = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    posted_transaction_id = table.Column<Guid>(type: "uuid", nullable: true),
                    skipped_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recurring_transaction_occurrences", x => x.id);
                    table.ForeignKey(
                        name: "FK_recurring_transaction_occurrences_recurring_transaction_tem~",
                        column: x => x.template_id,
                        principalTable: "recurring_transaction_templates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_recurring_transaction_occurrences_transactions_posted_trans~",
                        column: x => x.posted_transaction_id,
                        principalTable: "transactions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_recurring_transaction_occurrences_posted_transaction_id",
                table: "recurring_transaction_occurrences",
                column: "posted_transaction_id");

            migrationBuilder.CreateIndex(
                name: "IX_recurring_transaction_occurrences_status_scheduled_date",
                table: "recurring_transaction_occurrences",
                columns: new[] { "status", "scheduled_date" });

            migrationBuilder.CreateIndex(
                name: "IX_recurring_transaction_occurrences_template_id_scheduled_date",
                table: "recurring_transaction_occurrences",
                columns: new[] { "template_id", "scheduled_date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_recurring_transaction_templates_category_id",
                table: "recurring_transaction_templates",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "IX_recurring_transaction_templates_destination_account_id",
                table: "recurring_transaction_templates",
                column: "destination_account_id");

            migrationBuilder.CreateIndex(
                name: "IX_recurring_transaction_templates_source_account_id",
                table: "recurring_transaction_templates",
                column: "source_account_id");

            migrationBuilder.CreateIndex(
                name: "IX_recurring_transaction_templates_user_id_is_active_next_occu~",
                table: "recurring_transaction_templates",
                columns: new[] { "user_id", "is_active", "next_occurrence_date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "recurring_transaction_occurrences");

            migrationBuilder.DropTable(
                name: "recurring_transaction_templates");
        }
    }
}
