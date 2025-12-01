# AGENTS.md - Nook Project Documentation

## Project Overview

**Nook** is a virtual room customization web application that allows users to create and decorate their personal "cozy corner of the internet." Users can add, position, resize, and link furniture/decor items to create a personalized virtual space.

### Key Concept

- Users authenticate and get a personal room
- Rooms contain items from a catalog that can be positioned on a canvas
- Items can have URLs attached, making them clickable shortcuts to favorite sites
- The UI features a hand-drawn aesthetic with a HUD-style interface

## Tech Stack

### Frontend

- **React 19.2.0** - UI framework
- **TypeScript** - Type safety
- **Vite 7.2.4** - Build tool and dev server
- **@clerk/clerk-react 5.57.0** - Authentication
- **Tailwind CSS** (via utility classes) - Styling
- **CSS Transforms** - Canvas scaling and positioning

### Backend

- **Convex 1.29.3** - Real-time backend as a service
  - Database (with queries and mutations)
  - Authentication integration
  - Schema validation

### Design System

- Font: `'Patrick_Hand'` (Google Font) for hand-drawn aesthetic
- Colors: Uses custom color palette with hand-drawn shadows (`shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]`)
- Components styled with slight rotations (`rotate-1`, `-rotate-1`) for playful feel

## Project Structure

```
nook/
├── src/
│   ├── main.tsx              # App entry point with Clerk + Convex providers
│   ├── App.tsx               # Root component with auth routing
│   ├── types.ts              # Shared TypeScript types (RoomItem)
│   ├── convexClient.ts       # Convex client configuration
│   ├── index.css             # Global styles
│   ├── room/                 # Room feature components
│   │   ├── RoomPage.tsx      # Main room page with mode switching and canvas
│   │   ├── ItemNode.tsx      # Individual item renderer
│   │   ├── AssetDrawer.tsx   # Side drawer for adding items (edit mode)
│   │   ├── TrashCan.tsx      # Delete items by dragging (edit mode)
│   │   ├── ComputerScreen.tsx # Computer interface modal
│   │   ├── MusicPlayerModal.tsx # Music player configuration modal
│   │   ├── InlineMusicPlayer.tsx # Embedded YouTube video player
│   │   └── MusicPlayerButtons.tsx # Music player controls (when video hidden)
│   └── assets/               # Static assets
├── convex/
│   ├── schema.ts             # Database schema definition
│   ├── rooms.ts              # Room queries and mutations
│   ├── users.ts              # User queries and mutations
│   ├── catalog.ts            # Catalog queries and seeding
│   ├── auth.config.ts        # Auth provider configuration
│   └── _generated/           # Auto-generated Convex types
├── public/                   # Public static files
├── package.json              # Dependencies
├── vite.config.ts            # Vite configuration
└── tsconfig.*.json           # TypeScript configurations
```

## Data Model

### Database Schema

#### users

```typescript
{
  externalId: string,          // Clerk user ID
  username: string,
  displayName?: string,
  avatarConfig?: any,          // Future avatar customization
  currency: number             // In-app currency (not yet used)
}
```

- Index: `by_externalId`

#### rooms

```typescript
{
  userId: Id<"users">,
  name: string,
  backgroundTheme: string,     // "default" | "dark"
  items: RoomItem[]            // Array of positioned items
}
```

- Index: `by_user`
- **Note:** Each user has exactly one room

#### catalogItems

```typescript
{
  name: string,                // Display name
  category: string,            // "furniture" | "decor"
  basePrice: number,           // Currently all free (0)
  assetUrl: string,            // Image URL
  defaultWidth: number,
  defaultHeight: number
}
```

### Frontend Types

#### RoomItem

```typescript
{
  id: string,                  // UUID generated client-side
  catalogItemId: string,       // References catalog item name
  x: number,                   // Canvas X position
  y: number,                   // Canvas Y position
  scaleX: number,              // Horizontal scale
  scaleY: number,              // Vertical scale
  rotation: number,            // Rotation in degrees
  zIndex: number,              // Layer order (uses timestamp)
  url?: string,                // Optional link URL
  variant?: string             // Future: item variants
}
```

## Key Components

### RoomPage.tsx

