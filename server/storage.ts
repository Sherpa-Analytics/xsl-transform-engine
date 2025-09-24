import { type File, type InsertFile, type Transformation, type InsertTransformation, type Dependency, type InsertDependency } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // File operations
  createFile(file: InsertFile): Promise<File>;
  getFile(id: string): Promise<File | undefined>;
  getAllFiles(): Promise<File[]>;
  deleteFile(id: string): Promise<boolean>;
  getFilesByType(mimeType: string): Promise<File[]>;
  updateFileValidation(id: string, status: string, error?: string): Promise<File | undefined>;

  // Transformation operations
  createTransformation(transformation: InsertTransformation): Promise<Transformation>;
  getTransformation(id: string): Promise<Transformation | undefined>;
  getAllTransformations(): Promise<Transformation[]>;
  updateTransformation(id: string, updates: Partial<Transformation>): Promise<Transformation | undefined>;
  getActiveTransformations(): Promise<Transformation[]>;

  // Dependency operations
  createDependency(dependency: InsertDependency): Promise<Dependency>;
  getDependenciesByXslFile(xslFileId: string): Promise<Dependency[]>;
  updateDependency(id: string, updates: Partial<Dependency>): Promise<Dependency | undefined>;
}

export class MemStorage implements IStorage {
  private files: Map<string, File>;
  private transformations: Map<string, Transformation>;
  private dependencies: Map<string, Dependency>;

  constructor() {
    this.files = new Map();
    this.transformations = new Map();
    this.dependencies = new Map();
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = randomUUID();
    const file: File = {
      ...insertFile,
      id,
      uploadedAt: new Date(),
      validationStatus: "pending",
      validationError: null,
      validatedAt: null,
    };
    this.files.set(id, file);
    return file;
  }

  async getFile(id: string): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getAllFiles(): Promise<File[]> {
    return Array.from(this.files.values());
  }

  async deleteFile(id: string): Promise<boolean> {
    return this.files.delete(id);
  }

  async getFilesByType(mimeType: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(file => file.mimeType.includes(mimeType));
  }

  async createTransformation(insertTransformation: InsertTransformation): Promise<Transformation> {
    const id = randomUUID();
    const transformation: Transformation = {
      ...insertTransformation,
      id,
      progress: insertTransformation.progress || null,
      statusMessage: insertTransformation.statusMessage || null,
      xsdFileId: insertTransformation.xsdFileId || null,
      resultPath: insertTransformation.resultPath || null,
      errorMessage: insertTransformation.errorMessage || null,
      processingTime: insertTransformation.processingTime || null,
      outputSize: insertTransformation.outputSize || null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.transformations.set(id, transformation);
    return transformation;
  }

  async getTransformation(id: string): Promise<Transformation | undefined> {
    return this.transformations.get(id);
  }

  async getAllTransformations(): Promise<Transformation[]> {
    return Array.from(this.transformations.values());
  }

  async updateTransformation(id: string, updates: Partial<Transformation>): Promise<Transformation | undefined> {
    const transformation = this.transformations.get(id);
    if (!transformation) return undefined;

    const updated = { ...transformation, ...updates };
    if (updates.status === 'completed' || updates.status === 'failed') {
      updated.completedAt = new Date();
    }
    
    this.transformations.set(id, updated);
    return updated;
  }

  async getActiveTransformations(): Promise<Transformation[]> {
    return Array.from(this.transformations.values()).filter(
      t => t.status === 'queued' || t.status === 'processing'
    );
  }

  async createDependency(insertDependency: InsertDependency): Promise<Dependency> {
    const id = randomUUID();
    const dependency: Dependency = {
      ...insertDependency,
      id,
      resolvedFileId: insertDependency.resolvedFileId || null,
    };
    this.dependencies.set(id, dependency);
    return dependency;
  }

  async getDependenciesByXslFile(xslFileId: string): Promise<Dependency[]> {
    return Array.from(this.dependencies.values()).filter(dep => dep.xslFileId === xslFileId);
  }

  async updateDependency(id: string, updates: Partial<Dependency>): Promise<Dependency | undefined> {
    const dependency = this.dependencies.get(id);
    if (!dependency) return undefined;

    const updated = { ...dependency, ...updates };
    this.dependencies.set(id, updated);
    return updated;
  }

  async updateFileValidation(id: string, status: string, error?: string): Promise<File | undefined> {
    const file = this.files.get(id);
    if (!file) return undefined;

    const updated = {
      ...file,
      validationStatus: status,
      validationError: error || null,
      validatedAt: new Date(),
    };
    this.files.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
