# RBAC Implementation Tasks

## Phase 1 — Backend
- [x] Create `Server/models/Department.js`
- [x] Modify `Server/models/User.js` — keep user, admin, superadmin role, add department + permissions
- [x] Create `Server/middleware/permissionMiddleware.js`
- [x] Create `Server/controllers/departmentController.js`
- [x] Create `Server/routes/departmentRoutes.js`
- [x] Create `Server/seedDepartments.js`
- [x] Modify `Server/server.js` — mount routes, call seeder
- [x] Modify `Server/controllers/authController.js` — return permissions and department on login
- [x] Modify `Server/middleware/authMiddleware.js` — clean up database query

## Phase 2 — Frontend Core
- [x] Create `Client/src/context/AuthContext.jsx`
- [x] Modify `Client/src/Pages/Login.jsx` — store permissions
- [x] Modify `Client/src/components/AdminRoute.jsx` — permission-based
- [x] Create `Client/src/components/PermissionRoute.jsx`
- [x] Create `Client/src/Pages/Unauthorized.jsx` — 403 page
- [x] Modify `Client/src/admin/components/AdminSidebar.jsx` — dynamic nav
- [x] Create `Client/src/admin/RolesPermissions.jsx` — modern department management page
- [x] Modify `Client/src/App.jsx` — wrap with AuthProvider (in main.jsx), add route paths

## Phase 3 — Users Page
- [x] Modify `Client/src/admin/Users.jsx` — role, department, permissions, status columns + edit modal assignment fields

## Phase 4 — Verify & Push
- [x] `npm run build`
- [ ] `git add . && git commit && git push`
