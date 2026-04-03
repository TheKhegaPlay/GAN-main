/**
 * Test Data Management
 * Centralized test data for all automation tests
 * Enables easy test variation and parameterization
 */

export const validUser = {
  email: 'demo@forensics.gov',
  password: 'demo123',
  name: 'Demo User',
  id: 'user_12345'
};

export const newUser = {
  email: `testuser_${Date.now()}@test.com`,
  password: 'NewPass123!',
  name: 'Test User'
};

export const invalidCredentials = [
  {
    email: 'admin@forensics.gov',
    password: 'WrongPassword123',
    reason: 'Invalid password'
  },
  {
    email: 'nonexistent@test.com',
    password: 'SecPass123!',
    reason: 'User does not exist'
  },
  {
    email: 'admin@forensics.gov',
    password: 'Pass123',
    reason: 'Password too short'
  }
];

export const invalidEmails = [
  'notanemail',
  'missing@domain',
  '@nodomain.com',
  'spaces in@email.com',
  ''
];

export const testUrls = {
  baseUrl: process.env.UI_BASE_URL || 'http://localhost:4200',
  loginUrl: process.env.UI_BASE_URL ? `${process.env.UI_BASE_URL}/login` : 'http://localhost:4200/login',
  dashboardUrl: process.env.UI_BASE_URL ? `${process.env.UI_BASE_URL}/gan-models` : 'http://localhost:4200/gan-models',
  registrationUrl: process.env.UI_BASE_URL ? `${process.env.UI_BASE_URL}/register` : 'http://localhost:4200/register',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4200/api'
};

export const apiEndpoints = {
  login: '/auth/login',
  logout: '/auth/logout',
  register: '/auth/register',
  refreshToken: '/auth/refresh',
  userProfile: '/users/me',
  updateProfile: '/users/me'
};

export const expectedMessages = {
  loginSuccess: 'Dashboard',
  invalidCredentials: 'Invalid email or password',
  emailRequired: 'Email is required',
  passwordRequired: 'Password is required',
  invalidEmail: 'Please enter a valid email',
  passwordTooShort: 'Password must be at least 8 characters',
  duplicateEmail: 'Email already registered',
  passwordMismatch: 'Passwords do not match',
  formValidationError: 'Please fill in all required fields'
};

export const performanceThresholds = {
  loginPageLoad: 3000,      // 3 seconds
  apiResponseTime: 2000,    // 2 seconds
  dashboardRender: 1500,    // 1.5 seconds
  formSubmissionTime: 1000  // 1 second
};

export const formTestData = {
  validForm: {
    name: 'Test Case Name',
    description: 'Test Description',
    category: 'Evidence',
    priority: 'High',
    status: 'Active'
  },
  emptyFields: {
    name: '',
    description: '',
    category: '',
    priority: '',
    status: ''
  },
  specialCharacters: {
    name: 'Test <script>alert("XSS")</script>',
    description: 'Test & special chars @#$%',
    category: 'Test',
    priority: 'High'
  }
};

export const timeouts = {
  defaultTimeout: 30000,
  navigationTimeout: 10000,
  waitForElementTimeout: 5000,
  apiCallTimeout: 5000,
  slowNetworkTimeout: 15000
};

export const browserOptions = {
  headless: true,
  slowMo: 0,
  timeout: 30000
};
