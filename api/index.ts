import { httpServer } from '../server/src/app.js';

export default (req: any, res: any) => {
  httpServer.emit('request', req, res);
};
