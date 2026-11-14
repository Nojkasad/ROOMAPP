// An error that carries an HTTP status code.
// Routes and services throw it (e.g. throw new HttpError(409, 'Username is taken'));
// the error handler in app.js turns it into a JSON response.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true; // safe to show this message to the client
  }
}
