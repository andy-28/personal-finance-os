# Quest System

The Quest System is the Aether UI pattern for financial tasks. It turns reminders and upcoming work into a game-style task log.

## Current Quest Log

The current Quest Log is a floating window launched from the header. It summarizes:

- Credit card closing reminders
- Credit card payment due reminders
- Recurring transaction occurrences
- Installment schedule items

## Task

A task is currently a UI projection over existing data. It is not yet a standalone domain entity.

## Reminder

Reminders are derived from card settings, recurring templates, or forecast schedules. They do not affect balances.

## Completion

Some tasks can be completed by posting an existing occurrence or installment. Others route the user to the relevant page, such as Credit Cards.

## Future Achievement

The Quest concept could later support achievements, streaks, or financial hygiene goals. These should remain separate from ledger truth.

## Future Statistics

Possible future statistics:

- Completed tasks per week
- Missed due dates
- Recurring items posted on time
- Statement review completion time

## Future Goal

Quest could eventually connect with Goal DB, Budget, or Dashboard work. Today, it should remain a workflow surface.

## UI vs Domain

Currently UI-only:

- Quest window
- Quest categories
- Quest filters
- Task detail layout

Potential future domain:

- User-created reminders
- Completion history
- Achievement events
- Notification delivery

## Design Rule

Quest should help the user decide what to do next. It should not become a second calendar or a second ledger.
