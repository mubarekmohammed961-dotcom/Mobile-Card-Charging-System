/**
 * SRS Section 16: Validation Rules
 * Comprehensive validation utilities for MCCS
 */

// ============================================================
// Email Validation (SRS Section 16)
// "Staff Email: Valid email format; unique across system"
// Enhanced: Check for real email domains
// ============================================================
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();

  // Check length
  if (trimmed.length > 255) {
    return { valid: false, error: 'Email must not exceed 255 characters' };
  }

  // Enhanced email regex (RFC 5322 simplified)
  // - Local part: alphanumeric, dots, underscores, hyphens, plus signs
  // - Domain: alphanumeric, dots, hyphens
  // - TLD: 2-63 characters (supports .com, .co.uk, .museum, etc.)
  const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,63}$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format (must be user@domain.com)' };
  }

  // Extract domain
  const [localPart, domain] = trimmed.split('@');

  // Validate local part (before @)
  if (localPart.length < 1 || localPart.length > 64) {
    return { valid: false, error: 'Email username must be 1-64 characters' };
  }

  // Check for consecutive dots
  if (localPart.includes('..') || domain.includes('..')) {
    return { valid: false, error: 'Email cannot contain consecutive dots' };
  }

  // Check for valid domain format
  if (domain.length < 3 || domain.length > 253) {
    return { valid: false, error: 'Email domain must be 3-253 characters' };
  }

  // Ensure domain has at least one dot
  if (!domain.includes('.')) {
    return { valid: false, error: 'Email must have a valid domain (e.g., example.com)' };
  }

  // Extract TLD (Top Level Domain)
  const parts = domain.split('.');
  const tld = parts[parts.length - 1].toLowerCase();

  // List of common/valid TLDs (can be expanded)
  const validTLDs = [
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
    'co', 'io', 'ai', 'app', 'dev', 'tech', 'online',
    'et', 'us', 'uk', 'ca', 'au', 'de', 'fr', 'jp', 'cn', 'in',
    'info', 'biz', 'name', 'pro', 'aero', 'museum',
    'ac', 'ad', 'ae', 'af', 'ag', 'am', 'ar', 'at', 'az',
    'ba', 'bd', 'be', 'bg', 'bh', 'br', 'by', 'bz',
    'ch', 'cl', 'cm', 'co', 'cr', 'cz',
    'dk', 'dz', 'ec', 'ee', 'eg', 'es',
    'fi', 'ge', 'gh', 'gr', 'gt',
    'hk', 'hr', 'hu', 'id', 'ie', 'il', 'iq', 'ir', 'is', 'it',
    'ke', 'kg', 'kr', 'kw', 'kz',
    'lb', 'lk', 'lt', 'lu', 'lv', 'ly',
    'ma', 'md', 'me', 'mk', 'mn', 'mo', 'mx', 'my', 'mz',
    'ng', 'nl', 'no', 'np', 'nz',
    'om', 'pa', 'pe', 'ph', 'pk', 'pl', 'pt', 'py',
    'qa', 'ro', 'rs', 'ru', 'rw',
    'sa', 'sd', 'se', 'sg', 'si', 'sk', 'sn', 'so', 'sy',
    'th', 'tj', 'tm', 'tn', 'tr', 'tw', 'tz',
    'ua', 'ug', 'uy', 'uz', 've', 'vn',
    'ye', 'za', 'zm', 'zw'
  ];

  if (!validTLDs.includes(tld)) {
    return { 
      valid: false, 
      error: `Invalid email domain extension '.${tld}' (must be a recognized domain like .com, .org, .et, etc.)` 
    };
  }

  // Check for common typos in popular domains
  const commonDomains = {
    'gmail': ['gmai', 'gmial', 'gmaill', 'gamil'],
    'yahoo': ['yaho', 'yahooo', 'yhoo'],
    'outlook': ['outlok', 'outloook'],
    'hotmail': ['hotmial', 'hotmailll']
  };

  const domainName = parts[0].toLowerCase();
  for (const [correct, typos] of Object.entries(commonDomains)) {
    if (typos.includes(domainName)) {
      return { 
        valid: false, 
        error: `Did you mean ${correct}.${parts.slice(1).join('.')}? (Possible typo detected)` 
      };
    }
  }

  return { valid: true, sanitized: trimmed.toLowerCase() };
};

