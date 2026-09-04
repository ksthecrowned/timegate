# Avances sur salaire — design

## Goal
Suivre une avance employé et la retenir automatiquement sur le prochain cycle DRAFT.

## Model `SalaryAdvance`
- status: `PENDING` | `DISBURSED` | `DEDUCTED` | `CANCELLED`
- amount, notes, paidAt, deductedAt
- optional links: payrollRunId, payrollVariableItemId

## Rules
- Create → PENDING (or DISBURSED if paidAt set)
- Disburse → DISBURSED
- Cancel only if not DEDUCTED
- On `generateLines` for DRAFT: each DISBURSED advance for included employees → variable DEDUCTION source `SALARY_ADVANCE`, mark advance DEDUCTED
- One advance = one full deduction (no installments)
- Regenerating a DRAFT must not double-deduct already DEDUCTED advances; if variable items from advances are wiped with lines, need care

## Regenerate edge case
`generateLines` deletes lines and rebuilds. Variable items on the run are kept (manual). Auto-created advance items: on regenerate, either:
1. Keep DISBURSED→DEDUCTED irreversible and recreate deduction from DEDUCTED advances linked to this run, OR
2. When deleting lines for regenerate, reset advances that were deducted on THIS run back to DISBURSED, delete their AUTO variable items, then re-apply

Prefer (2) for DRAFT-only consistency.
