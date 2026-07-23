namespace PersonalFinance.Domain.StatementImports;

public enum StatementImportBatchStatus
{
    Uploaded,
    Parsed,
    ReviewRequired,
    PartiallyPosted,
    Completed,
    Failed,
    Duplicate,
    Discarded
}
