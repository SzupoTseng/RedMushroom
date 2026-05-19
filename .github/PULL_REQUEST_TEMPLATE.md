## Summary
-

## Test plan
- [ ] `npm run test:e2e` passes
- [ ] `cd backend && npm test` passes
- [ ] Manually verified the golden path in a browser
- [ ] SEN-mode regression check (if UI changed): `UPDATE users SET is_sen_mode = 1 WHERE username = 'student1'`

## Security check
- [ ] All new SQL touching student data includes `WHERE user_id = ?`
- [ ] No new endpoint bypasses `authMiddleware`
- [ ] No `correct_answer` leak in any new `/api/quiz/*` response
- [ ] No `any` type added in new TypeScript code
