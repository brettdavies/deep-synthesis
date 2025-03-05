export class DatabaseError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class RecordNotFoundError extends DatabaseError {
  constructor(table: string, id: string) {
    super(`Record not found in ${table} with id ${id}`);
    this.name = 'RecordNotFoundError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'TransactionError';
  }
} 