// ============================================================
// Phone Number Validation (Ethiopian format)
// Enhanced: Support all Ethiopian mobile operators + landlines
// ============================================================
const validatePhone = (phone, required = false) => {
  if (!phone || phone.trim() === '') {
    if (required) {
      return { valid: false, error: 'Phone number is required' };
    }
    return { valid: true, sanitized: null };
  }

  // Remove spaces, dashes, parentheses, dots
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Ethiopian phone formats:
  // Mobile operators:
  // - Ethio Telecom: 091, 092, 093, 094, 095, 096, 097, 098, 099
  // - Safaricom: 070, 071, 072, 073, 074, 075, 076, 077, 078, 079
  // 
  // Format variations:
  // - +251XXXXXXXXX (international)
  // - 251XXXXXXXXX (without +)
  // - 0XXXXXXXXX (local)
  
  // Check for valid Ethiopian mobile format
  const patterns = [
    // International format with +
    /^\+251(9[0-9]|7[0-9])\d{7}$/,
    
    // International format without +
    /^251(9[0-9]|7[0-9])\d{7}$/,
    
    // Local format
    /^0(9[0-9]|7[0-9])\d{7}$/,
  ];

  const isValid = patterns.some(pattern => pattern.test(cleaned));

  if (!isValid) {
    return { 
      valid: false, 
      error: 'Invalid Ethiopian phone number. Valid formats: +251912345678, 0912345678, 0712345678' 
    };
  }

  // Normalize to +251 format
  let normalized = cleaned;
  
  if (normalized.startsWith('0')) {
    // 0XXXXXXXXX → +251XXXXXXXXX
    normalized = '+251' + normalized.substring(1);
  } else if (normalized.startsWith('251') && !normalized.startsWith('+251')) {
    // 251XXXXXXXXX → +251XXXXXXXXX
    normalized = '+' + normalized;
  }
  // Already +251 format, keep as is

  // Validate length after normalization
  if (normalized.length !== 13) {
    return {
      valid: false,
      error: 'Invalid phone number length. Expected 10 digits (e.g., 0912345678)'
    };
  }

  return { valid: true, sanitized: normalized };
};

// ============================================================
// Password Validation
// SRS implies strong passwords for security (NFR-002)
// Enhanced: Require letters, numbers, and special characters
// ============================================================
const validatePassword = (password, fieldName = 'Password') => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (password.length < 8) {
    return { valid: false, error: `${fieldName} must be at least 8 characters` };
  }

  if (password.length > 128) {
    return { valid: false, error: `${fieldName} must not exceed 128 characters` };
  }

  // Check complexity requirements
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  // Build detailed error messages
  const missing = [];
  if (!hasUpperCase) missing.push('uppercase letter');
  if (!hasLowerCase) missing.push('lowercase letter');
  if (!hasDigit) missing.push('number');
  if (!hasSpecialChar) missing.push('special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)');

  if (missing.length > 0) {
    return { 
      valid: false, 
      error: `${fieldName} must contain at least one ${missing.join(', one ')}` 
    };
  }

  // Check for common weak passwords
  const weakPasswords = [
    'password', 'password1', 'password123', '12345678', '123456789',
    'qwerty123', 'abc123456', 'letmein123', 'welcome123', 'admin123',
    'password!', 'password@123', 'pass1234', 'test1234'
  ];

  if (weakPasswords.includes(password.toLowerCase())) {
    return { 
      valid: false, 
      error: `${fieldName} is too common. Please choose a stronger password` 
    };
  }

  // Check for sequential characters
  const hasSequence = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password);
  if (hasSequence) {
    return { 
      valid: false, 
      error: `${fieldName} should not contain sequential characters (abc, 123, etc.)` 
    };
  }

  // Check for repeated characters (3+ times)
  const hasRepeated = /(.)\1{2,}/.test(password);
  if (hasRepeated) {
    return { 
      valid: false, 
      error: `${fieldName} should not contain repeated characters (aaa, 111, etc.)` 
    };
  }

  return { valid: true };
};

