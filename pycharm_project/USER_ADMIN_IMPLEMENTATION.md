# Django User Admin Flag Implementation

## Overview

This implementation adds an admin flag functionality to the Django backend using a UserProfile model that extends Django's default User model. The system maintains compatibility with existing code while adding comprehensive admin management features.

## Implementation Details

### 1. UserProfile Model (`api/models/user_profile.py`)

- **Purpose**: Extends Django's default User model with admin flag and frontend user ID
- **Key Features**:
  - `is_admin`: Boolean field for admin status
  - `frontend_user_id`: Links Django users to frontend user identifiers
  - Automatic profile creation via Django signals
  - Proper indexing for performance

### 2. Database Migration (`api/migrations/0008_add_user_profile.py`)

- **Creates**: `user_profiles` table with proper relationships
- **Indexes**: Added for `frontend_user_id` and `is_admin` fields
- **Relationships**: OneToOne relationship with Django User model

### 3. User Service (`api/services/user_service.py`)

Provides a comprehensive service layer for user management:

- `get_user_by_frontend_id(frontend_user_id)`: Retrieve user by frontend ID
- `is_admin_user(user)`: Check if user is admin
- `is_admin_by_frontend_id(frontend_user_id)`: Check admin status by frontend ID
- `set_admin_status(user, is_admin)`: Set admin status
- `create_user_with_profile()`: Create user with profile in one transaction
- `get_all_admin_users()`: Get all admin users
- `link_frontend_user_id()`: Link frontend ID to existing user

### 4. Admin Interface (`api/admin.py`)

Enhanced Django admin interface:

- **UserProfileInline**: Shows profile fields in user edit form
- **Custom UserAdmin**: Displays admin flag in user list
- **UserProfileAdmin**: Standalone profile management
- **Filtering**: Filter users by admin status

### 5. API Endpoints (`api/views/user_admin.py`)

RESTful API endpoints for user management:

- `GET /api/users/{frontend_user_id}/profile/`: Get user profile
- `GET /api/users/{frontend_user_id}/admin-status/`: Check admin status
- `POST /api/users/{frontend_user_id}/admin-status/set/`: Set admin status
- `GET /api/users/admin/`: List all admin users
- `POST /api/users/{user_id}/link-frontend/`: Link frontend user ID

### 6. Serializers (`api/serializers/user_profile.py`)

- **UserProfileSerializer**: Serializes profile data with user info
- **UserWithProfileSerializer**: Complete user + profile serialization
- **AdminStatusSerializer**: Validates admin status updates

## Current Database Structure

The project uses a mixed approach:

1. **Django User Model**: Standard `django.contrib.auth.models.User`
2. **String-based User IDs**: Many models use `user_id` as CharField
3. **UserProfile Extension**: New model extends User with admin flag

## Usage Examples

### Python Code Usage

```python
from django.contrib.auth.models import User
from api.services.user_service import UserService

# Create user with admin flag
user, profile = UserService.create_user_with_profile(
    username='admin_user',
    email='admin@example.com',
    frontend_user_id='frontend_123',
    is_admin=True
)

# Check admin status
is_admin = UserService.is_admin_by_frontend_id('frontend_123')

# Set admin status
UserService.set_admin_status(user, True)

# Get all admin users
admin_users = UserService.get_all_admin_users()
```

### API Usage

```bash
# Check admin status
curl -X GET "/api/users/frontend_123/admin-status/"

# Set admin status
curl -X POST "/api/users/frontend_123/admin-status/set/" \
  -H "Content-Type: application/json" \
  -d '{"is_admin": true}'

# List all admin users
curl -X GET "/api/users/admin/"
```

## File Structure

```
api/
├── models/
│   ├── user_profile.py          # New UserProfile model
│   └── __init__.py              # Updated imports
├── migrations/
│   └── 0008_add_user_profile.py # Database migration
├── services/
│   └── user_service.py          # User management service
├── serializers/
│   └── user_profile.py          # API serializers
├── views/
│   └── user_admin.py            # API views
├── examples/
│   └── admin_usage.py           # Usage examples
├── admin.py                     # Updated admin interface
└── urls.py                      # Updated URL patterns
```

## Migration Steps

1. **Apply Migration**:
   ```bash
   python manage.py migrate
   ```

2. **Create Superuser** (if needed):
   ```bash
   python manage.py createsuperuser
   ```

3. **Access Admin Interface**:
   - Navigate to `/admin/`
   - Edit users to set admin flags
   - Use the UserProfile admin for bulk operations

## Key Features

- **Backward Compatibility**: Existing code continues to work
- **Automatic Profile Creation**: New users get profiles via Django signals
- **Admin Interface**: Enhanced Django admin for user management
- **RESTful API**: Complete API for frontend integration
- **Performance Optimized**: Proper database indexing
- **Transaction Safety**: Atomic operations where needed

## Security Considerations

- All admin endpoints require authentication
- Admin status changes should be logged (can be added)
- Frontend user ID uniqueness is enforced
- Proper permission checks can be added based on requirements

## Testing

The implementation includes comprehensive error handling and validation:

- Frontend user ID uniqueness validation
- Proper error responses for missing users
- Transaction rollback on failures
- Input validation for all API endpoints

## Future Enhancements

- **Permissions System**: Role-based permissions beyond admin flag
- **Audit Logging**: Track admin status changes
- **Bulk Operations**: Admin tools for batch user management
- **API Permissions**: Role-based API access control