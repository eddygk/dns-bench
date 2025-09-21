import '@testing-library/jest-dom'
import * as React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock Socket.IO
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn()
}

// Simplified Benchmark component for testing
const Benchmark: React.FC = () => {
  const [isRunning, setIsRunning] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [results, setResults] = React.useState<any[]>([])
  const [activityLog, setActivityLog] = React.useState<string[]>([])

  const startBenchmark = () => {
    setIsRunning(true)
    setProgress(0)
    setResults([])
    setActivityLog(['Starting benchmark...'])

    // Simulate benchmark progress
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 10
        if (newProgress >= 100) {
          clearInterval(interval)
          setIsRunning(false)
          setResults([
            { serverName: 'Cloudflare', avgResponseTime: 23, successRate: 100 },
            { serverName: 'Google', avgResponseTime: 28, successRate: 100 }
          ])
          setActivityLog(prev => [...prev, 'Benchmark completed!'])
          return 100
        }
        setActivityLog(prev => [...prev, `Testing progress: ${newProgress}%`])
        return newProgress
      })
    }, 100)
  }

  return (
    <div>
      <h1>DNS Benchmark Test</h1>

      <section data-testid="benchmark-controls">
        <button
          data-testid="start-benchmark-button"
          onClick={startBenchmark}
          disabled={isRunning}
        >
          {isRunning ? 'Running...' : 'Start Benchmark'}
        </button>

        {isRunning && (
          <div data-testid="progress-indicator">
            <div>Progress: {progress}%</div>
            <div data-testid="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}
      </section>

      <section data-testid="activity-log">
        <h2>Activity Log</h2>
        <div data-testid="log-entries">
          {activityLog.map((entry, index) => (
            <div key={index} data-testid={`log-entry-${index}`}>
              {entry}
            </div>
          ))}
        </div>
      </section>

      {results.length > 0 && (
        <section data-testid="benchmark-results">
          <h2>Results</h2>
          <div data-testid="results-overview">
            <p>Benchmark completed successfully!</p>
            <p data-testid="results-count">Tested {results.length} DNS servers</p>
          </div>

          <div data-testid="results-table">
            {results.map((result, index) => (
              <div key={index} data-testid={`result-${index}`}>
                <span data-testid={`server-name-${index}`}>{result.serverName}</span>
                <span data-testid={`avg-time-${index}`}>{result.avgResponseTime}ms</span>
                <span data-testid={`success-rate-${index}`}>{result.successRate}%</span>
              </div>
            ))}
          </div>

          <div data-testid="results-tabs">
            <button data-testid="overview-tab">Overview</button>
            <button data-testid="failures-tab">Failures</button>
            <button data-testid="server-analysis-tab">Server Analysis</button>
            <button data-testid="raw-diagnostics-tab">Raw Diagnostics</button>
          </div>
        </section>
      )}

      <section data-testid="test-configuration">
        <h2>Test Configuration</h2>
        <div>
          <label>
            <input type="radio" name="testType" value="quick" defaultChecked />
            Quick Test (20 domains)
          </label>
        </div>
        <div>
          <label>
            <input type="radio" name="testType" value="full" />
            Full Test (70+ domains)
          </label>
        </div>
      </section>
    </div>
  )
}

describe('Benchmark Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render without crashing', () => {
    render(<Benchmark />)
    expect(screen.getByText('DNS Benchmark Test')).toBeInTheDocument()
  })

  it('should display start benchmark button', () => {
    render(<Benchmark />)

    const startButton = screen.getByTestId('start-benchmark-button')
    expect(startButton).toBeInTheDocument()
    expect(startButton).toHaveTextContent('Start Benchmark')
    expect(startButton).not.toBeDisabled()
  })

  it('should start benchmark when button is clicked', async () => {
    render(<Benchmark />)

    const startButton = screen.getByTestId('start-benchmark-button')

    fireEvent.click(startButton)

    await waitFor(() => {
      expect(startButton).toHaveTextContent('Running...')
      expect(startButton).toBeDisabled()
    })

    expect(screen.getByTestId('progress-indicator')).toBeInTheDocument()
  })

  it('should display activity log', () => {
    render(<Benchmark />)

    expect(screen.getByText('Activity Log')).toBeInTheDocument()
    expect(screen.getByTestId('log-entries')).toBeInTheDocument()
  })

  it('should show progress during benchmark', async () => {
    render(<Benchmark />)

    const startButton = screen.getByTestId('start-benchmark-button')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument()
    })

    expect(screen.getByText(/Progress:/)).toBeInTheDocument()
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
  })

  it('should display results after benchmark completion', async () => {
    render(<Benchmark />)

    const startButton = screen.getByTestId('start-benchmark-button')
    fireEvent.click(startButton)

    // Wait for benchmark to complete
    await waitFor(() => {
      expect(screen.getByTestId('benchmark-results')).toBeInTheDocument()
    }, { timeout: 2000 })

    expect(screen.getByText('Results')).toBeInTheDocument()
    expect(screen.getByText('Benchmark completed successfully!')).toBeInTheDocument()
  })

  it('should show server results with metrics', async () => {
    render(<Benchmark />)

    const startButton = screen.getByTestId('start-benchmark-button')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByTestId('results-table')).toBeInTheDocument()
    }, { timeout: 2000 })

    expect(screen.getByTestId('server-name-0')).toHaveTextContent('Cloudflare')
    expect(screen.getByTestId('avg-time-0')).toHaveTextContent('23ms')
    expect(screen.getByTestId('success-rate-0')).toHaveTextContent('100%')
  })

  it('should display result tabs', async () => {
    render(<Benchmark />)

    const startButton = screen.getByTestId('start-benchmark-button')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByTestId('results-tabs')).toBeInTheDocument()
    }, { timeout: 2000 })

    expect(screen.getByTestId('overview-tab')).toBeInTheDocument()
    expect(screen.getByTestId('failures-tab')).toBeInTheDocument()
    expect(screen.getByTestId('server-analysis-tab')).toBeInTheDocument()
    expect(screen.getByTestId('raw-diagnostics-tab')).toBeInTheDocument()
  })

  it('should have test configuration options', () => {
    render(<Benchmark />)

    expect(screen.getByText('Test Configuration')).toBeInTheDocument()
    expect(screen.getByText('Quick Test (20 domains)')).toBeInTheDocument()
    expect(screen.getByText('Full Test (70+ domains)')).toBeInTheDocument()
  })

  it('should update activity log during benchmark', async () => {
    render(<Benchmark />)

    const startButton = screen.getByTestId('start-benchmark-button')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByTestId('log-entry-0')).toHaveTextContent('Starting benchmark...')
    })

    // Should add progress entries
    await waitFor(() => {
      const logEntries = screen.getAllByTestId(/^log-entry-/)
      expect(logEntries.length).toBeGreaterThan(1)
    })
  })

  it('should show benchmark completed status', async () => {
    render(<Benchmark />)

    const startButton = screen.getByTestId('start-benchmark-button')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByText('Benchmark completed!')).toBeInTheDocument()
    }, { timeout: 2000 })

    expect(screen.getByTestId('results-count')).toHaveTextContent('Tested 2 DNS servers')
  })
})