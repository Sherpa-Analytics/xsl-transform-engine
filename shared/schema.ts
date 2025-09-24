import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: varchar("size").notNull(),
  path: text("path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  validationStatus: text("validation_status").default("pending"), // 'pending', 'valid', 'invalid'
  validationError: text("validation_error"),
  validatedAt: timestamp("validated_at"),
});

export const transformations = pgTable("transformations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  xmlFileId: varchar("xml_file_id").notNull(),
  xslFileId: varchar("xsl_file_id").notNull(),
  xsdFileId: varchar("xsd_file_id"),
  status: text("status").notNull(), // 'queued', 'processing', 'completed', 'failed'
  progress: varchar("progress").default("0"),
  statusMessage: text("status_message"),
  resultPath: text("result_path"),
  errorMessage: text("error_message"),
  processingTime: varchar("processing_time"),
  outputSize: varchar("output_size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const dependencies = pgTable("dependencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  xslFileId: varchar("xsl_file_id").notNull(),
  dependencyPath: text("dependency_path").notNull(),
  resolvedFileId: varchar("resolved_file_id"),
  status: text("status").notNull(), // 'pending', 'resolved', 'missing'
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  uploadedAt: true,
  validationStatus: true,
  validationError: true,
  validatedAt: true,
});

export const insertTransformationSchema = createInsertSchema(transformations).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertDependencySchema = createInsertSchema(dependencies).omit({
  id: true,
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;
export type InsertTransformation = z.infer<typeof insertTransformationSchema>;
export type Transformation = typeof transformations.$inferSelect;
export type InsertDependency = z.infer<typeof insertDependencySchema>;
export type Dependency = typeof dependencies.$inferSelect;
