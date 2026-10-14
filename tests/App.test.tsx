import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('App', () => {
    it('muestra el encabezado inicial', () => {
        render(<App />)

        expect(
            screen.getByRole('heading', { name: 'Get started' }),
        ).toBeInTheDocument()
    })

    it('incrementa el contador al pulsar el botón', () => {
        render(<App />)

        fireEvent.click(screen.getByRole('button', { name: 'Count is 0' }))

        expect(
            screen.getByRole('button', { name: 'Count is 1' }),
        ).toBeInTheDocument()
    })
})
