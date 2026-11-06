/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as catalog from "../catalog.js";
import type * as friends from "../friends.js";
import type * as games from "../games.js";
import type * as guestConversion from "../guestConversion.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as invites from "../invites.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_categories from "../lib/categories.js";
import type * as lib_coinPackConfig from "../lib/coinPackConfig.js";
import type * as lib_currency from "../lib/currency.js";
import type * as lib_guestImport from "../lib/guestImport.js";
import type * as lib_id from "../lib/id.js";
import type * as lib_inviteLifecycle from "../lib/inviteLifecycle.js";
import type * as lib_price from "../lib/price.js";
import type * as lib_roomAccess from "../lib/roomAccess.js";
import type * as lib_time from "../lib/time.js";
import type * as lib_userSettings from "../lib/userSettings.js";
import type * as roomTemplates from "../roomTemplates.js";
import type * as rooms from "../rooms.js";
import type * as stripe from "../stripe.js";
import type * as users from "../users.js";
import type * as validators_room from "../validators/room.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  catalog: typeof catalog;
  friends: typeof friends;
  games: typeof games;
  guestConversion: typeof guestConversion;
  http: typeof http;
  inventory: typeof inventory;
  invites: typeof invites;
  "lib/auth": typeof lib_auth;
  "lib/categories": typeof lib_categories;
  "lib/coinPackConfig": typeof lib_coinPackConfig;
  "lib/currency": typeof lib_currency;
  "lib/guestImport": typeof lib_guestImport;
  "lib/id": typeof lib_id;
  "lib/inviteLifecycle": typeof lib_inviteLifecycle;
  "lib/price": typeof lib_price;
  "lib/roomAccess": typeof lib_roomAccess;
  "lib/time": typeof lib_time;
  "lib/userSettings": typeof lib_userSettings;
  roomTemplates: typeof roomTemplates;
  rooms: typeof rooms;
  stripe: typeof stripe;
  users: typeof users;
  "validators/room": typeof validators_room;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  stripe: import("@convex-dev/stripe/_generated/component.js").ComponentApi<"stripe">;
};
