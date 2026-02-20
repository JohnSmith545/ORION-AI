import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('renders the auth page by default', () => {
    render(<App />)
    expect(screen.getByText('ORION')).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
    expect(screen.getByText('Astronomical Intelligence')).toBeInTheDocument()
  })

  it('renders login form by default', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /initialize session/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /establish connection/i })).not.toBeInTheDocument()
  })

  it('toggles to signup form when clicking "Sign Up" in footer', () => {
    render(<App />)
    // Only one "Sign Up" button now (the footer link)
    const signupButton = screen.getByRole('button', { name: /sign up/i })
    fireEvent.click(signupButton)

    expect(screen.getByRole('button', { name: /establish connection/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /initialize session/i })).not.toBeInTheDocument()
  })

  it('toggles back to login form from signup', () => {
    render(<App />)
    // Navigate to signup first
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    // Now in signup form. Only one "Log In" button (the footer link)
    const loginButton = screen.getByRole('button', { name: /log in/i })
    fireEvent.click(loginButton)

    expect(screen.getByRole('button', { name: /initialize session/i })).toBeInTheDocument()
  })
})
