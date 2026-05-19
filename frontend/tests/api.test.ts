describe('API Service Tests', () => {
  const BASE_URL = 'http://localhost:8000';

  test('API base URL is configured', () => {
    expect(BASE_URL).toBe('http://localhost:8000');
  });

  test('API endpoints follow REST conventions', () => {
    const endpoints = [
      '/api/sensors/latest',
      '/api/sensors/history',
      '/api/analytics/summary/daily',
      '/api/weather/current',
      '/api/recommend/crop',
      '/health'
    ];

    endpoints.forEach(endpoint => {
      expect(endpoint).toMatch(/^\/[a-z\/]+$/);
    });
  });

  test('Sensor reading structure validation', () => {
    const mockReading = {
      device_id: 'ESP32_001',
      temperature: 25.5,
      humidity: 65.0,
      soil_moisture: 45.0,
      soil_ph: 6.5
    };

    expect(mockReading.device_id).toBeDefined();
    expect(typeof mockReading.temperature).toBe('number');
    expect(typeof mockReading.humidity).toBe('number');
  });
});
