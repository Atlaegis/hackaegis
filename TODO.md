# HackForge TODO

## Role sync / flow checks
- Verify participant login binds to team correctly in `/watch` after code assignment.
- Verify admin team assignment/unassignment updates `/api/auth/my-team` immediately.
- Verify judge login/logout retains the correct role token in localStorage.
- Verify admin and judge redirects from home always land on the right page.

## Submission / results
- Verify locked submission state is enforced consistently for participant, admin, and judge views.
- Verify results page slug navigation and per-hackathon drill-down across all statuses.
- Verify score aggregation updates live after judge saves a score.

## Admin / data consistency
- Verify hackathon activate/complete/archive actions keep teams, polls, and dashboard stats synced.
- Verify code generation, reset, delete, and team-linking work end to end.
- Verify admin logs capture all key actions.

## UX cleanup
- Replace any remaining non-critical placeholder copy with final wording during polish pass.
- Do one final responsive pass on Home, Watch, Results, Admin, and Judges.

## Not in scope right now
- Payments / billing / checkout: no payment flow exists in the current product.
