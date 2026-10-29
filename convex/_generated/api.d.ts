/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as commissions from "../commissions.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as demo from "../demo.js";
import type * as hrm from "../hrm.js";
import type * as hubs from "../hubs.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_parcel from "../lib/parcel.js";
import type * as live from "../live.js";
import type * as mailer from "../mailer.js";
import type * as merchantProfile from "../merchantProfile.js";
import type * as migrations from "../migrations.js";
import type * as money from "../money.js";
import type * as parcels from "../parcels.js";
import type * as rider from "../rider.js";
import type * as riderApplications from "../riderApplications.js";
import type * as riderProfiles from "../riderProfiles.js";
import type * as settings from "../settings.js";
import type * as support from "../support.js";
import type * as track from "../track.js";
import type * as users from "../users.js";
import type * as verification from "../verification.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  auth: typeof auth;
  chat: typeof chat;
  commissions: typeof commissions;
  crons: typeof crons;
  dashboard: typeof dashboard;
  demo: typeof demo;
  hrm: typeof hrm;
  hubs: typeof hubs;
  "lib/auth": typeof lib_auth;
  "lib/email": typeof lib_email;
  "lib/parcel": typeof lib_parcel;
  live: typeof live;
  mailer: typeof mailer;
  merchantProfile: typeof merchantProfile;
  migrations: typeof migrations;
  money: typeof money;
  parcels: typeof parcels;
  rider: typeof rider;
  riderApplications: typeof riderApplications;
  riderProfiles: typeof riderProfiles;
  settings: typeof settings;
  support: typeof support;
  track: typeof track;
  users: typeof users;
  verification: typeof verification;
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

export declare const components: {};
