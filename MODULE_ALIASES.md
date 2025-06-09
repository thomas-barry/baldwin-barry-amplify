# Module Aliases Configuration

This project now uses module aliases to simplify import paths and improve code maintainability.

## Configured Aliases

| Alias            | Path               | Description       |
| ---------------- | ------------------ | ----------------- |
| `@/components/*` | `src/components/*` | UI components     |
| `@/modules/*`    | `src/modules/*`    | Feature modules   |
| `@/context/*`    | `src/context/*`    | React contexts    |
| `@/lib/*`        | `src/lib/*`        | Utility libraries |
| `@/assets/*`     | `src/assets/*`     | Static assets     |
| `@/routes/*`     | `src/routes/*`     | Route components  |
| `@/*`            | `src/*`            | Any src file      |

## Configuration Files Updated

### tsconfig.json

- Added `baseUrl: "."`
- Added `paths` mapping for all aliases

### vite.config.ts

- Added `resolve.alias` configuration
- Imported `path` module for path resolution

## Migration Examples

### Before (relative imports)

```tsx
import NavBar from '../components/navbar/NavBar';
import { useAuth } from '../../context/AuthContext';
import GalleryCard from '../modules/galleries/components/gallery-card/GalleryCard';
import facePalmImage from '../../assets/facepalm.jpg';
```

### After (module aliases)

```tsx
import NavBar from '@/components/navbar/NavBar';
import { useAuth } from '@/context/AuthContext';
import GalleryCard from '@/modules/galleries/components/gallery-card/GalleryCard';
import facePalmImage from '@/assets/facepalm.jpg';
```

## Files Updated

The following files have been updated to use module aliases:

- `src/routes/__root.tsx`
- `src/app/App.tsx`
- `src/main.tsx`
- `src/modules/galleries/Galleries.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/modules/login/LoginPage.tsx`
- `src/components/navbar/NavBar.tsx`
- `src/modules/galleries/components/gallery-card/GalleryCard.tsx`
- `src/modules/galleries/components/gallery/Gallery.tsx`
- `src/routes/login.tsx`
- `src/components/GalleryList.tsx`
- `src/routes/index.tsx`
- `src/routes/galleries/index.tsx`
- `src/routes/galleries/$galleryId.tsx`
- `src/routes/admin/index.tsx`

## Benefits

1. **Cleaner imports**: No more `../../../` relative path navigation
2. **Better maintainability**: Moving files doesn't break imports
3. **Improved readability**: Clear indication of what's being imported
4. **IDE support**: Better autocomplete and refactoring support
5. **Consistency**: Standardized import patterns across the project

## Usage Guidelines

- Use `@/components` for shared UI components
- Use `@/modules` for feature-specific components and logic
- Use `@/context` for React context providers and hooks
- Use `@/lib` for utility functions and shared logic
- Use `@/assets` for images, icons, and static files
- Use `@/*` as a fallback for any src files not covered by specific aliases
