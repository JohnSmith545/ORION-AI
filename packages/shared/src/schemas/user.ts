import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['admin', 'user']).optional(),
})

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
})

export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof CreateUserSchema>

// ── Archive Folder Schemas ────────────────────────────────────────────

export const CreateFolderSchema = z.object({
  name: z.string().min(1).max(50).trim(),
})

export const RenameFolderSchema = z.object({
  folderId: z.string().min(1),
  name: z.string().min(1).max(50).trim(),
})

export const DeleteFolderSchema = z.object({
  folderId: z.string().min(1),
})

export const ArchiveSessionSchema = z.object({
  sessionId: z.string().min(1),
  folderId: z.string().min(1),
})

export const UnarchiveSessionSchema = z.object({
  sessionId: z.string().min(1),
})

export type CreateFolder = z.infer<typeof CreateFolderSchema>
export type RenameFolder = z.infer<typeof RenameFolderSchema>
export type DeleteFolder = z.infer<typeof DeleteFolderSchema>
export type ArchiveSession = z.infer<typeof ArchiveSessionSchema>
export type UnarchiveSession = z.infer<typeof UnarchiveSessionSchema>
