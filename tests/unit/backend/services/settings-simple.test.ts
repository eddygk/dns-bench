import fs from 'fs/promises';
import path from 'path';

jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Settings Management Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Local DNS Configuration', () => {
    it('should load local DNS servers from JSON file', async () => {
      const mockServers = [
        { ip: '10.10.20.30', enabled: true },
        { ip: '10.10.20.31', enabled: false }
      ];

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockServers));

      const loadLocalDNSServers = async () => {
        try {
          const data = await fs.readFile('local-dns.json', 'utf-8');
          return JSON.parse(data);
        } catch (error) {
          return [];
        }
      };

      const result = await loadLocalDNSServers();

      expect(result).toEqual(mockServers);
      expect(mockFs.readFile).toHaveBeenCalledWith('local-dns.json', 'utf-8');
    });

    it('should handle missing local DNS configuration file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const loadLocalDNSServers = async () => {
        try {
          const data = await fs.readFile('local-dns.json', 'utf-8');
          return JSON.parse(data);
        } catch (error) {
          return [];
        }
      };

      const result = await loadLocalDNSServers();

      expect(result).toEqual([]);
    });

    it('should save local DNS servers to JSON file', async () => {
      const servers = [
        { ip: '192.168.1.1', enabled: true },
        { ip: '192.168.1.2', enabled: true }
      ];

      mockFs.writeFile.mockResolvedValue();

      const saveLocalDNSServers = async (serversToSave: any[]) => {
        const data = JSON.stringify(serversToSave, null, 2);
        await fs.writeFile('local-dns.json', data, 'utf-8');
        return true;
      };

      const result = await saveLocalDNSServers(servers);

      expect(result).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'local-dns.json',
        JSON.stringify(servers, null, 2),
        'utf-8'
      );
    });

    it('should validate IP address format', () => {
      const isValidIP = (ip: string): boolean => {
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(ip)) return false;

        const parts = ip.split('.');
        return parts.every(part => {
          const num = parseInt(part, 10);
          return num >= 0 && num <= 255;
        });
      };

      expect(isValidIP('192.168.1.1')).toBe(true);
      expect(isValidIP('10.10.20.30')).toBe(true);
      expect(isValidIP('8.8.8.8')).toBe(true);
      expect(isValidIP('256.1.1.1')).toBe(false);
      expect(isValidIP('not.an.ip')).toBe(false);
      expect(isValidIP('192.168.1')).toBe(false);
      expect(isValidIP('')).toBe(false);
    });
  });

  describe('Public DNS Configuration', () => {
    it('should load public DNS servers configuration', async () => {
      const mockConfig = {
        servers: [
          { id: '1', ip: '1.1.1.1', name: 'Cloudflare', provider: 'Cloudflare', enabled: true },
          { id: '2', ip: '8.8.8.8', name: 'Google Primary', provider: 'Google', enabled: true },
          { id: '3', ip: '9.9.9.9', name: 'Quad9', provider: 'Quad9', enabled: false }
        ]
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      const loadPublicDNSServers = async () => {
        try {
          const data = await fs.readFile('public-dns.json', 'utf-8');
          return JSON.parse(data);
        } catch (error) {
          // Return default configuration if file doesn't exist
          return {
            servers: [
              { id: '1', ip: '1.1.1.1', name: 'Cloudflare', provider: 'Cloudflare', enabled: true },
              { id: '2', ip: '8.8.8.8', name: 'Google Primary', provider: 'Google', enabled: true }
            ]
          };
        }
      };

      const result = await loadPublicDNSServers();

      expect(result.servers).toHaveLength(3);
      expect(result.servers[0]).toMatchObject({
        ip: '1.1.1.1',
        name: 'Cloudflare',
        enabled: true
      });
    });

    it('should filter enabled public DNS servers', () => {
      const servers = [
        { id: '1', ip: '1.1.1.1', name: 'Cloudflare', enabled: true },
        { id: '2', ip: '8.8.8.8', name: 'Google', enabled: false },
        { id: '3', ip: '9.9.9.9', name: 'Quad9', enabled: true }
      ];

      const getEnabledServers = (serverList: any[]) => {
        return serverList.filter(server => server.enabled);
      };

      const enabledServers = getEnabledServers(servers);

      expect(enabledServers).toHaveLength(2);
      expect(enabledServers.map(s => s.ip)).toEqual(['1.1.1.1', '9.9.9.9']);
    });

    it('should add custom DNS server', () => {
      const existingServers = [
        { id: '1', ip: '1.1.1.1', name: 'Cloudflare', enabled: true }
      ];

      const addCustomServer = (servers: any[], newServer: any) => {
        const maxId = Math.max(...servers.map(s => parseInt(s.id)), 0);
        const serverWithId = {
          ...newServer,
          id: (maxId + 1).toString()
        };
        return [...servers, serverWithId];
      };

      const result = addCustomServer(existingServers, {
        ip: '208.67.222.222',
        name: 'OpenDNS',
        provider: 'OpenDNS',
        enabled: true
      });

      expect(result).toHaveLength(2);
      expect(result[1]).toMatchObject({
        id: '2',
        ip: '208.67.222.222',
        name: 'OpenDNS'
      });
    });

    it('should validate DNS server configuration', () => {
      const validateDNSServer = (server: any) => {
        const errors = [];

        if (!server.ip || typeof server.ip !== 'string') {
          errors.push('IP address is required');
        } else {
          const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
          if (!ipRegex.test(server.ip)) {
            errors.push('Invalid IP address format');
          } else {
            const parts = server.ip.split('.');
            const invalidPart = parts.find(part => {
              const num = parseInt(part, 10);
              return num < 0 || num > 255;
            });
            if (invalidPart) {
              errors.push('IP address octets must be between 0-255');
            }
          }
        }

        if (!server.name || typeof server.name !== 'string' || server.name.trim().length === 0) {
          errors.push('Server name is required');
        }

        if (typeof server.enabled !== 'boolean') {
          errors.push('Enabled status must be boolean');
        }

        return { valid: errors.length === 0, errors };
      };

      const validServer = {
        ip: '8.8.4.4',
        name: 'Google Secondary',
        enabled: true
      };

      const invalidServer = {
        ip: '256.1.1.1',
        name: '',
        enabled: 'yes'
      };

      expect(validateDNSServer(validServer).valid).toBe(true);
      expect(validateDNSServer(invalidServer).valid).toBe(false);
      expect(validateDNSServer(invalidServer).errors).toContain('IP address octets must be between 0-255');
      expect(validateDNSServer(invalidServer).errors).toContain('Server name is required');
    });
  });

  describe('CORS Configuration', () => {
    it('should generate CORS origins list', () => {
      const settings = {
        cors: {
          allowedOrigins: ['http://localhost:3000'],
          customOrigins: ['http://10.10.20.2:3000', 'http://192.168.1.100:3000']
        }
      };

      const getCORSOrigins = (corsSettings: any) => {
        const origins = [...corsSettings.allowedOrigins];
        if (corsSettings.customOrigins) {
          origins.push(...corsSettings.customOrigins);
        }
        return [...new Set(origins)]; // Remove duplicates
      };

      const origins = getCORSOrigins(settings.cors);

      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('http://10.10.20.2:3000');
      expect(origins).toContain('http://192.168.1.100:3000');
      expect(origins).toHaveLength(3);
    });

    it('should validate CORS origin URLs', () => {
      const isValidOrigin = (origin: string) => {
        try {
          const url = new URL(origin);
          return ['http:', 'https:'].includes(url.protocol);
        } catch {
          return false;
        }
      };

      expect(isValidOrigin('http://localhost:3000')).toBe(true);
      expect(isValidOrigin('https://example.com')).toBe(true);
      expect(isValidOrigin('http://192.168.1.1:8080')).toBe(true);
      expect(isValidOrigin('ftp://example.com')).toBe(false);
      expect(isValidOrigin('not-a-url')).toBe(false);
      expect(isValidOrigin('')).toBe(false);
    });
  });

  describe('Configuration File Management', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      mockFs.readFile.mockResolvedValue('invalid json {');

      const loadConfig = async (filename: string) => {
        try {
          const data = await fs.readFile(filename, 'utf-8');
          return JSON.parse(data);
        } catch (error) {
          console.warn(`Failed to parse ${filename}:`, error.message);
          return null;
        }
      };

      const result = await loadConfig('invalid.json');

      expect(result).toBeNull();
    });

    it('should create configuration directories if they do not exist', async () => {
      const configDir = '/app/config';
      const configFile = path.join(configDir, 'settings.json');

      mockFs.mkdir.mockResolvedValue();
      mockFs.writeFile.mockResolvedValue();

      const ensureConfigDir = async (filePath: string) => {
        const dir = path.dirname(filePath);
        try {
          await fs.mkdir(dir, { recursive: true });
        } catch (error) {
          // Directory might already exist
        }
      };

      const saveConfig = async (filePath: string, data: any) => {
        await ensureConfigDir(filePath);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      };

      await saveConfig(configFile, { test: 'data' });

      expect(mockFs.mkdir).toHaveBeenCalledWith(configDir, { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        configFile,
        JSON.stringify({ test: 'data' }, null, 2),
        'utf-8'
      );
    });

    it('should backup configuration before saving', async () => {
      const configFile = 'important-config.json';
      const backupFile = 'important-config.json.backup';

      mockFs.readFile.mockResolvedValue('{"existing": "data"}');
      mockFs.writeFile.mockResolvedValue();
      mockFs.copyFile.mockResolvedValue();

      const saveConfigWithBackup = async (filename: string, newData: any) => {
        try {
          // Create backup of existing config
          await fs.copyFile(filename, `${filename}.backup`);
        } catch (error) {
          // File might not exist yet
        }

        // Save new configuration
        await fs.writeFile(filename, JSON.stringify(newData, null, 2), 'utf-8');
      };

      await saveConfigWithBackup(configFile, { new: 'configuration' });

      expect(mockFs.copyFile).toHaveBeenCalledWith(configFile, backupFile);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        configFile,
        JSON.stringify({ new: 'configuration' }, null, 2),
        'utf-8'
      );
    });
  });
});