// ============================================================
// Card PIN Validation (SRS Section 16)
// "Card PIN: Must be unique; alphanumeric; length 10-20 characters"
// ============================================================
const validateCardPIN = (pin) => {
  if (!pin || typeof pin !== 'string') {
    return { valid: false, error: 'PIN is required' };
  }

  const cleaned = pin.trim();

  if (cleaned.length < 10 || cleaned.length > 20) {
    return { valid: false, error: 'PIN must be 10-20 characters (SRS Section 16)' };
  }

  // Alphanumeric only
  if (!/^[A-Za-z0-9]+$/.test(cleaned)) {
    return { valid: false, error: 'PIN must be alphanumeric (letters and numbers only)' };
  }

  return { valid: true, sanitized: cleaned.toUpperCase() };
};

// ============================================================
// Monthly Quota Validation (SRS Section 16)
// "Monthly Quota: Must be integer ≥ 0"
// ============================================================
const validateMonthlyQuota = (quota) => {
  if (quota === null || quota === undefined || quota === '') {
    return { valid: false, error: 'Monthly quota is required' };
  }

  const num = Number(quota);

  if (isNaN(num)) {
    return { valid: false, error: 'Monthly quota must be a number' };
  }

  if (!Number.isInteger(num)) {
    return { valid: false, error: 'Monthly quota must be an integer (SRS Section 16)' };
  }

  if (num < 0) {
    return { valid: false, error: 'Monthly quota must be ≥ 0 (SRS Section 16)' };
  }

  if (num > 100) {
    return { valid: false, error: 'Monthly quota cannot exceed 100 cards per staff' };
  }

  return { valid: true, sanitized: num };
};

// ============================================================
// Employee ID Validation
// ============================================================
const validateEmployeeID = (employeeId, required = true) => {
  if (!employeeId || employeeId.trim() === '') {
    if (required) {
      return { valid: false, error: 'Employee ID is required' };
    }
    return { valid: true, sanitized: null };
  }

  const cleaned = employeeId.trim();

  if (cleaned.length < 3 || cleaned.length > 50) {
    return { valid: false, error: 'Employee ID must be 3-50 characters' };
  }

  // Allow alphanumeric and hyphens only
  if (!/^[A-Za-z0-9\-]+$/.test(cleaned)) {
    return { valid: false, error: 'Employee ID must be alphanumeric (letters, numbers, hyphens only)' };
  }

  return { valid: true, sanitized: cleaned.toUpperCase() };
};

// ============================================================
// Full Name Validation
// ============================================================
const validateFullName = (name) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Full name is required' };
  }

  const cleaned = name.trim();

  if (cleaned.length < 2) {
    return { valid: false, error: 'Full name must be at least 2 characters' };
  }

  if (cleaned.length > 100) {
    return { valid: false, error: 'Full name must not exceed 100 characters' };
  }

  // Allow letters, spaces, hyphens, apostrophes
  if (!/^[a-zA-Z\s\-']+$/.test(cleaned)) {
    return { valid: false, error: 'Full name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  return { valid: true, sanitized: cleaned };
};

// ============================================================
// Budget Validation (for BR-004)
// ============================================================
const validateBudget = (budget) => {
  if (budget === null || budget === undefined || budget === '') {
    return { valid: false, error: 'Budget is required' };
  }

  const num = Number(budget);

  if (isNaN(num)) {
    return { valid: false, error: 'Budget must be a number' };
  }

  if (num < 0) {
    return { valid: false, error: 'Budget cannot be negative' };
  }

  if (num > 1000000) {
    return { valid: false, error: 'Budget cannot exceed 1,000,000 ETB' };
  }

  // Round to 2 decimal places
  const rounded = Math.round(num * 100) / 100;

  return { valid: true, sanitized: rounded };
};

// ============================================================
// Date Validation (Expiry Date format YYYY-MM-DD)
// SRS Section 16: "ExpiryDate (YYYY-MM-DD)"
// ============================================================
const validateExpiryDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') {
    return { valid: false, error: 'Expiry date is required' };
  }

  // Check format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { valid: false, error: 'Expiry date must be in YYYY-MM-DD format (SRS Section 16)' };
  }

  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid expiry date' };
  }

  // Check if date is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date < today) {
    return { valid: false, error: 'Expiry date cannot be in the past' };
  }

  // Check if date is more than 10 years in the future
  const tenYearsFromNow = new Date();
  tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);

  if (date > tenYearsFromNow) {
    return { valid: false, error: 'Expiry date cannot be more than 10 years in the future' };
  }

  return { valid: true, sanitized: dateStr };
};