**Purpose:** Main orchestrator component for the room experience

**State:**

- `mode`: "view" | "edit" - Controls UI and interactions
- `localItems`: RoomItem[] - Client-side item state (synced to backend on save)
- `selectedId`: string | null - Currently selected item ID
- `showOnboarding`: boolean - Welcome modal visibility

**Layout:**

- Fixed-size room container (1920×1080) scaled to fit viewport using CSS transforms
- Background layer (z-0) with background image
- Items layer (z-10) with positioned items
- Inline music players (z-11)
- UI overlay layer (z-50+) with:
  - Top right: Mode toggle (lock/unlock)
  - Right side: Asset drawer (edit mode only)
  - Bottom right: Trash can (edit mode only)
  - Modals: Computer screen, music player configuration

**Key Behaviors:**

- Auto-creates room if user doesn't have one
- Syncs server room data to `localItems` on load
- Auto-saves `localItems` to backend in edit mode (debounced)
- Calculates scale factor based on window size to maintain aspect ratio
- Items positioned using absolute positioning in room coordinate space
- Mouse events converted between screen and room coordinates using scale factor

### ItemNode.tsx

**Purpose:** Individual item renderer with drag support

**Features:**

- Displays catalog item images from `assetUrl`
- **Edit mode:** Draggable, selectable (shows blue border when selected)
- **View mode:** Clickable to open URL in new tab (if URL exists)
- Special handling for "computer" and "vinyl player" items
- Uses absolute positioning with CSS transforms
- Mouse drag events converted from screen to room coordinates using scale

### AssetDrawer.tsx

**Purpose:** Side drawer for browsing and adding catalog items

**Features:**

- Fetches catalog items from backend
- Displays items as draggable thumbnails
- Drag items onto room canvas to add them
- Shows "Seed Catalog" button if empty
- Slides in from right side in edit mode

### TrashCan.tsx

**Purpose:** Delete items by dragging them to trash

**Features:**

- Visible in edit mode only
- Positioned at bottom right
- Highlights when item is dragged over it
- Deletes item on drop

### ComputerScreen.tsx

**Purpose:** Modal interface for managing shortcuts

**Features:**

- Opens when clicking computer item in view mode
- Displays and manages user shortcuts
- Allows adding/editing/deleting shortcuts
- Saves shortcuts to room data

### MusicPlayerModal.tsx

**Purpose:** Configuration modal for vinyl player items

**Features:**

- Opens when clicking vinyl player in edit or view mode
- Allows setting YouTube URL for music
- Configures video visibility and position
- Saves music configuration to item data

## Backend Functions

### Queries

#### `api.users.getMe`

Returns current user or null if not authenticated

#### `api.rooms.getMyRoom`

Returns current user's room or null

#### `api.catalog.list`

Returns all catalog items

### Mutations

#### `api.users.ensureUser({ username })`

Creates user if doesn't exist, returns user object

#### `api.rooms.createRoom()`

Creates room for current user (prevents duplicates)

#### `api.rooms.saveMyRoom({ roomId, items })`

Saves item array to room (validates ownership)

#### `api.catalog.seed()`

Seeds initial catalog items (only if empty)

## Authentication Flow

1. App loads → Clerk checks auth state
2. **SignedOut:** Show sign-in button
3. **SignedIn:**
   - Query `getMe`
   - If null, call `ensureUser` to create user
   - Once user exists, render `RoomPage`
   - `RoomPage` queries `getMyRoom`
   - If null, call `createRoom`
   - Room loads → render canvas + items

## Development Workflow

### Running Locally

```bash
# Terminal 1: Start Convex backend
npx convex dev

# Terminal 2: Start Vite dev server
npm run dev
```

**Requires:**

- `.env.local` with:
  - `VITE_CONVEX_URL` - Convex deployment URL
  - `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
  - `CLERK_JWT_ISSUER_DOMAIN` - Clerk JWT issuer (for convex/auth.config.ts)

### Build & Deploy

```bash
# Type-check and build
npm run build

