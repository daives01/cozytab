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
- **React Konva 19.2.0** - Canvas rendering library (wraps Konva.js)
- **React Router DOM 7.9.6** - Client-side routing
- **@clerk/clerk-react 5.57.0** - Authentication
- **Tailwind CSS** (via utility classes) - Styling

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
│   │   ├── RoomPage.tsx      # Main room page with mode switching
│   │   ├── RoomCanvas.tsx    # Konva canvas with items and grid
│   │   ├── ItemNode.tsx      # Individual item renderer
│   │   ├── ItemPalette.tsx   # Bottom palette for adding items
│   │   ├── SelectedItemPanel.tsx  # Side panel for editing selected item
│   │   ├── OnboardingModal.tsx    # Welcome modal
│   │   └── AvatarCursor.tsx  # Custom cursor visualization
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

- Background canvas layer (z-0)
- HUD overlay layer (z-50) with:
  - Top bar: Logo, mode toggle, save button
  - Bottom palette: Item catalog (edit mode only)
  - Side panel: Selected item editor (edit mode only)
  - Onboarding modal

**Key Behaviors:**

- Auto-creates room if user doesn't have one
- Syncs server room data to `localItems` on load
- Saves `localItems` to backend when user clicks "Save"
- Items spawn at random offset from screen center

### RoomCanvas.tsx

**Purpose:** Konva Stage/Layer wrapper for rendering room

**Features:**

- Responsive canvas (window dimensions)
- Background theme support
- Edit mode: Shows dashed grid (50px spacing)
- Click on empty area deselects items
- Renders all items via `ItemNode` components
- Custom avatar cursor overlay

### ItemNode.tsx

**Purpose:** Individual item renderer with transform controls

**Features:**

- Displays as colored rectangle with text label (placeholder for images)
- **Edit mode:** Draggable, selectable, transformable (resize/rotate)
- **View mode:** Clickable to open URL in new tab (if URL exists)
- Uses Konva Transformer for visual resizing/rotation
- Color: Blue if has URL, gray otherwise
- Min scale: 0.1x to prevent invisible items

### ItemPalette.tsx

**Purpose:** Catalog item browser for adding items

**Features:**

- Fetches catalog items from backend
- Displays items as thumbnail buttons
- Click to add item to room (spawns at center with random offset)
- Shows "Seed Catalog" button if empty
- Hand-drawn card design with overflow scroll

### SelectedItemPanel.tsx

**Purpose:** Edit panel for selected item

**Features:**

- Shows item name and ID
- URL input field with live preview link
- Read-only position/transform display
- Hand-drawn panel design (rotated, custom shadow)

### OnboardingModal.tsx

**Purpose:** First-time user tutorial

**Content:**

1. Enter edit mode
2. Add items from palette
3. Select items to customize and add links

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

**Current:** Items render as colored rectangles with text (ItemNode.tsx)

**To add images:**

1. Use Konva `Image` component instead of `Rect`
2. Load image with `useImage` hook from react-konva
3. Fetch `assetUrl` from catalog item by matching `catalogItemId`

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

**Current:** Simple color toggle (default/dark)

**Locations:**

- Theme stored in: `room.backgroundTheme`
- Rendered in: `RoomCanvas.tsx` Rect fill color
- Can extend to support:
  - Image backgrounds (use Konva Image)
  - Patterns/gradients
  - Theme picker UI in RoomPage

## Known Limitations & Future Features

### Current Limitations

- Items render as placeholder rectangles (no actual images displayed)
- Single room per user
- No item deletion UI (must edit in dev tools)
- No undo/redo
- No multi-select
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

- Konva canvas handles rendering efficiently
- Re-renders minimized via React.memo potential
- Room items loaded once, mutated locally until save
- Convex provides optimistic updates by default

## Troubleshooting

### Items not appearing

- Check if catalog is seeded (click "Seed Catalog" in empty palette)
- Verify items array is not empty in room
- Check browser console for Konva errors

### Auth not working

- Verify `.env.local` has correct Clerk keys
- Check Clerk dashboard for domain/app configuration
- Ensure `convex/auth.config.ts` has correct JWT issuer

### Canvas issues

- Konva requires specific React version compatibility
- Check window dimensions are valid
- Verify Stage has width/height props

## Additional Resources

- [Convex Documentation](https://docs.convex.dev/)
- [Clerk Authentication](https://clerk.com/docs)
- [Konva Documentation](https://konvajs.org/)
- [React Konva](https://konvajs.org/docs/react/)

---

**Last Updated:** 2024-11-26
**Maintainer:** Agent-generated documentation
**Project Status:** Active Development