// ============================================================
// Role Validation
// ============================================================
const VALID_ROLES = [
  'SUPER_ADMIN',
  'SYSTEM_ADMIN',
  'STORE_OFFICER',
  'DEPARTMENT_HEAD',
  'STAFF',
  'AUDITOR'
];

const validateRole = (role, required = true) => {
  if (!role || role.trim() === '') {
    if (required) {
      return { valid: false, error: 'Role is required' };
    }
    return { valid: true, sanitized: 'STAFF' }; // Default role
  }

  const upperRole = role.trim().toUpperCase();

  if (!VALID_ROLES.includes(upperRole)) {
    return { 
      valid: false, 
      error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` 
    };
  }

  return { valid: true, sanitized: upperRole };
};

// ============================================================
// Designation Validation
// ============================================================
const validateDesignation = (designation, required = false) => {
  if (!designation || designation.trim() === '') {
    if (required) {
      return { valid: false, error: 'Designation is required' };
    }
    return { valid: true, sanitized: null };
  }

  const cleaned = designation.trim();

  if (cleaned.length < 2 || cleaned.length > 100) {
    return { valid: false, error: 'Designation must be 2-100 characters' };
  }

  return { valid: true, sanitized: cleaned };
};

// ============================================================
// Package Value Validation (for ETB/MB/GB/SMS)
// ============================================================
const validatePackageValue = (value) => {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Package value is required' };
  }

  const cleaned = value.trim();

  if (cleaned.length < 2 || cleaned.length > 50) {
    return { valid: false, error: 'Package value must be 2-50 characters' };
  }

  // Allow alphanumeric, spaces, and common units (ETB, MB, GB, SMS, Unlimited)
  if (!/^[A-Za-z0-9\s\.]+$/.test(cleaned)) {
    return { valid: false, error: 'Package value contains invalid characters' };
  }

  return { valid: true, sanitized: cleaned };
};

// ============================================================
// Provider Validation
// ============================================================
const validateProvider = (provider) => {
  if (!provider || typeof provider !== 'string') {
    return { valid: false, error: 'Provider is required' };
  }

  const cleaned = provider.trim();

  if (cleaned.length < 2 || cleaned.length > 50) {
    return { valid: false, error: 'Provider name must be 2-50 characters' };
  }

  // Allow letters, spaces, hyphens
  if (!/^[A-Za-z\s\-]+$/.test(cleaned)) {
    return { valid: false, error: 'Provider name can only contain letters, spaces, and hyphens' };
  }

  return { valid: true, sanitized: cleaned.toUpperCase() };
};

// ============================================================
// Export all validators
// ============================================================
module.exports = {
  validateEmail,
  validatePhone,
  validatePassword,
  validateCardPIN,
  validateMonthlyQuota,
  validateEmployeeID,
  validateFullName,
  validateBudget,
  validateExpiryDate,
  validateRole,
  validateDesignation,
  validatePackageValue,
  validateProvider,
  VALID_ROLES
};
