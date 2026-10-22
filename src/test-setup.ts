import { db } from './app/db';

// Each test starts with an empty database.
afterEach(() => db.delete({ disableAutoOpen: false }));
