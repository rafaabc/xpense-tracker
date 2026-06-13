# Slice 2 — Currency + Groups + Subcategories Implementation Plan

**Status:** 🔜 In progress

**Goal:** Currency preference setting, full Group CRUD, full Subcategory CRUD — Server Actions + UI + tests.

**User Stories:** US-05 (Currency), US-06 (Groups), US-07 (Subcategories)

---

## Test Conditions Coverage

### Unit Tests

| File | TCs Covered | Status |
|------|------------|--------|
| `tests/unit/currency/config.test.ts` | TC-05-02: Only DKK and BRL offered; TC-05-03: Default is DKK; TC-05-06: Currency change never mutates stored values | ⬜ |
| `tests/unit/groups/validation.test.ts` | TC-06-01: Create group name validation; TC-06-02: Rename group validation; TC-06-03: Case-insensitive uniqueness; TC-06-04: Same-name-different-case rejected | ⬜ |
| `tests/unit/groups/modal.test.tsx` | TC-06-05: Delete confirmation modal renders; TC-06-06: Modal shows cascade warning when group has subcategories; TC-06-11: Cancel leaves state unchanged | ⬜ |
| `tests/unit/subcategories/validation.test.ts` | TC-07-01: Create subcategory requires name + parent; TC-07-02: Parent group is required; TC-07-03: Rename validation; TC-07-04: Case-insensitive unique within parent; TC-07-05: Same name allowed across different groups | ⬜ |
| `tests/unit/subcategories/modal.test.tsx` | TC-07-06: Delete confirmation modal renders; TC-07-07: Modal warns about expense deletion; TC-07-10: Cancel leaves state unchanged; TC-07-11: No parent-group edit option rendered | ⬜ |

### Mocked Integration Tests

| File | TCs Covered | Status |
|------|------------|--------|
| `tests/mocked-integration/groups/actions.test.ts` | TC-06-07: deleteGroup calls DB with correct ID; TC-06-08: cascade deletes subcategories; TC-06-09: cascade deletes expenses; TC-06-10: deletes regardless of expense count | ⬜ |
| `tests/mocked-integration/subcategories/actions.test.ts` | TC-07-08: deleteSubcategory calls DB with correct ID; TC-07-09: cascade deletes expenses; TC-07-12: no reassignParent method exists | ⬜ |

### E2E Tests (deferred to end of slice)

| TCs | Status |
|-----|--------|
| TC-05-01/05: Change currency in settings, see immediate UI-wide update | ⏸ Deferred |
| TC-06-01→09 / TC-07-01→09: Group+Subcategory lifecycle, cascading delete visible in UI | ⏸ Deferred |

---

## Files to Create / Modify

| File | Purpose |
|------|---------|
| `lib/validations/currency.ts` | `CURRENCIES` tuple, `validateCurrency()` pure fn |
| `lib/validations/groups.ts` | `validateGroupName()` — non-empty, string |
| `lib/validations/subcategories.ts` | `validateSubcategoryName()`, `validateParentGroupId()` |
| `app/actions/currency.ts` | `updateCurrency(currency)` Server Action |
| `app/actions/groups.ts` | `createGroup`, `renameGroup`, `deleteGroup` Server Actions |
| `app/actions/subcategories.ts` | `createSubcategory`, `renameSubcategory`, `deleteSubcategory` Server Actions |
| `components/DeleteConfirmModal.tsx` | Reusable confirmation modal — `hasChildren` prop for cascade warning |
| `app/(app)/settings/page.tsx` | Currency selector page |
| `app/(app)/categories/page.tsx` | Groups + subcategories management page |

---

## Tasks

### Task 1 — Currency validation (pure logic)
- [ ] Write `tests/unit/currency/config.test.ts` (TC-05-02/03/06)
- [ ] Run test, confirm fail
- [ ] Write `lib/validations/currency.ts`
- [ ] Run test, confirm pass
- [ ] Commit

### Task 2 — Group name validation (pure logic)
- [ ] Write `tests/unit/groups/validation.test.ts` (TC-06-01/02/03/04)
- [ ] Run test, confirm fail
- [ ] Write `lib/validations/groups.ts`
- [ ] Run test, confirm pass
- [ ] Commit

### Task 3 — Subcategory validation (pure logic)
- [ ] Write `tests/unit/subcategories/validation.test.ts` (TC-07-01/02/03/04/05)
- [ ] Run test, confirm fail
- [ ] Write `lib/validations/subcategories.ts`
- [ ] Run test, confirm pass
- [ ] Commit

### Task 4 — Server Actions: currency + groups + subcategories
- [ ] Write `app/actions/currency.ts` (`updateCurrency`)
- [ ] Write `app/actions/groups.ts` (`createGroup`, `renameGroup`, `deleteGroup`)
- [ ] Write `app/actions/subcategories.ts` (`createSubcategory`, `renameSubcategory`, `deleteSubcategory`)
- [ ] Commit

### Task 5 — Mocked integration: group delete cascade
- [ ] Write `tests/mocked-integration/groups/actions.test.ts` (TC-06-07/08/09/10)
- [ ] Run test, confirm pass (DB-level cascade means mock verifies action calls delete correctly)
- [ ] Commit

### Task 6 — Mocked integration: subcategory delete + no reassign
- [ ] Write `tests/mocked-integration/subcategories/actions.test.ts` (TC-07-08/09/12)
- [ ] Run test, confirm pass
- [ ] Commit

### Task 7 — DeleteConfirmModal component + tests
- [ ] Write `components/DeleteConfirmModal.tsx`
- [ ] Write `tests/unit/groups/modal.test.tsx` (TC-06-05/06/11)
- [ ] Write `tests/unit/subcategories/modal.test.tsx` (TC-07-06/07/10/11)
- [ ] Run all tests, confirm pass
- [ ] Commit

### Task 8 — UI: Settings page (currency)
- [ ] Invoke `/xpense-design` before implementing
- [ ] Write `app/(app)/settings/page.tsx`
- [ ] Run dev server, verify currency selector renders and saves
- [ ] Commit

### Task 9 — UI: Categories page (groups + subcategories)
- [ ] Write `app/(app)/categories/page.tsx`
- [ ] Run dev server, verify create/rename/delete flows work end-to-end
- [ ] Commit

### Task 10 — Final check + PR
- [ ] Run `npm test`, confirm all tests pass
- [ ] Mark all tasks above `[x]`
- [ ] Update `docs/superpowers/plans/2026-06-13-slice-1-auth.md` if anything changed
- [ ] Update memory files (slice status, next slice)
- [ ] Open PR