# Preview production build
npm run preview
```

### Linting

```bash
npm run lint
```

## Common Tasks for Agents

### Adding a New Catalog Item

1. **Frontend:** Items are added via backend mutation
2. **Backend:** Modify `convex/catalog.ts` seed function:
   ```typescript
   {
     name: "Chair",
     category: "furniture",
     basePrice: 0,
     assetUrl: "https://example.com/chair.png",
     defaultWidth: 80,
     defaultHeight: 100,
   }
   ```
3. Clear old seed data or add to existing items array

### Modifying Item Appearance

**Current:** Items render images from catalog `assetUrl` (ItemNode.tsx)

**To customize rendering:**

1. Modify `ItemNode.tsx` to change how items are displayed
2. Images are loaded via standard `<img>` tags
3. Fetch `assetUrl` from catalog item by matching `catalogItemId`
4. Apply CSS transforms for rotation/scaling if needed

### Adding New Item Properties

1. Update `convex/schema.ts` room items object
2. Update `src/types.ts` RoomItem interface
3. Update `convex/rooms.ts` saveMyRoom validation
4. Update UI components (SelectedItemPanel, etc.)

### Adding Multi-Room Support

**Current limitation:** One room per user

**To support multiple:**

1. Remove unique constraint on rooms `by_user` index (allow multiple)
2. Add room selection UI
3. Modify `getMyRoom` to accept room ID or list all rooms
4. Add `createRoom({ name })` room naming
5. Update RoomPage to track current room ID

### Customizing Background

**Current:** Background image from `/src/assets/house.png`

**Locations:**

- Background rendered in: `RoomPage.tsx` as CSS background-image
- Theme stored in: `room.backgroundTheme` (currently unused)
- Can extend to support:
  - Multiple background images
  - Patterns/gradients via CSS
  - Theme picker UI in RoomPage

## Known Limitations & Future Features

### Current Limitations

- Single room per user
- No undo/redo
- No multi-select
- No item rotation/scaling UI (only drag positioning)
- No currency/shop implementation
- No multiplayer/sharing

### Planned/Suggested Features (based on codebase)

- Avatar customization (`avatarConfig` field exists but unused)
- In-app currency system (`currency` field exists)
- Item variants (`variant` field exists but unused)
- Item purchase/unlock system
- Room sharing/visiting
- Real images for catalog items
- Background customization UI
- Item deletion button
- Mobile-responsive touch controls

## Code Conventions

### Styling

- Use Tailwind utility classes
- Hand-drawn aesthetic: slight rotations, bold borders, custom shadows
- Font: Patrick Hand for playful feel
- Components should feel "paper-like" with borders and shadows

### State Management

- React hooks for local state
- Convex for server state
- No global state library (keep it simple)

### File Naming

- PascalCase for components: `RoomPage.tsx`
- camelCase for utilities: `convexClient.ts`
- Organize by feature in folders

### Type Safety

- Always define interfaces for props
- Use Convex validators (`v.*`) for backend
- Export shared types from `types.ts`

## Testing

**Current State:** No tests exist

**Recommended:**

- Unit tests for item position calculations
- Integration tests for room save/load
- E2E tests for user flows (add item → position → save → reload)

## Performance Notes

- CSS transforms provide efficient scaling without re-rendering
- Re-renders minimized via React state management
- Room items loaded once, mutated locally until auto-save
- Convex provides optimistic updates by default
- Debounced auto-save (1 second) reduces backend calls

## Troubleshooting

### Items not appearing

- Check if catalog is seeded (click "Seed Catalog" in empty drawer)
- Verify items array is not empty in room
- Check browser console for JavaScript errors
- Verify images load correctly (check network tab)

### Auth not working

- Verify `.env.local` has correct Clerk keys
- Check Clerk dashboard for domain/app configuration
- Ensure `convex/auth.config.ts` has correct JWT issuer

### Canvas issues

- Check window dimensions are valid
- Verify scale calculation is working (check browser dev tools)
- Ensure container has correct width/height (1920×1080)
- Check CSS transform is being applied correctly

## Additional Resources

- [Convex Documentation](https://docs.convex.dev/)
- [Clerk Authentication](https://clerk.com/docs)
- [CSS Transforms](https://developer.mozilla.org/en-US/docs/Web/CSS/transform)

---

**Last Updated:** 2024-11-26
**Maintainer:** Agent-generated documentation
**Project Status:** Active Development
