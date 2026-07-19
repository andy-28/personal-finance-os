using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PersonalFinance.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCreditCardsAndInstallmentPlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "credit_card_accounts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    issuer_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    card_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    last_four_digits = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    credit_limit = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    statement_closing_day = table.Column<int>(type: "integer", nullable: false),
                    payment_due_day = table.Column<int>(type: "integer", nullable: false),
                    payment_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_credit_card_accounts", x => x.id);
                    table.CheckConstraint("ck_credit_card_accounts_credit_limit_positive", "credit_limit IS NULL OR credit_limit > 0");
                    table.CheckConstraint("ck_credit_card_accounts_payment_due_day", "payment_due_day BETWEEN 1 AND 31");
                    table.CheckConstraint("ck_credit_card_accounts_payment_not_self", "payment_account_id IS NULL OR payment_account_id <> account_id");
                    table.CheckConstraint("ck_credit_card_accounts_statement_closing_day", "statement_closing_day BETWEEN 1 AND 31");
                    table.ForeignKey(
                        name: "FK_credit_card_accounts_accounts_account_id",
                        column: x => x.account_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_credit_card_accounts_accounts_payment_account_id",
                        column: x => x.payment_account_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_credit_card_accounts_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "credit_card_transaction_metadata",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    transaction_id = table.Column<Guid>(type: "uuid", nullable: false),
                    credit_card_account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    purchase_date = table.Column<DateOnly>(type: "date", nullable: false),
                    posted_date = table.Column<DateOnly>(type: "date", nullable: true),
                    merchant = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    original_transaction_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_credit_card_transaction_metadata", x => x.id);
                    table.ForeignKey(
                        name: "FK_credit_card_transaction_metadata_accounts_credit_card_accou~",
                        column: x => x.credit_card_account_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_credit_card_transaction_metadata_transactions_original_tran~",
                        column: x => x.original_transaction_id,
                        principalTable: "transactions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_credit_card_transaction_metadata_transactions_transaction_id",
                        column: x => x.transaction_id,
                        principalTable: "transactions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_credit_card_transaction_metadata_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "installment_plans",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    credit_card_account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    merchant = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    purchase_date = table.Column<DateOnly>(type: "date", nullable: false),
                    original_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    installment_count = table.Column<int>(type: "integer", nullable: false),
                    installment_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    first_installment_date = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_installment_plans", x => x.id);
                    table.CheckConstraint("ck_installment_plans_installment_count_positive", "installment_count > 0");
                    table.CheckConstraint("ck_installment_plans_original_amount_positive", "original_amount > 0");
                    table.ForeignKey(
                        name: "FK_installment_plans_accounts_credit_card_account_id",
                        column: x => x.credit_card_account_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_installment_plans_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "installment_schedule_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    installment_plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    installment_number = table.Column<int>(type: "integer", nullable: false),
                    due_date = table.Column<DateOnly>(type: "date", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    transaction_id = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_installment_schedule_items", x => x.id);
                    table.CheckConstraint("ck_installment_schedule_items_amount_positive", "amount > 0");
                    table.CheckConstraint("ck_installment_schedule_items_number_positive", "installment_number > 0");
                    table.ForeignKey(
                        name: "FK_installment_schedule_items_installment_plans_installment_pl~",
                        column: x => x.installment_plan_id,
                        principalTable: "installment_plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_installment_schedule_items_transactions_transaction_id",
                        column: x => x.transaction_id,
                        principalTable: "transactions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_credit_card_accounts_account_id",
                table: "credit_card_accounts",
                column: "account_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_credit_card_accounts_payment_account_id",
                table: "credit_card_accounts",
                column: "payment_account_id");

            migrationBuilder.CreateIndex(
                name: "IX_credit_card_accounts_user_id_account_id",
                table: "credit_card_accounts",
                columns: new[] { "user_id", "account_id" });

            migrationBuilder.CreateIndex(
                name: "IX_credit_card_transaction_metadata_credit_card_account_id",
                table: "credit_card_transaction_metadata",
                column: "credit_card_account_id");

            migrationBuilder.CreateIndex(
                name: "IX_credit_card_transaction_metadata_original_transaction_id",
                table: "credit_card_transaction_metadata",
                column: "original_transaction_id");

            migrationBuilder.CreateIndex(
                name: "IX_credit_card_transaction_metadata_transaction_id",
                table: "credit_card_transaction_metadata",
                column: "transaction_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_credit_card_transaction_metadata_user_id_credit_card_accoun~",
                table: "credit_card_transaction_metadata",
                columns: new[] { "user_id", "credit_card_account_id", "purchase_date" });

            migrationBuilder.CreateIndex(
                name: "IX_installment_plans_credit_card_account_id",
                table: "installment_plans",
                column: "credit_card_account_id");

            migrationBuilder.CreateIndex(
                name: "IX_installment_plans_user_id_credit_card_account_id_status",
                table: "installment_plans",
                columns: new[] { "user_id", "credit_card_account_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_installment_schedule_items_installment_plan_id_installment_~",
                table: "installment_schedule_items",
                columns: new[] { "installment_plan_id", "installment_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_installment_schedule_items_transaction_id",
                table: "installment_schedule_items",
                column: "transaction_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "credit_card_accounts");

            migrationBuilder.DropTable(
                name: "credit_card_transaction_metadata");

            migrationBuilder.DropTable(
                name: "installment_schedule_items");

            migrationBuilder.DropTable(
                name: "installment_plans");
        }
    }
}
