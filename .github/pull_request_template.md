# Notification System Implementation

**Type**: `feat`  
**Subsystem**: `notifications` (Backend + Frontend)  
**Related Issue**: Closes #N/A

---

## Summary

This PR implements a comprehensive in-app notification system for U-Connect, enabling real-time user notifications for complaint lifecycle events (submission, status changes, comments). The system includes both backend services and frontend UI components.

## Changes Made

### Backend (`/backend/`)

1. **New Model**: `internal/models/notification.go`
   - Notification entity with fields: `UserID`, `Type`, `Title`, `Description`, `RelatedComplaintID`, `ReadAt`
   - Supports filtering and tracking read/unread state

2. **New Service**: `internal/services/notification_service.go`
   - `List(userID uint)` — Fetch all notifications for a user ordered by creation date
   - `MarkRead(notificationID, userID uint)` — Mark individual notification as read
   - `MarkAllRead(userID uint)` — Mark all unread notifications as read for a user
   - `Create(notification *Notification)` — Create a new notification

3. **New Handler**: `internal/handlers/notification_handler.go`
   - `List()` — GET `/api/notifications`
   - `MarkRead()` — PUT `/api/notifications/:id/read`
   - `MarkAllRead()` — PUT `/api/notifications/read-all`

4. **Route Integration**: `internal/routes/routes.go`
   - Added notification endpoints under protected `/api/notifications/*` routes

5. **Complaint Service Integration**: `internal/services/complaint_service.go`
   - Auto-create notifications on complaint submission
   - Auto-create notifications on status updates
   - Auto-create notifications when non-user comments are added

6. **Database Migration**: `migrations/auto_migrate.go`
   - Added `Notification` model to auto-migration schema

### Frontend (`/frontend/`)

1. **New Service**: `src/services/notification.service.ts`
   - `getNotifications()` — Fetch user's notification list
   - `markAsRead(id)` — Mark single notification as read
   - `markAllAsRead()` — Mark all notifications as read

2. **Updated Component**: `src/components/layout/Navbar.tsx`
   - Integrated live notification badge showing unread count
   - Implemented notification dropdown with full list
   - Real-time "mark as read" functionality
   - Formatted relative timestamps (e.g., "12m ago", "2h ago")
   - Loading state and empty state handling
   - Visual distinction between read/unread notifications (background color, font weight)

3. **Type Definitions**: `src/types/api.ts`
   - Added `Notification` interface matching backend model

## Testing & Verification

### Backend Verification
```bash
cd backend
go test ./... -v
```
✅ All tests pass  
✅ Notifications created on complaint submission  
✅ Notifications created on status updates  
✅ Notifications created on comments  
✅ Read status correctly toggles and persists  

### Frontend Verification
```bash
cd ../frontend
npm run build
```
✅ TypeScript compilation succeeds (0 errors)  
✅ No emojis introduced  
✅ Notification badge displays correct unread count  
✅ "Mark as read" interactions work without errors  
✅ Navbar styling maintains OpenAI-inspired aesthetic  

## Compliance with Guidelines

- ✅ **Branch Naming**: `feature/notifications` follows `feature/<subsystem>-<short-description>` pattern
- ✅ **Commit Types**: Using `feat` type per Conventional Commits
- ✅ **Code Style - Backend**:
  - Layer separation maintained (Handler → Service → Model)
  - JWT middleware validates all protected routes
  - Error handling with `utils.Error()` response wrapper
  
- ✅ **Code Style - Frontend**:
  - Strict TypeScript types (no `any` usage)
  - No emojis; `lucide-react` icons only
  - OpenAI aesthetic maintained (neutrals: `#fbfbfb`, `#18181b`, `#f4f4f5`)
  - Portal not needed for dropdown (Navbar is top-level component)

- ✅ **PR Review Requirements**:
  - At least 1 peer review needed
  - Backend changes require approval from **@Moon9t**

- ✅ **Merge Strategy**: Ready for **Squash and Merge** to maintain clean history

---

## Related Files Changed

| File | Type | Purpose |
|---|---|---|
| `backend/cmd/api/main.go` | Modified | Initialize NotificationService and NotificationHandler |
| `backend/internal/models/notification.go` | **New** | Notification entity |
| `backend/internal/services/notification_service.go` | **New** | Notification CRUD and read-state logic |
| `backend/internal/handlers/notification_handler.go` | **New** | HTTP handlers for notification endpoints |
| `backend/internal/routes/routes.go` | Modified | Register notification routes |
| `backend/internal/services/complaint_service.go` | Modified | Emit notifications on complaint events |
| `backend/migrations/auto_migrate.go` | Modified | Add Notification schema |
| `frontend/src/services/notification.service.ts` | **New** | Notification API client |
| `frontend/src/components/layout/Navbar.tsx` | Modified | Notification dropdown UI |
| `frontend/src/types/api.ts` | Modified | Add Notification interface |

---

## Deployment Notes

- ✅ Database migration runs automatically on backend startup (`AutoMigrate()`)
- ✅ No breaking changes to existing APIs
- ✅ Backward compatible with existing complaint workflows
- ✅ Notifications are optional UI enhancement (non-blocking if service fails)

---

## Screenshots / Demo

*Notification badge appears on Navbar when unread notifications exist*  
*Dropdown shows: Title, Description, Relative Timestamp, Read/Unread Visual State*  
*"Mark All as Read" button clears unread count*

