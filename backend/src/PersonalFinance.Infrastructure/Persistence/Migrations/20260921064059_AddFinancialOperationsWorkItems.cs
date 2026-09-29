using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PersonalFinance.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFinancialOperationsWorkItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "financial_event_activities",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    financial_event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    description = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    occurred_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_financial_event_activities", x => x.id);
                    table.ForeignKey(
                        name: "FK_financial_event_activities_financial_events_financial_event~",
                        column: x => x.financial_event_id,
                        principalTable: "financial_events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "financial_event_capture_links",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    financial_event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    transaction_capture_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_financial_event_capture_links", x => x.id);
                    table.ForeignKey(
                        name: "FK_financial_event_capture_links_financial_events_financial_ev~",
                        column: x => x.financial_event_id,
                        principalTable: "financial_events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_financial_event_capture_links_transaction_captures_transact~",
                        column: x => x.transaction_capture_id,
                        principalTable: "transaction_captures",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "financial_event_checklist_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    financial_event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    text = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    is_completed = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    completed_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_financial_event_checklist_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_financial_event_checklist_items_financial_events_financial_~",
                        column: x => x.financial_event_id,
                        principalTable: "financial_events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_financial_event_activities_financial_event_id_occurred_at_u~",
                table: "financial_event_activities",
                columns: new[] { "financial_event_id", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_financial_event_capture_links_financial_event_id_transactio~",
                table: "financial_event_capture_links",
                columns: new[] { "financial_event_id", "transaction_capture_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_financial_event_capture_links_transaction_capture_id",
                table: "financial_event_capture_links",
                column: "transaction_capture_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_financial_event_checklist_items_financial_event_id_sort_ord~",
                table: "financial_event_checklist_items",
                columns: new[] { "financial_event_id", "sort_order" });

            migrationBuilder.Sql(
                """
                INSERT INTO financial_event_activities (id, financial_event_id, type, description, occurred_at_utc)
                SELECT gen_random_uuid(), id, 'Created', '建立財務事項', created_at_utc
                FROM financial_events;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "financial_event_activities");

            migrationBuilder.DropTable(
                name: "financial_event_capture_links");

            migrationBuilder.DropTable(
                name: "financial_event_checklist_items");
        }
    }
}
