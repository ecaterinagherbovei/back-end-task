import express from 'express';
import * as dotenv from 'dotenv';
import { initSequelizeClient } from './sequelize';
import { initUsersRouter } from './routers';
import { initErrorRequestHandler, initNotFoundRequestHandler } from './middleware';

const PORT = 8080;

async function main(): Promise<void> {
  const app = express();
  dotenv.config();
  // TODO(roman): store these credentials in some external configs
  // so that they don't end up in the git repo
  const sequelizeClient = await initSequelizeClient({
    dialect: 'postgres',
    host: 'localhost',
    port: 5432,
    username: process.env.USER!,
    password: process.env.PASS!,
    database: process.env.DB!,
  });

  app.use(express.json());

  app.use('/api/v1/users', initUsersRouter(sequelizeClient));

  app.use('/', initNotFoundRequestHandler());

  app.use(initErrorRequestHandler());

  return new Promise((resolve) => {
    app.listen(PORT, () => {
      console.info(`app listening on port: '${PORT}'`);

      resolve();
    });
  });
}

main().then(() => console.info('app started')).catch(console.error);