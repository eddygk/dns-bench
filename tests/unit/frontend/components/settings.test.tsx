import '@testing-library/jest-dom'
import * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Simplified Settings component for testing
const Settings: React.FC = () => {
  const [localDNS, setLocalDNS] = React.useState({
    primary: '10.10.20.30',
    secondary: '10.10.20.31'
  })

  const [publicDNS, setPublicDNS] = React.useState([
    { id: 'cloudflare', name: 'Cloudflare', ip: '1.1.1.1', enabled: true },
    { id: 'google', name: 'Google', ip: '8.8.8.8', enabled: true },
    { id: 'quad9', name: 'Quad9', ip: '9.9.9.9', enabled: false }
  ])

  const handleSaveLocal = () => {
    // Mock save functionality
    console.log('Saving local DNS:', localDNS)
  }

  const togglePublicDNS = (id: string) => {
    setPublicDNS(servers =>
      servers.map(server =>
        server.id === id ? { ...server, enabled: !server.enabled } : server
      )
    )
  }

  return (
    <div>
      <h1>DNS Settings</h1>

      <section data-testid="local-dns-section">
        <h2>Local DNS Servers</h2>
        <div>
          <label htmlFor="primary-dns">Primary DNS</label>
          <input
            id="primary-dns"
            data-testid="primary-dns-input"
            value={localDNS.primary}
            onChange={(e) => setLocalDNS(prev => ({ ...prev, primary: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="secondary-dns">Secondary DNS</label>
          <input
            id="secondary-dns"
            data-testid="secondary-dns-input"
            value={localDNS.secondary}
            onChange={(e) => setLocalDNS(prev => ({ ...prev, secondary: e.target.value }))}
          />
        </div>
        <button data-testid="save-local-dns" onClick={handleSaveLocal}>
          Save Local DNS
        </button>
      </section>

      <section data-testid="public-dns-section">
        <h2>Public DNS Servers</h2>
        {publicDNS.map(server => (
          <div key={server.id} data-testid={`public-server-${server.id}`}>
            <span>{server.name}</span>
            <span>{server.ip}</span>
            <button
              data-testid={`toggle-${server.id}`}
              onClick={() => togglePublicDNS(server.id)}
            >
              {server.enabled ? 'Disable' : 'Enable'}
            </button>
            <span data-testid={`status-${server.id}`}>
              {server.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        ))}
      </section>

      <section data-testid="cors-section">
        <h2>CORS Settings</h2>
        <div>
          <label>
            <input type="checkbox" data-testid="allow-ip-access" defaultChecked />
            Allow IP Access
          </label>
        </div>
        <div>
          <label>
            <input type="checkbox" data-testid="allow-hostname-access" defaultChecked />
            Allow Hostname Access
          </label>
        </div>
      </section>
    </div>
  )
}

describe('Settings Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render without crashing', () => {
    render(<Settings />)
    expect(screen.getByText('DNS Settings')).toBeInTheDocument()
  })

  it('should display local DNS configuration section', () => {
    render(<Settings />)

    expect(screen.getByText('Local DNS Servers')).toBeInTheDocument()
    expect(screen.getByLabelText('Primary DNS')).toBeInTheDocument()
    expect(screen.getByLabelText('Secondary DNS')).toBeInTheDocument()
  })

  it('should have pre-filled local DNS values', () => {
    render(<Settings />)

    const primaryInput = screen.getByTestId('primary-dns-input') as HTMLInputElement
    const secondaryInput = screen.getByTestId('secondary-dns-input') as HTMLInputElement

    expect(primaryInput.value).toBe('10.10.20.30')
    expect(secondaryInput.value).toBe('10.10.20.31')
  })

  it('should update local DNS input values', () => {
    render(<Settings />)

    const primaryInput = screen.getByTestId('primary-dns-input')

    fireEvent.change(primaryInput, { target: { value: '192.168.1.1' } })

    expect((primaryInput as HTMLInputElement).value).toBe('192.168.1.1')
  })

  it('should display public DNS servers', () => {
    render(<Settings />)

    expect(screen.getByText('Public DNS Servers')).toBeInTheDocument()
    expect(screen.getByText('Cloudflare')).toBeInTheDocument()
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('Quad9')).toBeInTheDocument()
  })

  it('should show correct enabled/disabled status for public DNS', () => {
    render(<Settings />)

    expect(screen.getByTestId('status-cloudflare')).toHaveTextContent('Enabled')
    expect(screen.getByTestId('status-google')).toHaveTextContent('Enabled')
    expect(screen.getByTestId('status-quad9')).toHaveTextContent('Disabled')
  })

  it('should toggle public DNS server status', () => {
    render(<Settings />)

    const quad9ToggleButton = screen.getByTestId('toggle-quad9')
    const quad9Status = screen.getByTestId('status-quad9')

    expect(quad9Status).toHaveTextContent('Disabled')
    expect(quad9ToggleButton).toHaveTextContent('Enable')

    fireEvent.click(quad9ToggleButton)

    expect(quad9Status).toHaveTextContent('Enabled')
    expect(quad9ToggleButton).toHaveTextContent('Disable')
  })

  it('should have save local DNS button', () => {
    render(<Settings />)

    const saveButton = screen.getByTestId('save-local-dns')
    expect(saveButton).toBeInTheDocument()
    expect(saveButton).toHaveTextContent('Save Local DNS')
  })

  it('should display CORS settings section', () => {
    render(<Settings />)

    expect(screen.getByText('CORS Settings')).toBeInTheDocument()
    expect(screen.getByLabelText('Allow IP Access')).toBeInTheDocument()
    expect(screen.getByLabelText('Allow Hostname Access')).toBeInTheDocument()
  })

  it('should have CORS checkboxes checked by default', () => {
    render(<Settings />)

    const ipAccessCheckbox = screen.getByTestId('allow-ip-access') as HTMLInputElement
    const hostnameAccessCheckbox = screen.getByTestId('allow-hostname-access') as HTMLInputElement

    expect(ipAccessCheckbox.checked).toBe(true)
    expect(hostnameAccessCheckbox.checked).toBe(true)
  })

  it('should render all required sections', () => {
    render(<Settings />)

    expect(screen.getByTestId('local-dns-section')).toBeInTheDocument()
    expect(screen.getByTestId('public-dns-section')).toBeInTheDocument()
    expect(screen.getByTestId('cors-section')).toBeInTheDocument()
  })
})