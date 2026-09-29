using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PersonalFinance.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionCaptureInbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "capture_api_tokens",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    token_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_used_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    revoked_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_capture_api_tokens", x => x.id);
                    table.ForeignKey(
                        name: "FK_capture_api_tokens_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "transaction_captures",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency_code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    occurred_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    captured_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    description = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    merchant_raw = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    payment_instrument_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    payment_instrument_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    source_reference = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    dismissed_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transaction_captures", x => x.id);
                    table.CheckConstraint("ck_transaction_captures_amount", "amount > 0");
                    table.ForeignKey(
                        name: "FK_transaction_captures_accounts_payment_instrument_id",
                        column: x => x.payment_instrument_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_transaction_captures_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_capture_api_tokens_token_hash",
                table: "capture_api_tokens",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_capture_api_tokens_user_id_revoked_at_utc",
                table: "capture_api_tokens",
                columns: new[] { "user_id", "revoked_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_transaction_captures_payment_instrument_id",
                table: "transaction_captures",
                column: "payment_instrument_id");

            migrationBuilder.CreateIndex(
                name: "IX_transaction_captures_user_id_source_source_reference",
                table: "transaction_captures",
                columns: new[] { "user_id", "source", "source_reference" },
                unique: true,
                filter: "source_reference IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_transaction_captures_user_id_status_captured_at_utc",
                table: "transaction_captures",
                columns: new[] { "user_id", "status", "captured_at_utc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "capture_api_tokens");

            migrationBuilder.DropTable(
                name: "transaction_captures");
        }
    }
}
