import { Module, Global } from '@nestjs/common';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => {
        console.log('Connexion PostgreSQL...');

        const dbConfig = {
          user: process.env.DB_USER || 'postgres',
          host: process.env.DB_HOST || 'localhost',
          database: process.env.DB_NAME || 'tester',
          password: process.env.DB_PASSWORD || '1234',
          port: parseInt(process.env.DB_PORT || '55433', 10),
          connectionTimeoutMillis: 10000,
        };

        console.log(
          `PostgreSQL config: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
        );

        const pool = new Pool(dbConfig);

        // Test immediat au demarrage pour rendre les problemes DB visibles.
        pool.query<{ current_time: Date }>(
          'SELECT NOW() as current_time',
          (err, result) => {
            if (err) {
              console.error('ECHEC connexion PostgreSQL:');
              console.error('   Message:', err.message);
            } else {
              console.log(
                'SUCCES connexion PostgreSQL - heure:',
                result?.rows[0]?.current_time,
              );
            }
          },
        );

        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
