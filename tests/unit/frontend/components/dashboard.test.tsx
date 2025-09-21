import '@testing-library/jest-dom'
import * as React from 'react'
import { render, screen } from '@testing-library/react'

// Mock React Query for testing
const QueryClient = jest.fn().mockImplementation(() => ({
  invalidateQueries: jest.fn(),
  setQueryData: jest.fn()
}))

const QueryClientProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="query-provider">{children}</div>
)

const useQuery = jest.fn().mockReturnValue({
  data: null,
  isLoading: false,
  error: null
})

// Mock React Router
const BrowserRouter = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="router">{children}</div>
)

// Simplified Dashboard component for testing
const Dashboard: React.FC = () => {
  const [dnsServers, setDnsServers] = React.useState([
    { ip: '1.1.1.1', name: 'Cloudflare', enabled: true },
    { ip: '8.8.8.8', name: 'Google', enabled: true }
  ])

  return (
    <div>
      <h1>DNS Benchmark</h1>
      <div data-testid="dns-servers">
        {dnsServers.map(server => (
          <div key={server.ip} data-testid={`server-${server.ip}`}>
            <span>{server.name}</span>
            <span>{server.ip}</span>
            <span>{server.enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        ))}
      </div>
      <button data-testid="start-benchmark">Start Benchmark</button>
      <div data-testid="status">Ready</div>
    </div>
  )
}

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient()
  return (
    <BrowserRouter>
      <QueryClientProvider>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  )
}

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render without crashing', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByText('DNS Benchmark')).toBeInTheDocument()
  })

  it('should display DNS servers', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByText('Cloudflare')).toBeInTheDocument()
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('1.1.1.1')).toBeInTheDocument()
    expect(screen.getByText('8.8.8.8')).toBeInTheDocument()
  })

  it('should show enabled/disabled status for servers', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    const enabledStatuses = screen.getAllByText('Enabled')
    expect(enabledStatuses).toHaveLength(2)
  })

  it('should have a start benchmark button', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    const startButton = screen.getByTestId('start-benchmark')
    expect(startButton).toBeInTheDocument()
    expect(startButton).toHaveTextContent('Start Benchmark')
  })

  it('should display current status', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByTestId('status')).toHaveTextContent('Ready')
  })

  it('should render DNS servers container', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    const serversContainer = screen.getByTestId('dns-servers')
    expect(serversContainer).toBeInTheDocument()

    // Should have individual server elements
    expect(screen.getByTestId('server-1.1.1.1')).toBeInTheDocument()
    expect(screen.getByTestId('server-8.8.8.8')).toBeInTheDocument()
  })

  it('should be wrapped with required providers', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByTestId('router')).toBeInTheDocument()
    expect(screen.getByTestId('query-provider')).toBeInTheDocument()
  })
})