using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PersonalFinance.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStatementImports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "statement_import_batches",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    credit_card_account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    original_file_name = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    file_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    statement_period_start = table.Column<DateOnly>(type: "date", nullable: true),
                    statement_period_end = table.Column<DateOnly>(type: "date", nullable: true),
                    payment_due_date = table.Column<DateOnly>(type: "date", nullable: true),
                    previous_balance = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    payment_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    new_charges = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    statement_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    minimum_payment = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    parser_version = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    parsed_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    posted_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    error_code = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    error_message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_statement_import_batches", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "statement_import_rows",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    batch_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_row_number = table.Column<int>(type: "integer", nullable: false),
                    transaction_date = table.Column<DateOnly>(type: "date", nullable: true),
                    posting_date = table.Column<DateOnly>(type: "date", nullable: true),
                    raw_description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    normalized_description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    foreign_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    foreign_currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: true),
                    type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    is_installment = table.Column<bool>(type: "boolean", nullable: false),
                    installment_current_number = table.Column<int>(type: "integer", nullable: true),
                    installment_total_number = table.Column<int>(type: "integer", nullable: true),
                    raw_text = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    fingerprint = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    match_status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    matched_transaction_id = table.Column<Guid>(type: "uuid", nullable: true),
                    review_status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    category_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_transaction_id = table.Column<Guid>(type: "uuid", nullable: true),
                    failure_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_statement_import_rows", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_statement_import_batches_created_at_utc",
                table: "statement_import_batches",
                column: "created_at_utc");

            migrationBuilder.CreateIndex(
                name: "IX_statement_import_batches_user_id_credit_card_account_id_fil~",
                table: "statement_import_batches",
                columns: new[] { "user_id", "credit_card_account_id", "file_hash" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_statement_import_batches_user_id_credit_card_account_id_sta~",
                table: "statement_import_batches",
                columns: new[] { "user_id", "credit_card_account_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_statement_import_rows_batch_id",
                table: "statement_import_rows",
                column: "batch_id");

            migrationBuilder.CreateIndex(
                name: "IX_statement_import_rows_created_transaction_id",
                table: "statement_import_rows",
                column: "created_transaction_id");

            migrationBuilder.CreateIndex(
                name: "IX_statement_import_rows_fingerprint",
                table: "statement_import_rows",
                column: "fingerprint");

            migrationBuilder.CreateIndex(
                name: "IX_statement_import_rows_review_status",
                table: "statement_import_rows",
                column: "review_status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "statement_import_batches");

            migrationBuilder.DropTable(
                name: "statement_import_rows");
        }
    }
}
