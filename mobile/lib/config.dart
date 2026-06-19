class Config {
  static const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3001/api');
  static const socketUrl = String.fromEnvironment('SOCKET_URL', defaultValue: 'http://10.0.2.2:3001');
}
