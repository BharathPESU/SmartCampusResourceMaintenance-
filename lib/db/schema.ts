import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  numeric,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 1. BUILDINGS
export const buildings = pgTable('buildings', {
  buildingId: uuid('building_id').defaultRandom().primaryKey(),
  buildingName: varchar('building_name', { length: 100 }).notNull().unique(),
  location: varchar('location', { length: 255 }).notNull(),
  totalFloors: integer('total_floors').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. ROOMS
export const rooms = pgTable('rooms', {
  roomId: uuid('room_id').defaultRandom().primaryKey(),
  buildingId: uuid('building_id')
    .notNull()
    .references(() => buildings.buildingId, { onDelete: 'restrict' }),
  roomNumber: varchar('room_number', { length: 50 }).notNull(),
  floorNo: integer('floor_no').notNull(),
  roomType: varchar('room_type', { length: 50 }).notNull(), // 'LECTURE_HALL', 'COMPUTER_LAB', 'SEMINAR_ROOM', etc.
  capacity: integer('capacity').notNull(),
  status: varchar('status', { length: 30 }).default('AVAILABLE').notNull(), // 'AVAILABLE', 'MAINTENANCE', 'RESERVED'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. ASSETS
export const assets = pgTable('assets', {
  assetId: uuid('asset_id').defaultRandom().primaryKey(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.roomId, { onDelete: 'restrict' }),
  assetName: varchar('asset_name', { length: 150 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(), // 'AV_EQUIPMENT', 'HVAC', 'FURNITURE', 'ELECTRICAL', 'IT_NETWORK', 'PLUMBING'
  status: varchar('status', { length: 30 }).default('OPERATIONAL').notNull(), // 'OPERATIONAL', 'MAINTENANCE_REQUIRED', 'RETIRED'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. FACILITIES
export const facilities = pgTable('facilities', {
  facilityId: uuid('facility_id').defaultRandom().primaryKey(),
  buildingId: uuid('building_id')
    .notNull()
    .references(() => buildings.buildingId, { onDelete: 'cascade' }),
  facilityName: varchar('facility_name', { length: 100 }).notNull(),
  operatingHours: varchar('operating_hours', { length: 100 }).notNull(),
  status: varchar('status', { length: 30 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 5. USER PROFILES
export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  middleName: varchar('middle_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  department: varchar('department', { length: 100 }).default('General Campus').notNull(),
  accountStatus: varchar('account_status', { length: 30 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 6. ROLES
export const roles = pgTable('roles', {
  roleId: varchar('role_id', { length: 50 }).primaryKey(), // 'CAMPUS_USER', 'MAINTENANCE_STAFF', 'ADMIN'
  description: varchar('description', { length: 255 }).notNull(),
});

// 7. USER ROLES
export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id')
    .notNull()
    .references(() => userProfiles.userId, { onDelete: 'cascade' }),
  roleId: varchar('role_id', { length: 50 })
    .notNull()
    .references(() => roles.roleId, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
});

// 8. STAFF PROFILES
export const staffProfiles = pgTable('staff_profiles', {
  staffId: uuid('staff_id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => userProfiles.userId, { onDelete: 'cascade' }),
  facilityId: uuid('facility_id').references(() => facilities.facilityId, { onDelete: 'set null' }),
  supervisorStaffId: uuid('supervisor_staff_id'),
  designation: varchar('designation', { length: 100 }).notNull(),
  salary: numeric('salary', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 9. FACILITY USAGE
export const facilityUsage = pgTable('facility_usage', {
  usageId: uuid('usage_id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => userProfiles.userId, { onDelete: 'cascade' }),
  facilityId: uuid('facility_id')
    .notNull()
    .references(() => facilities.facilityId, { onDelete: 'cascade' }),
  usedAt: timestamp('used_at', { withTimezone: true }).defaultNow().notNull(),
  purpose: varchar('purpose', { length: 255 }),
});

// 10. BOOKINGS
export const bookings = pgTable('bookings', {
  bookingId: uuid('booking_id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => userProfiles.userId, { onDelete: 'cascade' }),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.roomId, { onDelete: 'restrict' }),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  purpose: varchar('purpose', { length: 255 }).notNull(),
  status: varchar('status', { length: 30 }).default('CONFIRMED').notNull(), // 'PENDING', 'CONFIRMED', 'CANCELLED'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
});

// 11. CONFIRMATIONS
export const confirmations = pgTable('confirmations', {
  confirmationId: uuid('confirmation_id').defaultRandom().primaryKey(),
  bookingId: uuid('booking_id')
    .notNull()
    .unique()
    .references(() => bookings.bookingId, { onDelete: 'cascade' }),
  issueDate: timestamp('issue_date', { withTimezone: true }).defaultNow().notNull(),
  confirmationCode: varchar('confirmation_code', { length: 64 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 12. COMPLAINTS
export const complaints = pgTable('complaints', {
  complaintId: uuid('complaint_id').defaultRandom().primaryKey(),
  raisedByUserId: uuid('raised_by_user_id')
    .notNull()
    .references(() => userProfiles.userId, { onDelete: 'restrict' }),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => assets.assetId, { onDelete: 'restrict' }),
  description: text('description').notNull(),
  priority: varchar('priority', { length: 20 }).default('MEDIUM').notNull(), // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  status: varchar('status', { length: 30 }).default('OPEN').notNull(), // 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'
  assignedStaffId: uuid('assigned_staff_id').references(() => staffProfiles.staffId, { onDelete: 'set null' }),
  dateRaised: timestamp('date_raised', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolutionNotes: text('resolution_notes'),
});

// 13. COMPLAINT AUDIT LOG
export const complaintAuditLog = pgTable('complaint_audit_log', {
  auditId: uuid('audit_id').defaultRandom().primaryKey(),
  complaintId: uuid('complaint_id')
    .notNull()
    .references(() => complaints.complaintId, { onDelete: 'cascade' }),
  oldStatus: varchar('old_status', { length: 30 }),
  newStatus: varchar('new_status', { length: 30 }).notNull(),
  changedByUserId: uuid('changed_by_user_id').references(() => userProfiles.userId, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 14. OUTBOX EVENTS
export const outboxEvents = pgTable('outbox_events', {
  eventId: uuid('event_id').defaultRandom().primaryKey(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  aggregateType: varchar('aggregate_type', { length: 100 }).notNull(),
  aggregateId: varchar('aggregate_id', { length: 100 }).notNull(),
  payload: text('payload').notNull(), // JSON string
  status: varchar('status', { length: 30 }).default('PENDING').notNull(), // 'PENDING', 'PROCESSED', 'FAILED'
  attempts: integer('attempts').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  lastError: text('last_error'),
});

// 15. COMPLAINT EMBEDDINGS
export const complaintEmbeddings = pgTable('complaint_embeddings', {
  embeddingId: uuid('embedding_id').defaultRandom().primaryKey(),
  complaintId: uuid('complaint_id')
    .notNull()
    .unique()
    .references(() => complaints.complaintId, { onDelete: 'cascade' }),
  embeddingVector: text('embedding_vector').notNull(), // JSON serialized vector array
  embeddingModel: varchar('embedding_model', { length: 100 }).default('text-embedding-004').notNull(),
  contentHash: varchar('content_hash', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
