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
    // There are two "Sign Up" buttons: one in LoginForm, one in Footer.
    // LoginForm renders first (as children of AuthLayout), then Footer.
    const signupButtons = screen.getAllByRole('button', { name: /sign up/i })
    const footerSignup = signupButtons[signupButtons.length - 1] // Footer is last

    fireEvent.click(footerSignup)

    expect(screen.getByRole('button', { name: /establish connection/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /initialize session/i })).not.toBeInTheDocument()
  })

  it('toggles to signup form when clicking "Sign Up" in login form', () => {
    render(<App />)
    const signupButtons = screen.getAllByRole('button', { name: /sign up/i })
    const formSignup = signupButtons[0] // Form is first

    fireEvent.click(formSignup)

    expect(screen.getByRole('button', { name: /establish connection/i })).toBeInTheDocument()
  })

  it('toggles back to login form from signup', () => {
    render(<App />)
    // Navigate to signup first
    const signupButtons = screen.getAllByRole('button', { name: /sign up/i })
    fireEvent.click(signupButtons[0])

    // Now in signup form. There are likely two "Log In" buttons (form and footer).
    // Let's use flexible regex to find them.
    const loginButtons = screen.getAllByRole('button', { name: /log in/i })
    const footerLogin = loginButtons[loginButtons.length - 1] // Footer is last

    fireEvent.click(footerLogin)

    expect(screen.getByRole('button', { name: /initialize session/i })).toBeInTheDocument()
  })
})
