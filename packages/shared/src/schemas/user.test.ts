import { describe, it, expect } from 'vitest'
import {
  UserSchema,
  CreateUserSchema,
  CreateFolderSchema,
  RenameFolderSchema,
  DeleteFolderSchema,
  ArchiveSessionSchema,
  UnarchiveSessionSchema,
} from './user'

describe('UserSchema', () => {
  it('validates correct user data', () => {
    const result = UserSchema.safeParse({
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing id', () => {
    const result = UserSchema.safeParse({
      email: 'test@example.com',
      name: 'Test User',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = UserSchema.safeParse({
      id: '123',
      email: 'invalid-email',
      name: 'Test User',
    })
    expect(result.success).toBe(false)
  })

  it('allows optional name', () => {
    const result = UserSchema.safeParse({
      id: '123',
      email: 'test@example.com',
    })
    expect(result.success).toBe(true)
  })
})

describe('CreateUserSchema', () => {
  it('validates user creation input', () => {
    const result = CreateUserSchema.safeParse({
      email: 'new@example.com',
      name: 'New User',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email on creation', () => {
    const result = CreateUserSchema.safeParse({
      email: 'bad-email',
      name: 'New User',
    })
    expect(result.success).toBe(false)
  })

  it('requires email', () => {
    const result = CreateUserSchema.safeParse({
      name: 'New User',
    })
    expect(result.success).toBe(false)
  })
})

// ── CreateFolderSchema ────────────────────────────────────────────────
describe('CreateFolderSchema', () => {
  it('validates a valid folder name', () => {
    const result = CreateFolderSchema.safeParse({ name: 'My Folder' })
    expect(result.success).toBe(true)
  })

  it('rejects empty folder name', () => {
    const result = CreateFolderSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects folder name longer than 50 characters', () => {
    const result = CreateFolderSchema.safeParse({ name: 'a'.repeat(51) })
    expect(result.success).toBe(false)
  })

  it('trims whitespace from folder name', () => {
    const result = CreateFolderSchema.safeParse({ name: '  Trimmed  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Trimmed')
    }
  })
})

// ── RenameFolderSchema ────────────────────────────────────────────────
describe('RenameFolderSchema', () => {
  it('validates with folderId and name', () => {
    const result = RenameFolderSchema.safeParse({ folderId: 'folder-1', name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('rejects empty folderId', () => {
    const result = RenameFolderSchema.safeParse({ folderId: '', name: 'Name' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = RenameFolderSchema.safeParse({ folderId: 'folder-1', name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 50 characters', () => {
    const result = RenameFolderSchema.safeParse({ folderId: 'folder-1', name: 'a'.repeat(51) })
    expect(result.success).toBe(false)
  })
})

// ── DeleteFolderSchema ────────────────────────────────────────────────
describe('DeleteFolderSchema', () => {
  it('validates with a non-empty folderId', () => {
    const result = DeleteFolderSchema.safeParse({ folderId: 'folder-1' })
    expect(result.success).toBe(true)
  })

  it('rejects empty folderId', () => {
    const result = DeleteFolderSchema.safeParse({ folderId: '' })
    expect(result.success).toBe(false)
  })
})

// ── ArchiveSessionSchema ──────────────────────────────────────────────
describe('ArchiveSessionSchema', () => {
  it('validates with sessionId and folderId', () => {
    const result = ArchiveSessionSchema.safeParse({
      sessionId: 'session-1',
      folderId: 'folder-1',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty sessionId', () => {
    const result = ArchiveSessionSchema.safeParse({ sessionId: '', folderId: 'folder-1' })
    expect(result.success).toBe(false)
  })

  it('rejects empty folderId', () => {
    const result = ArchiveSessionSchema.safeParse({ sessionId: 'session-1', folderId: '' })
    expect(result.success).toBe(false)
  })
})

// ── UnarchiveSessionSchema ────────────────────────────────────────────
describe('UnarchiveSessionSchema', () => {
  it('validates with a non-empty sessionId', () => {
    const result = UnarchiveSessionSchema.safeParse({ sessionId: 'session-1' })
    expect(result.success).toBe(true)
  })

  it('rejects empty sessionId', () => {
    const result = UnarchiveSessionSchema.safeParse({ sessionId: '' })
    expect(result.success).toBe(false)
  })
})
