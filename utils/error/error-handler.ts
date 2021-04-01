type AvailableErrors = 'AUTH_FAILED';

interface ErrorTypes {
  [index: string]: {
    message: string;
    statusCode: number;
  };
}

export const errName = {
  AUTH_FAILED: 'AUTH_FAILED',
  DEFAULT: 'DEFAULT',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ALREADY_LOGGED_IN: 'ALREADY_LOGGED_IN',
  USER_OR_EMAIL_EXISTS: 'USER_OR_EMAIL_EXISTS',
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  LOGOUT_ERROR: 'LOGOUT_ERROR',
};

const errorType: ErrorTypes = {
  AUTH_FAILED: {
    message: 'Authentication failed !',
    statusCode: 404,
  },
  DEFAULT: {
    message: 'An Error occurred !',
    statusCode: 500,
  },
  USER_NOT_FOUND: {
    message: 'User not found !',
    statusCode: 400,
  },
  ALREADY_LOGGED_IN: {
    message: 'Already logged in !',
    statusCode: 500,
  },
  USER_OR_EMAIL_EXISTS: {
    message: 'User or email already exists !',
    statusCode: 400,
  },
  PASSWORD_MISMATCH: {
    message: 'Please check your password and try again',
    statusCode: 404,
  },
  TOKEN_EXPIRED: {
    message: 'No valid token or token expired',
    statusCode: 404,
  },
  LOGOUT_ERROR: {
    message:
      'Only Chuck Norries is able to logout without beeing logged in before',
    statusCode: 404,
  },
};

export const getError = (errTitle: string) => {
  return errorType[errTitle];
};