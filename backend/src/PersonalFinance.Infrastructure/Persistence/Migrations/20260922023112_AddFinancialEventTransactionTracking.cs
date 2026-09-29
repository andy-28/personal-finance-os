using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PersonalFinance.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFinancialEventTransactionTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_financial_events_related_transaction_id",
                table: "financial_events");

            migrationBuilder.AddColumn<bool>(
                name: "is_cash_flow_realized",
                table: "financial_events",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_financial_events_related_transaction_id",
                table: "financial_events",
                column: "related_transaction_id",
                unique: true,
                filter: "related_transaction_id IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_financial_events_related_transaction_id",
                table: "financial_events");

            migrationBuilder.DropColumn(
                name: "is_cash_flow_realized",
                table: "financial_events");

            migrationBuilder.CreateIndex(
                name: "IX_financial_events_related_transaction_id",
                table: "financial_events",
                column: "related_transaction_id");
        }
    }
}
